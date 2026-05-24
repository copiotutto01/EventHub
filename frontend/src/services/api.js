import axios from 'axios';

// Forziamo l'URL sulla porta 5001 (aggiornato per bypassare la porta 5000 occupata)
const BACKEND_URL = 'https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-5001.app.github.dev';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercettore per inserire automaticamente il token JWT di Keycloak in ogni chiamata
api.interceptors.request.use(
  (config) => {
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