import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from extensions import db, migrate, init_celery

load_dotenv()

def create_app():
    app = Flask(__name__)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'super-segreta-chiave')
    
    app.config['CELERY_BROKER_URL'] = os.getenv('CELERY_BROKER_URL', 'redis://eventhub_redis:6379/0')
    app.config['CELERY_RESULT_BACKEND'] = os.getenv('CELERY_RESULT_BACKEND', 'redis://eventhub_redis:6379/0')
    
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static/uploads')
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    db.init_app(app)
    migrate.init_app(app, db)
    
    # 🌟 CONFIGURAZIONE CORS AGGIORNATA PER SUPPORTARE CREDENTIALS E ORIGINI DINAMICHE
    CORS(app, resources={
        r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
            "supports_credentials": True
        }
    })
    
    init_celery(app)
    
    with app.app_context():
        from models.models import Event, Review
        db.create_all()
            
        from routes.events import events_bp
        from routes.reviews import reviews_bp
        from routes.registrations import registrations_bp
        
        app.register_blueprint(events_bp)
        app.register_blueprint(reviews_bp)
        app.register_blueprint(registrations_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "healthy",
            "message": "Backend online!"
        }), 200

    return app

flask_app = create_app()
from extensions import celery_app

if __name__ == '__main__':
    flask_app.run(host='0.0.0.0', port=5001, debug=True)