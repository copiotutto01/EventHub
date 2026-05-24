from flask import Blueprint, request, jsonify
from extensions import db
from models.models import Review, Event
from auth import token_required, requires_role
from datetime import datetime

reviews_bp = Blueprint('reviews', __name__)

# 1. GET REVIEWS FOR EVENT (Pubblico)
@reviews_bp.route('/api/events/<int:event_id>/reviews', methods=['GET'])
def get_reviews(event_id):
    Event.query.get_or_404(event_id)
    
    # Mostriamo solo le recensioni non segnalate (o tutte, a seconda della scelta di moderazione)
    reviews = Review.query.filter_by(event_id=event_id, is_reported=False).all()
    output = []
    for review in reviews:
        created_at_raw = getattr(review, 'created_at', None)
        created_at_str = created_at_raw.isoformat() if hasattr(created_at_raw, 'isoformat') else str(created_at_raw) if created_at_raw else ""

        output.append({
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'user_id': review.user_id,
            'username': review.user_name,
            'created_at': created_at_str
        })
    return jsonify({'reviews': output}), 200


# 2. ADD REVIEW (Protetto - Solo dopo che l'evento si è svolto!)
@reviews_bp.route('/api/events/<int:event_id>/reviews', methods=['POST'])
@token_required
def add_review(event_id):
    event = Event.query.get_or_404(event_id)
    
    # 🌟 VINCOLO CONSEGNA: Verifica che l'evento sia già passato
    if event.date > datetime.utcnow():
        return jsonify({'message': 'Non puoi recensire un evento che non si è ancora svolto!'}), 400
    
    data = request.get_json()
    if not data or 'rating' not in data or 'comment' not in data:
        return jsonify({'message': 'Dati incompleti! Rating e commento sono obbligatori.'}), 400
        
    try:
        rating = int(data['rating'])
    except ValueError:
        return jsonify({'message': 'Il rating deve essere un numero intero.'}), 400
        
    if rating < 1 or rating > 5:
        return jsonify({'message': 'Il rating deve essere un valore compreso tra 1 e 5.'}), 400

    user_id = request.user.get('sub', request.user.get('id'))
    user_name = request.user.get('name', request.user.get('preferred_username', 'Utente'))

    try:
        new_review = Review(
            rating=rating,
            comment=data['comment'],
            event_id=event_id,
            user_id=user_id,
            user_name=user_name,
            is_reported=False
        )
        db.session.add(new_review)
        db.session.commit()
        return jsonify({'message': 'Recensione aggiunta con successo!', 'review_id': new_review.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Errore durante il salvataggio: {str(e)}'}), 500


# 3. DELETE REVIEW (Protetto - Proprietario)
@reviews_bp.route('/api/reviews/<int:review_id>', methods=['DELETE'])
@token_required
def delete_review(review_id):
    review = Review.query.get_or_404(review_id)
    user_id = request.user.get('sub', request.user.get('id'))
    
    if review.user_id != user_id:
        return jsonify({'message': 'Azione non autorizzata! Puoi cancellare solo le tue recensioni.'}), 403

    db.session.delete(review)
    db.session.commit()
    return jsonify({'message': 'Recensione eliminata con successo!'}), 200


# 🌟 4. SEGNALA RECENSIONE (Protetto - Qualsiasi utente può segnalare all'admin)
@reviews_bp.route('/api/reviews/<int:review_id>/report', methods=['POST'])
@token_required
def report_review(review_id):
    review = Review.query.get_or_404(review_id)
    review.is_reported = True
    db.session.commit()
    return jsonify({'message': 'Recensione segnalata ai moderatori con successo.'}), 200


# ==========================================
# 🌟 AREA ADMIN: MODERAZIONE RECENSIONI
# ==========================================

# 5. LISTA RECENSIONI SEGNALATE (Protetto - Solo Admin)
@reviews_bp.route('/api/admin/reviews/reported', methods=['GET'])
@token_required
@requires_role('admin')
def get_reported_reviews():
    reported_reviews = Review.query.filter_by(is_reported=True).all()
    output = []
    for r in reported_reviews:
        output.append({
            'id': r.id,
            'event_id': r.event_id,
            'rating': r.rating,
            'comment': r.comment,
            'user_name': r.user_name,
            'created_at': r.created_at.isoformat() if r.created_at else ""
        })
    return jsonify({'reported_reviews': output}), 200


# 6. APPROVA/SBLOCCA RECENSIONE SEGNALATA (Protetto - Solo Admin)
@reviews_bp.route('/api/admin/reviews/<int:review_id>/approve', methods=['POST'])
@token_required
@requires_role('admin')
def approve_review(review_id):
    review = Review.query.get_or_404(review_id)
    review.is_reported = False  # L'admin pulisce la segnalazione
    db.session.commit()
    return jsonify({'message': 'Recensione approvata e ripristinata.'}), 200


# 7. CANCELLA RECENSIONE MODERATA (Protetto - Solo Admin)
@reviews_bp.route('/api/admin/reviews/<int:review_id>/reject', methods=['DELETE'])
@token_required
@requires_role('admin')
def admin_delete_review(review_id):
    review = Review.query.get_or_404(review_id)
    db.session.delete(review)
    db.session.commit()
    return jsonify({'message': 'Recensione rimossa definitivamente dai moderatori.'}), 200