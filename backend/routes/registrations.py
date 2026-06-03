from flask import Blueprint, request, jsonify
import secrets
import os
import stripe

from extensions import db
from models.models import Event, event_registrations
from auth import token_required
from tasks import send_email_notification

registrations_bp = Blueprint('registrations', __name__)

# 1. CREA SESSIONE DI CHECKOUT STRIPE O REGISTRA SE GRATUITO
@registrations_bp.route('/api/events/<int:event_id>/checkout', methods=['POST'])
@token_required
def create_checkout_session(event_id):
    event = Event.query.get_or_404(event_id)
    
    raw_user_id = request.user.get('sub') or request.user.get('id') or request.user.get('preferred_username')
    if not raw_user_id:
        return jsonify({'message': 'Impossibile identificare l\'utente dal token.'}), 400
    
    user_id = str(raw_user_id).strip()
    
    # Controllo disponibilità biglietti
    if (event.max_tickets - event.tickets_sold) <= 0:
        return jsonify({'message': 'Spiacenti, i biglietti per questo evento sono esauriti!'}), 400

    # Controllo se già iscritto
    is_already_registered = db.session.query(event_registrations).filter_by(
        user_id=user_id, 
        event_id=event_id
    ).first() is not None

    if is_already_registered:
        return jsonify({'message': 'Sei già iscritto a questo evento!'}), 400

    # SE L'EVENTO È GRATUITO: Registrazione diretta senza passare da Stripe
    if float(event.price) <= 0:
        return register_user_logic(user_id, event, request.user.get('email', 'utente@eventhub.local'))

    # SE L'EVENTO È A PAGAMENTO: Crea la sessione di Stripe Checkout
    try:
        # Recupera l'origin del frontend per i reindirizzamenti (successo/annullamento)
        frontend_url = request.headers.get('Origin', 'https://localhost:3000')
        
        # Stripe vuole il prezzo espresso in centesimi di euro (es: 10.50 € diventa 1050)
        amount_in_cents = int(float(event.price) * 100)

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': f"Biglietto: {event.title}",
                        'description': f"Ingresso per {event.title} presso {event.location}",
                    },
                    'unit_amount': amount_in_cents,
                },
                'quantity': 1,
            }],
            mode='payment',
            # Passiamo l'id utente nei metadata per recuperarlo dopo il pagamento
            metadata={
                'user_id': user_id,
                'event_id': event_id,
                'user_email': request.user.get('email', 'utente@eventhub.local')
            },
            success_url=f"{frontend_url}?payment_status=success&event_id={event_id}",
            cancel_url=f"{frontend_url}?payment_status=cancel",
        )
        
        return jsonify({'id': session.id, 'url': session.url, 'requires_stripe': True}), 200

    except Exception as e:
        print(f"--- [ERRORE STRIPE STRIPE] ---: {str(e)}")
        return jsonify({'message': f"Errore nella creazione del pagamento: {str(e)}"}), 500


# 2. CONFERMA REGISTRAZIONE DOPO IL PAGAMENTO STRIPE AVVENUTO CON SUCCESSO
@registrations_bp.route('/api/events/<int:event_id>/confirm-payment', methods=['POST'])
@token_required
def confirm_payment(event_id):
    event = Event.query.get_or_404(event_id)
    raw_user_id = request.user.get('sub') or request.user.get('id') or request.user.get('preferred_username')
    user_id = str(raw_user_id).strip()
    user_email = request.user.get('email', 'utente@eventhub.local')

    # Controlla se l'utente è già stato inserito (evita duplicati se aggiorna la pagina)
    is_already_registered = db.session.query(event_registrations).filter_by(
        user_id=user_id, 
        event_id=event_id
    ).first() is not None

    if is_already_registered:
        return jsonify({'message': 'Pagamento già confermato e registrato!'}), 200

    return register_user_logic(user_id, event, user_email)


# Funzione di utilità riutilizzabile per scrivere nel DB
def register_user_logic(user_id, event, user_email):
    try:
        mock_qr_token = secrets.token_hex(16)
        mock_qr_path = f"/static/qrcodes/qr_{user_id}_{event.id}_{mock_qr_token}.png"

        statement = event_registrations.insert().values(
            user_id=user_id, 
            event_id=event.id,
            qr_code_path=mock_qr_path
        )
        db.session.execute(statement)

        event.tickets_sold = event.tickets_sold + 1
        db.session.commit()

        try:
            send_email_notification.delay(user_email, event.title)
        except Exception as celery_err:
            print(f"--- [CELERY WARN] ---: Impossibile inviare l'email: {celery_err}")

        tickets_left = event.max_tickets - event.tickets_sold

        return jsonify({
            'message': 'Iscrizione completata con successo! Il tuo pagamento è stato elaborato.',
            'available_tickets_left': tickets_left,
            'qr_code_path': mock_qr_path,
            'requires_stripe': False
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f"Errore durante il salvataggio: {str(e)}"}), 500


# 3. VEDI I TUOI EVENTI ISCRITTI
@registrations_bp.route('/api/users/me/events', methods=['GET'])
@token_required
def get_my_events():
    raw_user_id = request.user.get('sub') or request.user.get('id') or request.user.get('preferred_username')
    if not raw_user_id:
        return jsonify({'message': 'Impossibile identificare l\'utente dal token.'}), 400
    
    user_id = str(raw_user_id).strip()
    
    results = db.session.query(Event, event_registrations.c.qr_code_path, event_registrations.c.registered_at).join(
        event_registrations, (event_registrations.c.event_id == Event.id)
    ).filter(event_registrations.c.user_id == user_id).all()

    output = []
    for event, qr_path, reg_at in results:
        output.append({
            'id': event.id,
            'title': event.title,
            'date': event.date.isoformat(),
            'location': event.location,
            'price': float(event.price),
            'qr_code_path': qr_path,
            'registered_at': reg_at.isoformat()
        })

    return jsonify({'events': output, 'registered_events': output}), 200