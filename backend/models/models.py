from datetime import datetime
# IMPORTANTE: Cambiamo l'import per prenderlo da extensions
from extensions import db

event_registrations = db.Table('event_registrations',
    db.Column('user_id', db.String(64), primary_key=True),
    db.Column('event_id', db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), primary_key=True),
    db.Column('registered_at', db.DateTime, default=datetime.utcnow),
    db.Column('qr_code_path', db.String(255), nullable=True)
)

class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False, default="Generico")
    price = db.Column(db.Float, default=0.0, nullable=False)
    max_tickets = db.Column(db.Integer, nullable=False, default=100)
    tickets_sold = db.Column(db.Integer, default=0, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)
    organizer_id = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reviews = db.relationship('Review', backref='event', lazy=True, cascade="all, delete-orphan")

    @property
    def available_tickets(self):
        return self.max_tickets - self.tickets_sold


class Review(db.Model):
    __tablename__ = 'reviews'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(64), nullable=False)
    user_name = db.Column(db.String(100), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=False)
    is_reported = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)