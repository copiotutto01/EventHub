import axios from 'axios';

// Forziamo l'URL sulla porta 5000 per evitare che Vite usi la porta 3000 del frontend
const BACKEND_URL = 'https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-5000.app.github.dev';

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