import React from 'react';
import Navbar from './components/Navbar';
import keycloak from './auth/keycloak';

function App() {
  return (
    <div style={styles.container}>
      {/* Barra di Navigazione superiore */}
      <Navbar />
      
      {/* Contenuto Principale della Pagina */}
      <main style={styles.mainContent}>
        <div style={styles.card}>
          <h1>Benvenuto su EventHub! 🚀</h1>
          <p>La piattaforma definitiva per scoprire, prenotare e organizzare eventi straordinari.</p>
          
          {keycloak.authenticated ? (
            <div style={styles.statusSuccess}>
              <p>🟢 Sei connesso al sistema in modo sicuro tramite Keycloak!</p>
              <p style={{ fontSize: '0.9rem', color: '#666' }}>
                ID Utente: {keycloak.tokenParsed?.sub}
              </p>
            </div>
          ) : (
            <div style={styles.statusWarning}>
              <p>🔴 Al momento sei un ospite anonimo. Clicca su "Accedi" in alto per sbloccare tutte le funzionalità.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    backgroundColor: '#f4f6f9',
    minHeight: '100vh',
    margin: 0
  },
  mainContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem 1rem'
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '2.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    textAlign: 'center',
    maxWidth: '600px',
    width: '100%'
  },
  statusSuccess: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '1rem',
    borderRadius: '6px',
    marginTop: '1.5rem',
    border: '1px solid #c3e6cb'
  },
  statusWarning: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '1rem',
    borderRadius: '6px',
    marginTop: '1.5rem',
    border: '1px solid #ffeeba'
  }
};

export default App;