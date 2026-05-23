import os
from flask import request, jsonify
from functools import wraps
import jwt
import requests

KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://eventhub_auth:8080")
REALM_NAME = os.getenv("KEYCLOAK_REALM", "eventhub")

# Recupera la chiave pubblica da Keycloak per verificare la firma dei JWT senza interrogarlo ogni volta
def get_keycloak_public_key():
    try:
        url = f"{KEYCLOAK_URL}/realms/{REALM_NAME}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            public_key_json = response.json().get("public_key")
            return f"-----BEGIN PUBLIC KEY-----\n{public_key_json}\n-----END PUBLIC KEY-----"
    except Exception as e:
        print(f"Errore nel recupero della chiave pubblica Keycloak: {e}")
    return None

PUBLIC_KEY = get_keycloak_public_key()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Il token arriva nell'header Authorization come: Bearer <TOKEN>
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization'].split(" ")
            if len(auth_header) == 2 and auth_header[0] == "Bearer":
                token = auth_header[1]

        if not token:
            return jsonify({"message": "Token mancante o non valido!"}), 401

        try:
            global PUBLIC_KEY
            if not PUBLIC_KEY:
                PUBLIC_KEY = get_keycloak_public_key()
                
            # Decodifica e verifica il token usando la chiave pubblica di Keycloak
            # Viene verificata la firma, la scadenza (exp) e l'audience (aud)
            payload = jwt.decode(
                token, 
                PUBLIC_KEY, 
                algorithms=["RS256"], 
                audience=os.getenv("KEYCLOAK_CLIENT_ID", "eventhub-backend")
            )
            # Salviamo le info dell'utente nel contesto della richiesta
            request.user = {
                "id": payload.get("sub"),
                "username": payload.get("preferred_username"),
                "email": payload.get("email"),
                "roles": payload.get("resource_access", {}).get(os.getenv("KEYCLOAK_CLIENT_ID", "eventhub-backend"), {}).get("roles", [])
            }
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token scaduto!"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"message": f"Token non valido: {str(e)}"}), 401

        return f(*args, **kwargs)
    return decorated

def requires_role(required_role):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Verifica se l'utente ha il ruolo richiesto all'interno del token
            user_roles = request.user.get("roles", [])
            if required_role not in user_roles:
                return jsonify({"message": f"Accesso negato! Richiesto ruolo: {required_role}"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator