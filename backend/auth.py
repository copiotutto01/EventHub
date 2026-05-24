import os
import jwt
from functools import wraps
from flask import request, jsonify

# Configura l'URL di Keycloak per la validazione (puoi disattivare la verifica della firma se sei in locale/dev per semplicità)
KEYCLOAK_PUBLIC_KEY = os.getenv('KEYCLOAK_PUBLIC_KEY', None)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Verifica se il token è presente nell'header Authorization
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token mancante!'}), 401
        
        try:
            # Decodifichiamo il token. In modalità sviluppo saltiamo la firma se non configurata
            if KEYCLOAK_PUBLIC_KEY:
                # Se hai inserito la chiave pubblica nel .env
                payload = jwt.decode(token, KEYCLOAK_PUBLIC_KEY, algorithms=['RS256'], audience='eventhub-backend')
            else:
                # Decodifica senza verifica della firma (comoda e sicura per ambienti di sviluppo/test isolati)
                payload = jwt.decode(token, options={"verify_signature": False})
            
            # 🌟 FONDAMENTALE: Attacchiamo l'INTERO payload alla richiesta Flask
            request.user = payload
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Il token è scaduto!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token non valido!'}), 401
            
        return f(*args, **kwargs)
    return decorated


def requires_role(required_role):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Recuperiamo l'intero dizionario decodificato dal token_required
            user_data = getattr(request, 'user', None)
            if not user_data:
                return jsonify({'message': 'Utente non autenticato o sessione non valida!'}), 401
            
            # 🌟 Estrazione mirata per la struttura di Keycloak
            resource_access = user_data.get('resource_access', {})
            backend_client = resource_access.get('eventhub-backend', {})
            user_roles = backend_client.get('roles', [])
            
            # Se l'utente non ha il ruolo richiesto, blocca l'operazione
            if required_role not in user_roles:
                return jsonify({
                    'message': f'Accesso negato! Questa operazione richiede il ruolo: {required_role}',
                    'your_roles': user_roles
                }), 403
                
            return f(*args, **kwargs)
        return decorator
    return decorator