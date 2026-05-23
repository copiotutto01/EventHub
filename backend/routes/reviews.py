from flask import Blueprint, request, jsonify
from extensions import db
from models.models import Review, Event
from auth import token_required

reviews_bp = Blueprint('reviews', __name__)

# 1. GET REVIEWS FOR EVENT (Pubblico)
@reviews_bp.route('/api/events/<int:event_id>/reviews', methods=['GET'])
def get_reviews(event_id):
    # Verifichiamo prima che l'evento esista
    Event.query.get_or_404(event_id)
    
    reviews = Review.query.filter_by(event_id=event_id).all()
    output = []
    for review in reviews:
        output.append({
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'user_id': review.user_id,
            'created_at': review.created_at.isoformat()
        })
    return jsonify({'reviews': output}), 200

# 2. ADD REVIEW (Protetto - Qualsiasi utente autenticato)
@reviews_bp.route('/api/events/<int:event_id>/reviews', methods=['POST'])
@token_required
def add_review(event_id):
    # Verifichiamo che l'evento esista
    Event.query.get_or_404(event_id)
    
    data = request.get_json()
    
    if not data or 'rating' not in data or 'comment' not in data:
        return jsonify({'message': 'Dati incompleti! Rating e commento sono obbligatori.'}), 400
        
    # Validazione del voto (es. da 1 a 5 stelle)
    rating = int(data['rating'])
    if rating < 1 or rating > 5:
        return jsonify({'message': 'Il rating deve essere un valore compreso tra 1 e 5.'}), 400

    try:
        new_review = Review(
            rating=rating,
            comment=data['comment'],
            event_id=event_id,
            user_id=request.user['id'] # Preso dal JWT di Keycloak
        )
        db.session.add(new_review)
        db.session.commit()
        return jsonify({'message': 'Recensione aggiunta con successo!', 'review_id': new_review.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Errore durante il salvataggio: {str(e)}'}), 500

# 3. DELETE REVIEW (Protetto - Solo l'utente che l'ha scritta può eliminarla)
@reviews_bp.route('/api/reviews/<int:review_id>', methods=['DELETE'])
@token_required
def delete_review(review_id):
    review = Review.query.get_or_404(review_id)
    
    # Sicurezza: controllo proprietario della recensione
    if review.user_id != request.user['id']:
        return jsonify({'message': 'Azione non autorizzata! Puoi cancellare solo le tue recensioni.'}), 403

    db.session.delete(review)
    db.session.commit()
    return jsonify({'message': 'Recensione eliminata con successo!'}), 200