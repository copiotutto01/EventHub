from flask import Blueprint, request, jsonify
from extensions import db
from models.models import Event
from auth import token_required, requires_role
from datetime import datetime

events_bp = Blueprint('events', __name__)

# 1. GET ALL EVENTS (Pubblico)
@events_bp.route('/api/events', methods=['GET'])
def get_events():
    events = Event.query.all()
    output = []
    for event in events:
        output.append({
            'id': event.id,
            'title': event.title,
            'description': event.description,
            'date': event.date.isoformat(),
            'location': event.location,
            'price': float(event.price),
            'available_tickets': event.available_tickets,
            'organizer_id': event.organizer_id
        })
    return jsonify({'events': output}), 200

# 2. GET SINGLE EVENT (Pubblico)
@events_bp.route('/api/events/<int:event_id>', methods=['GET'])
def get_event(event_id):
    event = Event.query.get_or_404(event_id)
    event_data = {
        'id': event.id,
        'title': event.title,
        'description': event.description,
        'date': event.date.isoformat(),
        'location': event.location,
        'price': float(event.price),
        'available_tickets': event.available_tickets,
        'organizer_id': event.organizer_id
    }
    return jsonify(event_data), 200

# 3. CREATE EVENT (Protetto - Solo Organizzatori)
@events_bp.route('/api/events', methods=['POST'])
@token_required
@requires_role('organizer')
def create_event():
    data = request.get_json()
    
    # Validazione base dei dati inseriti
    if not all(k in data for k in ('title', 'description', 'date', 'location', 'price', 'available_tickets')):
        return jsonify({'message': 'Dati incompleti!'}), 400

    try:
        new_event = Event(
            title=data['title'],
            description=data['description'],
            date=datetime.fromisoformat(data['date']),
            location=data['location'],
            price=data['price'],
            available_tickets=data['available_tickets'],
            organizer_id=request.user['id'] # Preso automaticamente dal Token Keycloak
        )
        db.session.add(new_event)
        db.session.commit()
        return jsonify({'message': 'Evento creato con successo!', 'event_id': new_event.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Errore durante la creazione: {str(e)}'}), 500

# 4. UPDATE EVENT (Protetto - Solo l'organizzatore proprietario)
@events_bp.route('/api/events/<int:event_id>', methods=['PUT'])
@token_required
@requires_role('organizer')
def update_event(event_id):
    event = Event.query.get_or_404(event_id)
    
    # Sicurezza: un organizzatore non può modificare gli eventi di un altro organizzatore
    if event.organizer_id != request.user['id']:
        return jsonify({'message': 'Azione non autorizzata! Non sei il proprietario di questo evento.'}), 403

    data = request.get_json()
    
    event.title = data.get('title', event.title)
    event.description = data.get('description', event.description)
    if 'date' in data:
        event.date = datetime.fromisoformat(data['date'])
    event.location = data.get('location', event.location)
    event.price = data.get('price', event.price)
    event.available_tickets = data.get('available_tickets', event.available_tickets)

    db.session.commit()
    return jsonify({'message': 'Evento aggiornato con successo!'}), 200

# 5. DELETE EVENT (Protetto - Solo il proprietario)
@events_bp.route('/api/events/<int:event_id>', methods=['DELETE'])
@token_required
@requires_role('organizer')
def delete_event(event_id):
    event = Event.query.get_or_404(event_id)
    
    if event.organizer_id != request.user['id']:
        return jsonify({'message': 'Azione non autorizzata!'}), 403

    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Evento eliminato con successo!'}), 200