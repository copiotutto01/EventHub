import React from 'react';
import keycloak from '../auth/keycloak';

const Navbar = () => {
  return (
    <nav style={styles.navbar}>
      <div style={styles.logo}>🎉 EventHub</div>
      <div style={styles.menu}>
        {/* Se l'utente NON è autenticato, mostriamo il tasto Accedi */}
        {!keycloak.authenticated && (
          <button style={styles.loginBtn} onClick={() => keycloak.login()}>
            Accedi / Registrati
          </button>
        )}

        {/* Se l'utente È autenticato, mostriamo il suo nome e il tasto Esci */}
        {keycloak.authenticated && (
          <div style={styles.userInfo}>
            <span style={styles.username}>
              Ciao, <strong>{keycloak.tokenParsed?.preferred_username}</strong>
            </span>
            <button style={styles.logoutBtn} onClick={() => keycloak.logout({ redirectUri: window.location.origin })}>
              Esci
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    letterSpacing: '1px'
  },
  menu: {
    display: 'flex',
    alignItems: 'center'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  username: {
    fontSize: '1rem',
    color: '#e0e0e0'
  },
  loginBtn: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background 0.2s'
  },
  logoutBtn: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background 0.2s'
  }
};

export default Navbar;