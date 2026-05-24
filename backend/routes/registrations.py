from flask import Blueprint, request, jsonify
from extensions import db
from models.models import Event, event_registrations
from auth import token_required
from tasks import send_email_notification

registrations_bp = Blueprint('registrations', __name__)

# 1. ISCRIVITI A UN EVENTO (Protetto - Qualsiasi utente autenticato)
@registrations_bp.route('/api/events/<int:event_id>/register', methods=['POST'])
@token_required
def register_to_event(event_id):
    event = Event.query.get_or_404(event_id)
    user_id = request.user['id']
    user_email = request.user.get('email', 'utente@eventhub.local')

    # Controlla se ci sono ancora biglietti disponibili usando la property
    if event.available_tickets <= 0:
        return jsonify({'message': 'Spiacenti, i biglietti per questo evento sono esauriti!'}), 400

    # Controlla se l'utente è già iscritto a questo evento
    is_already_registered = db.session.query(event_registrations).filter_by(
        user_id=user_id, 
        event_id=event_id
    ).first() is not None

    if is_already_registered:
        return jsonify({'message': 'Sei già iscritto a questo evento!'}), 400

    try:
        # 1. Registra l'utente inserendo la riga nella tabella di associazione
        statement = event_registrations.insert().values(user_id=user_id, event_id=event_id)
        db.session.execute(statement)

        # Incrementiamo la colonna reale del DB anziché modificare la property in sola lettura
        event.tickets_sold += 1
        
        db.session.commit()

        # 3. LANCIAMO IL TASK CELERY IN BACKGROUND!
        try:
            send_email_notification.delay(user_email, event.title)
        except Exception as celery_err:
            # Logghiamo l'errore di Celery ma non blocchiamo l'acquisto dell'utente se Redis ha problemi
            print(f"--- [CELERY WARN] ---: Impossibile inviare l'email: {celery_err}")

        return jsonify({
            'message': 'Iscrizione completata con successo! Riceverai una mail di conferma a breve.',
            'available_tickets_left': event.available_tickets
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"--- [ERRORE REGISTRAZIONE] ---: {str(e)}")
        return jsonify({'message': f"Errore durante l'iscrizione: {str(e)}"}), 500


# 2. VEDI I TUOI EVENTI ISCRITTI (Protetto - Storico dell'utente)
@registrations_bp.route('/api/users/me/events', methods=['GET'])
@token_required
def get_my_events():
    user_id = request.user['id']
    
    # Query per recuperare tutti gli eventi a cui l'utente è associato
    registered_events = Event.query.join(
        event_registrations, (event_registrations.c.event_id == Event.id)
    ).filter(event_registrations.c.user_id == user_id).all()

    output = []
    for event in registered_events:
        output.append({
            'id': event.id,
            'title': event.title,
            'date': event.date.isoformat(),
            'location': event.location
        })

    return jsonify({'registered_events': output}), 200