import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: 'https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-8080.app.github.dev', 
  realm: 'eventhub',
  clientId: 'eventhub-frontend',
};

const keycloak = new Keycloak(keycloakConfig);

export const initKeycloak = (onAuthenticatedCallback) => {
  keycloak
    .init({
      // Usiamo 'on-load' standard senza sso silente per evitare blocchi sui cookie di terze parti
      onLoad: 'check-sso',
      checkLoginIframe: false,
      pkceMethod: 'S256',
      flow: 'standard'
    })
    .then((authenticated) => {
      console.log('[KEYCLOAK] Risultato inizializzazione. Autenticato:', authenticated);
      
      if (authenticated) {
        console.log('[KEYCLOAK] Token valido ottenuto:', keycloak.token);
        // Memorizziamo il token a livello globale per renderlo accessibile ad Axios
        window.token = keycloak.token;
        window.authenticated = true;
      } else {
        console.warn('[KEYCLOAK] Inizializzato ma l\'utente non è autenticato.');
        window.authenticated = false;
      }
      onAuthenticatedCallback();
    })
    .catch((err) => {
      console.error('[KEYCLOAK] Errore critico di inizializzazione:', err);
      window.authenticated = false;
      onAuthenticatedCallback(); 
    });
};

export default keycloak;