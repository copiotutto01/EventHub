import os
import stripe
from flask import Blueprint, request, jsonify, current_app, make_response
from werkzeug.utils import secure_filename
from datetime import datetime
import io
import csv
from sqlalchemy import func

from extensions import db
from models.models import Event, event_registrations, Review
from auth import token_required, requires_role

# Configurazione della chiave segreta di Stripe caricata dal file .env
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

events_bp = Blueprint('events', __name__)

# 1. GET ALL EVENTS (Pubblico con Categorie e Filtri di Ricerca)
@events_bp.route('/api/events', methods=['GET'])
def get_events():
    category = request.args.get('category')
    location = request.args.get('city')
    
    query = Event.query
    if category:
        query = query.filter(Event.category.ilike(f"%{category}%"))
    if location:
        query = query.filter(Event.location.ilike(f"%{location}%"))
        
    events = query.all()
    output = []
    for event in events:
        output.append({
            'id': event.id,
            'title': event.title,
            'description': event.description,
            'date': event.date.isoformat(),
            'location': event.location,
            'category': event.category,
            'price': float(event.price),
            'available_tickets': getattr(event, 'available_tickets', event.max_tickets),
            'max_tickets': event.max_tickets,
            'tickets_sold': event.tickets_sold,
            'image_path': f"/static/uploads/{event.image_path}" if event.image_path else None,
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
        'category': event.category,
        'price': float(event.price),
        'available_tickets': getattr(event, 'available_tickets', event.max_tickets),
        'max_tickets': event.max_tickets,
        'tickets_sold': event.tickets_sold,
        'image_path': f"/static/uploads/{event.image_path}" if event.image_path else None,
        'organizer_id': event.organizer_id
    }
    return jsonify(event_data), 200

# 3. CREATE EVENT (Flessibile, Robusta e a prova di crash di mapping)
@events_bp.route('/api/events', methods=['POST'])
@token_required
@requires_role('organizer')
def create_event():
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form.to_dict()

    if not data:
        return jsonify({'message': 'Dati completamente mancanti nella richiesta!'}), 400
        
    total_tickets = data.get('max_tickets') or data.get('available_tickets') or data.get('total_tickets')
    if total_tickets is None:
        tickets_count = 100
    else:
        try:
            tickets_count = int(total_tickets)
        except (ValueError, TypeError):
            tickets_count = 100
    
    title = data.get('title') or 'Nuovo Evento'
    description = data.get('description') or 'Nessuna descrizione fornita.'
    location = data.get('location') or 'Online'
    
    category = data.get('category')
    if not category or str(category).strip().isdigit():
        category = 'Generico'
    else:
        category = str(category).strip()
        
    try:
        price = float(data.get('price', 0.0))
    except (ValueError, TypeError):
        price = 0.0

    if price < 0:
        return jsonify({'message': 'Il prezzo non può essere inferiore a zero!'}), 400

    date_str = data.get('date')
    if date_str:
        try:
            clean_date_str = date_str.replace('Z', '').split('.')[0]
            if len(clean_date_str) == 10:
                event_date = datetime.strptime(clean_date_str, '%Y-%m-%d')
            else:
                event_date = datetime.fromisoformat(clean_date_str)
        except Exception:
            event_date = datetime.utcnow()
    else:
        event_date = datetime.utcnow()

    if event_date.date() < datetime.utcnow().date():
        return jsonify({'message': 'Non puoi creare un evento in una data passata!'}), 400

    user_id = request.user.get('sub') or request.user.get('id')
    if not user_id:
        user_id = request.user.get('preferred_username') or 'organizer_id_def'

    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '':
            filename = secure_filename(file.filename)
            image_filename = f"{int(datetime.utcnow().timestamp())}_{filename}"
            os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
            file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], image_filename))

    try:
        new_event = Event(
            title=title,
            description=description,
            date=event_date,
            location=location,
            category=category,
            price=price,
            max_tickets=tickets_count,
            tickets_sold=0,
            image_path=image_filename,
            organizer_id=str(user_id)
        )
        
        db.session.add(new_event)
        db.session.commit()
        return jsonify({'message': 'Evento creato con successo!', 'event_id': new_event.id}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ --- [CRASH CREAZIONE EVENTO IN DATABASE] ---: {str(e)}")
        return jsonify({'message': f'Errore Database (SQLAlchemy): {str(e)}'}), 500

# 4. UPDATE EVENT (Protetto)
@events_bp.route('/api/events/<int:event_id>', methods=['PUT'])
@token_required
@requires_role('organizer')
def update_event(event_id):
    event = Event.query.get_or_404(event_id)
    user_id = request.user.get('sub') or request.user.get('id')
    
    if str(event.organizer_id) != str(user_id):
        return jsonify({'message': 'Azione non autorizzata! Non sei il proprietario di questo evento.'}), 403

    data = request.get_json() if request.is_json else request.form.to_dict()
    if not data:
        return jsonify({'message': 'Nessun dato fornito per l\'aggiornamento'}), 400
    
    event.title = data.get('title', event.title)
    event.description = data.get('description', event.description)
    event.location = data.get('location', event.location)
    event.category = data.get('category', event.category)
    
    if 'price' in data:
        try:
            temp_price = float(data['price'])
            if temp_price >= 0:
                event.price = temp_price
        except ValueError:
            pass
    
    if 'date' in data:
        try:
            clean_date_str = data['date'].replace('Z', '').split('.')[0]
            if len(clean_date_str) == 10:
                temp_date = datetime.strptime(clean_date_str, '%Y-%m-%d')
            else:
                temp_date = datetime.fromisoformat(clean_date_str)
            
            if temp_date.date() >= datetime.utcnow().date():
                event.date = temp_date
        except ValueError:
            pass
            
    total_tickets = data.get('max_tickets') or data.get('available_tickets') or data.get('total_tickets')
    if total_tickets:
        try:
            tickets_int = int(total_tickets)
            event.max_tickets = tickets_int
        except ValueError:
            pass

    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '':
            filename = secure_filename(file.filename)
            image_filename = f"{int(datetime.utcnow().timestamp())}_{filename}"
            os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
            file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], image_filename))
            event.image_path = image_filename

    db.session.commit()
    return jsonify({'message': 'Evento aggiornato con successo!'}), 200

# 5. DELETE EVENT
@events_bp.route('/api/events/<int:event_id>', methods=['DELETE'])
@token_required
@requires_role('organizer')
def delete_event(event_id):
    event = Event.query.get_or_404(event_id)
    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Evento eliminato con successo!'}), 200

# 6. ESPORTAZIONE LISTA ISCRITTI IN CSV
@events_bp.route('/api/events/<int:event_id>/export-csv', methods=['GET'])
@token_required
@requires_role('organizer')
def export_event_attendees(event_id):
    event = Event.query.get_or_404(event_id)
    user_id = request.user.get('sub') or request.user.get('id')
    
    if str(event.organizer_id) != str(user_id):
        return jsonify({'message': 'Non autorizzato ad esportare i dati di questo evento'}), 403

    registrations = db.session.query(event_registrations).filter_by(event_id=event_id).all()

    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['User ID', 'Registered At', 'QR Code Path'])
    
    for r in registrations:
        cw.writerow([r.user_id, r.registered_at.isoformat(), getattr(r, 'qr_code_path', 'N/A')])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = f"attachment; filename=attendees_event_{event_id}.csv"
    output.headers["Content-Type"] = "text/csv"
    return output

# 7. DASHBOARD ORGANIZZATORE: STATISTICHE AVANZATE
@events_bp.route('/api/organizer/dashboard', methods=['GET'])
@token_required
@requires_role('organizer')
def get_organizer_dashboard():
    user_id = request.user.get('sub') or request.user.get('id')
    if not user_id:
        return jsonify({'message': 'Impossibile identificare l\'organizzatore.'}), 400

    my_events = Event.query.filter_by(organizer_id=str(user_id)).all()
    
    total_events = len(my_events)
    total_tickets_sold = 0
    total_estimated_earnings = 0.0
    events_stats = []

    for event in my_events:
        event_earnings = event.tickets_sold * event.price
        total_tickets_sold += event.tickets_sold
        total_estimated_earnings += event_earnings

        avg_rating_query = db.session.query(func.avg(Review.rating)).filter(Review.event_id == event.id).scalar()
        avg_rating = round(float(avg_rating_query), 2) if avg_rating_query else 0.0

        events_stats.append({
            'event_id': event.id,
            'title': event.title,
            'tickets_sold': event.tickets_sold,
            'max_tickets': event.max_tickets,
            'available_tickets': getattr(event, 'available_tickets', event.max_tickets),
            'earnings_estimated': event_earnings,
            'average_rating': avg_rating
        })

    return jsonify({
        'summary': {
            'total_events': total_events,
            'total_tickets_sold': total_tickets_sold,
            'total_estimated_earnings': total_estimated_earnings
        },
        'events_details': events_stats
    }), 200