import Keycloak from 'keycloak-js';
import axios from 'axios';

const keycloakConfig = {
  url: 'https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-8080.app.github.dev', 
  realm: 'eventhub',
  clientId: 'eventhub-frontend',
};

const keycloak = new Keycloak(keycloakConfig);

export const initKeycloak = (onAuthenticatedCallback) => {
  keycloak
    .init({
      onLoad: 'check-sso',
      checkLoginIframe: false,             // 🌟 FONDAMENTALE: Disattiva l'iframe che va in timeout
      pkceMethod: 'S256',
      flow: 'standard',
      enableLogging: true
    })
    .then((authenticated) => {
      console.log('[KEYCLOAK] Inizializzato con successo. Autenticato:', authenticated);
      if (authenticated) {
        window.token = keycloak.token;
        window.authenticated = true;
        axios.defaults.headers.common['Authorization'] = `Bearer ${keycloak.token}`;
      } else {
        window.authenticated = false;
        delete axios.defaults.headers.common['Authorization'];
      }
      onAuthenticatedCallback();
    })
    .catch((err) => {
      console.error('[KEYCLOAK] Errore inizializzazione:', err);
      window.authenticated = false;
      onAuthenticatedCallback(); 
    });
};

axios.interceptors.request.use(
  async (config) => {
    if (keycloak.token) {
      try {
        await keycloak.updateToken(30);
        config.headers['Authorization'] = `Bearer ${keycloak.token}`;
        window.token = keycloak.token;
      } catch (error) {
        console.error('[KEYCLOAK] Errore aggiornamento token:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default keycloak;