import axios from 'axios';

// Forziamo l'URL sulla porta 5000, che è la porta esposta dal backend nel container
const BACKEND_URL = 'https://silver-space-meme-pj7rjj94jw5g39w66-5000.app.github.dev';

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