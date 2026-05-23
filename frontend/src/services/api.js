import axios from 'axios';

// ATTENZIONE: Sostituisci questo URL con l'URL pubblico della tua porta 8080 del backend!
const BACKEND_URL = 'https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-8080.app.github.dev';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercettore per inserire automaticamente il token JWT di Keycloak in ogni chiamata
api.interceptors.request.use(
  (config) => {
    // Recuperiamo il token salvato a livello globale su window
    const token = window.token; 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;