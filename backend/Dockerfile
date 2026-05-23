FROM python:3.11-slim

WORKDIR /app

# Installa le dipendenze di sistema necessarie per psycopg2
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Questo risolve definitivamente i problemi di import in Docker
ENV PYTHONPATH=/app

EXPOSE 5000

CMD ["python", "app.py"]