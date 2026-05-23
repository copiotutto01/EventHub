FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Avvia Vite forzando l'host sullo 0.0.0.0 per renderlo accessibile fuori dal container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]