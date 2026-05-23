import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_load_env

# Carica le variabili d'ambiente dal file .env
load_env()

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    
    # Configurazione Database e Sicurezza
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    
    # Abilita i CORS per permettere ad Angular (che girerà su un'altra porta) di parlare con Flask
    CORS(app)
    
    # Inizializzazione estensioni
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Endpoint di test di base per verificare che il backend risponda
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "healthy",
            "message": "Il backend di EventHub risponde correttamente!"
        }), 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)