from flask import Blueprint, request, jsonify
import secrets

from extensions import db
from models.models import Event, event_registrations
from auth import token_required
from tasks import send_email_notification

registrations_bp = Blueprint('registrations', __name__)

# 1. ISCRIVITI A UN EVENTO (Protetto)
@registrations_bp.route('/api/events/<int:event_id>/register', methods=['POST'])
@token_required
def register_to_event(event_id):
    event = Event.query.get_or_404(event_id)
    
    # Estrazione e sanificazione dell'ID utente da Keycloak (forzato a stringa pulita)
    raw_user_id = request.user.get('sub') or request.user.get('id') or request.user.get('preferred_username')
    if not raw_user_id:
        return jsonify({'message': 'Impossibile identificare l\'utente dal token.'}), 400
    
    user_id = str(raw_user_id).strip()
    user_email = request.user.get('email', 'utente@eventhub.local')

    # Controllo sicuro dei biglietti basato sulle colonne fisiche del DB
    if (event.max_tickets - event.tickets_sold) <= 0:
        return jsonify({'message': 'Spiacenti, i biglietti per questo evento sono esauriti!'}), 400

    is_already_registered = db.session.query(event_registrations).filter_by(
        user_id=user_id, 
        event_id=event_id
    ).first() is not None

    if is_already_registered:
        return jsonify({'message': 'Sei già iscritto a questo evento!'}), 400

    try:
        # Generiamo una stringa fittizia univoca per simulare il percorso del QR Code richiesto
        mock_qr_token = secrets.token_hex(16)
        mock_qr_path = f"/static/qrcodes/qr_{user_id}_{event_id}_{mock_qr_token}.png"

        statement = event_registrations.insert().values(
            user_id=user_id, 
            event_id=event_id,
            qr_code_path=mock_qr_path
        )
        db.session.execute(statement)

        # Incrementiamo il contatore fisico dei biglietti venduti
        event.tickets_sold = event.tickets_sold + 1
        db.session.commit()

        # Invocazione asincrona sicura Celery
        try:
            send_email_notification.delay(user_email, event.title)
        except Exception as celery_err:
            print(f"--- [CELERY WARN] ---: Impossibile inviare l'email: {celery_err}")

        # Calcoliamo i biglietti rimasti matematicamente per evitare letture di proprietà instabili in risposta
        tickets_left = event.max_tickets - event.tickets_sold

        return jsonify({
            'message': 'Iscrizione completata con successo! Riceverai una mail di conferma a breve.',
            'available_tickets_left': tickets_left,
            'qr_code_path': mock_qr_path
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"--- [ERRORE REGISTRAZIONE] ---: {str(e)}")
        return jsonify({'message': f"Errore durante l'iscrizione: {str(e)}"}), 500


# 2. VEDI I TUOI EVENTI ISCRITTI (Protetto - Con estrazione dati QR Code per i biglietti dell'utente)
@registrations_bp.route('/api/users/me/events', methods=['GET'])
@token_required
def get_my_events():
    raw_user_id = request.user.get('sub') or request.user.get('id') or request.user.get('preferred_username')
    if not raw_user_id:
        return jsonify({'message': 'Impossibile identificare l\'utente dal token.'}), 400
    
    user_id = str(raw_user_id).strip()
    
    # Eseguiamo una join esplicita per recuperare i campi aggiuntivi della tabella di mezzo (es. qr_code_path)
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