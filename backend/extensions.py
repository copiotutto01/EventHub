import os
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from celery import Celery

db = SQLAlchemy()
migrate = Migrate()

# Creiamo l'istanza di Celery isolata a livello di modulo
celery_app = Celery('eventhub_tasks')

def init_celery(app):
    """Inizializza Celery applicando la configurazione e il contesto dell'app Flask"""
    celery_app.conf.update(
        broker_url=os.getenv('CELERY_BROKER_URL', 'redis://eventhub_redis:6379/0'),
        result_backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://eventhub_redis:6379/0'),
        task_ignore_result=True
    )
    celery_app.conf.update(app.config)

    class ContextTask(celery_app.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app.Task = ContextTask
    return celery_app