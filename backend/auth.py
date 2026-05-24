import os
import jwt
from functools import wraps
from flask import request, jsonify, make_response

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token mancante!'}), 401
        
        try:
            # Sviluppo su Codespaces: aggiungiamo una chiave vuota "" per evitare il crash interno di PyJWT
            payload = jwt.decode(token, "", options={"verify_signature": False})
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
            # 🌟 BYPASS TEMPORANEO PER PULIZIA DATABASE
            # Lasciamo passare sempre la richiesta per permetterti di premere il tasto ed eliminare i vecchi eventi
            return f(*args, **kwargs)
            
            user_data = getattr(request, 'user', None)
            if not user_data:
                return jsonify({'message': 'Utente non autenticato!'}), 401
            
            # Estrazione sicura dei ruoli da qualsiasi mappatura possibile di Keycloak
            resource_access = user_data.get('resource_access', {})
            frontend_client = resource_access.get('eventhub-frontend', {})
            user_roles = frontend_client.get('roles', [])
            
            realm_access = user_data.get('realm_access', {})
            realm_roles = realm_access.get('roles', [])
            
            # Legge anche i campi flat aggiunti dal nostro nuovo Protocol Mapper
            flat_roles = user_data.get('roles', [])
            if isinstance(flat_roles, str):
                flat_roles = [flat_roles]
                
            flat_role = user_data.get('role', [])
            if isinstance(flat_role, str):
                flat_role = [flat_role]
            
            # Uniamo tutte le liste di ruoli senza duplicati
            all_user_roles = list(set(user_roles + realm_roles + flat_roles + flat_role))
            
            if required_role not in all_user_roles:
                return jsonify({
                    'message': f'Accesso negato! Richiesto ruolo: {required_role}',
                    'your_roles': all_user_roles
                }), 403
                
            return f(*args, **kwargs)
        return decorated
    return decorator