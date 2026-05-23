from datetime import datetime
from app import db

# Tabella di associazione per l'iscrizione degli utenti agli eventi (Many-to-Many)
# Nota: Gli ID degli utenti provengono da Keycloak (stringhe UUID)
event_registrations = db.Table('event_registrations',
    db.Column('user_id', db.String(64), primary_key=True),
    db.Column('event_id', db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), primary_key=True),
    db.Column('registered_at', db.DateTime, default=datetime.utcnow),
    db.Column('qr_code_path', db.String(255), nullable=True) # Percorso del QR code generato
)

class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, default=0.0, nullable=False)
    max_tickets = db.Column(db.Integer, nullable=False)
    tickets_sold = db.Column(db.Integer, default=0, nullable=False)
    image_path = db.Column(db.String(255), nullable=True) # Salvataggio file LOCANDINA (NON URL)
    organizer_id = db.Column(db.String(64), nullable=False) # ID dell'organizzatore da Keycloak
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relazione con le recensioni (un evento ha molte recensioni)
    reviews = db.relationship('Review', backref='event', lazy=True, cascade="all, delete-orphan")

    @property
    def available_tickets(self):
        return self.max_tickets - self.tickets_sold


class Review(db.Model):
    __tablename__ = 'reviews'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(64), nullable=False) # ID dell'utente da Keycloak
    user_name = db.Column(db.String(100), nullable=False) # Nome memorizzato per mostrare la recensione velocemente
    rating = db.Column(db.Integer, nullable=False) # Vincolo 1-5 gestito a livello di validazione
    comment = db.Column(db.Text, nullable=False)
    is_reported = db.Column(db.Boolean, default=False, nullable=False) # Per la moderazione dell'admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)