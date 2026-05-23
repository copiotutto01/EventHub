import Keycloak from 'keycloak-js';

// Configurazione del client Keycloak per il Frontend
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: 'eventhub',
  clientId: 'eventhub-frontend', // Questo sarà il client ID che configureremo su Keycloak
};

const keycloak = new Keycloak(keycloakConfig);

export const initKeycloak = (onAuthenticatedCallback) => {
  keycloak
    .init({
      onLoad: 'check-sso', // Controlla se l'utente è già loggato in background senza forzare il login immediato
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256', // Standard di sicurezza moderno per applicazioni Single Page (SPA)
    })
    .then((authenticated) => {
      if (authenticated) {
        console.log('[KEYCLOAK] Utente autenticato con successo!');
      } else {
        console.log('[KEYCLOAK] Utente non autenticato.');
      }
      onAuthenticatedCallback();
    })
    .catch((err) => {
      console.error('[KEYCLOAK] Errore durante l'inizializzazione:', err);
      onAuthenticatedCallback();
    });
};

export default keycloak;