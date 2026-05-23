from app import flask_app, db
from models.models import Event
from datetime import datetime

with flask_app.app_context():
    if Event.query.count() == 0:
        ev1 = Event(
            title='Concerto Live EventHub', 
            description='Il grande ritorno della musica dal vivo nel cuore della città.', 
            date=datetime.now(), 
            location='Milano, Piazza Duomo', 
            category='Musica',
            price=15.00, 
            max_tickets=100,
            tickets_sold=0,
            organizer_id='d8c1dcf8-0ac3-4893-ac43-6b9ec7c8d088'
        )
        ev2 = Event(
            title='Workshop React & Flask', 
            description='Impara a integrare microservizi e frontend moderni in 3 ore.', 
            date=datetime.now(), 
            location='Online (Zoom)', 
            category='Formazione',
            price=0.00, 
            max_tickets=50,
            tickets_sold=0,
            organizer_id='d8c1dcf8-0ac3-4893-ac43-6b9ec7c8d088'
        )
        db.session.add(ev1)
        db.session.add(ev2)
        db.session.commit()
        print('🎉 Database popolato con successo!')
    else:
        print('ℹ️ Ci sono già eventi nel database!')