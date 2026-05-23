import os
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
from celery import Celery

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()

# Funzione per creare e configurare l'istanza di Celery collegata a Flask
def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://eventhub_redis:6379/0'),
        broker=os.getenv('CELERY_BROKER_URL', 'redis://eventhub_redis:6379/0')
    )
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery

def create_app():
    app = Flask(__name__)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    
    # Configurazione Celery all'interno di Flask
    app.config['CELERY_BROKER_URL'] = os.getenv('CELERY_BROKER_URL', 'redis://eventhub_redis:6379/0')
    app.config['CELERY_RESULT_BACKEND'] = os.getenv('CELERY_RESULT_BACKEND', 'redis://eventhub_redis:6379/0')
    
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static/uploads')
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    
    from models.models import Event, Review
    from auth import token_required

    # --- REGISTRAZIONE BLUEPRINTS ---
    from routes.events import events_bp
    from routes.reviews import reviews_bp
    
    app.register_blueprint(events_bp)
    app.register_blueprint(reviews_bp)
    # --------------------------------

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "healthy",
            "message": "EventHub Backend attivo e funzionante!"
        }), 200

    @app.route('/api/protected', methods=['GET'])
    @token_required
    def protected_test():
        return jsonify({
            "message": f"Ciao {request.user['username']}, hai effettuato l'accesso all'area protetta!",
            "user_info": request.user
        }), 200

    return app

# Istanza globale per permettere a Flask e al Worker Celery di avviarsi correttamente
flask_app = create_app()
celery_app = make_celery(flask_app)

if __name__ == '__main__':
    flask_app.run(host='0.0.0.0', port=5000, debug=True)