import time
from app import celery_app

@celery_app.task(name="tasks.send_email_notification")
def send_email_notification(user_email, event_title):
    print(f"[CELERY] Inizio elaborazione: Invio email a {user_email} per l'evento '{event_title}'...")
    
    # Simuliamo un ritardo di rete di 5 secondi (es. connessione al server SMTP)
    time.sleep(5)
    
    print(f"[CELERY] Successo: Email inviata correttamente a {user_email}!")
    return f"Email inviata a {user_email}"