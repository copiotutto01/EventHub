import React, { useEffect, useState } from 'react';
import keycloak from './auth/keycloak';
import { getEvents } from './services/eventService';
import './App.css';

function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aggiorna lo stato dell'utente basandoti sul token Keycloak
    if (window.authenticated && keycloak.tokenParsed) {
      setIsLogged(true);
      setUserData({
        name: keycloak.tokenParsed.preferred_username || 'Utente',
        id: keycloak.tokenParsed.sub
      });
    }

    // Recupera gli eventi dal backend Flask
    getEvents()
      .then((data) => {
        // Prendiamo l'array dentro la chiave 'events' impostata in Flask
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Impossibile caricare gli eventi:", err);
        setLoading(false);
      });
  }, []);

  const handleLogin = () => {
    keycloak.login();
  };

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <h1 className="logo">🎉 EventHub</h1>
        <div className="nav-auth">
          {isLogged ? (
            <>
              <span className="welcome-text">Ciao, <strong>{userData?.name}</strong></span>
              <button className="btn-logout" onClick={handleLogout}>Esci</button>
            </>
          ) : (
            <button className="btn-login" onClick={handleLogin}>Accedi / Registrati</button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="content">
        <header className="hero">
          <h2>Benvenuto su EventHub! 🚀</h2>
          <p>La piattaforma definitiva per scoprire, prenotare e organizzare eventi straordinari.</p>
        </header>

        {/* Banner Stato Autenticazione */}
        <section className="auth-status-section">
          {isLogged ? (
            <div className="alert alert-success">
              🟢 Sei connesso al sistema in modo sicuro tramite Keycloak!<br />
              <small>ID Utente: {userData?.id}</small>
            </div>
          ) : (
            <div className="alert alert-warning">
              🔴 Al momento sei un ospite anonimo. Clicca su "Accedi" in alto per sbloccare tutte le funzionalità.
            </div>
          )}
        </section>

        {/* Sezione Eventi */}
        <section className="events-section">
          <h3>📅 Eventi Disponibili</h3>
          {loading ? (
            <p className="loading">Caricamento eventi in corso...</p>
          ) : events.length === 0 ? (
            <p className="no-events">Al momento non ci sono eventi in programma. Torna a trovarci!</p>
          ) : (
            <div className="events-grid">
              {events.map((event) => (
                <div key={event.id} className="event-card">
                  <h4>{event.title}</h4>
                  <p className="description">{event.description}</p>
                  <div className="event-details">
                    <span>📍 {event.location}</span>
                    <span>📅 {new Date(event.date).toLocaleDateString('it-IT')}</span>
                    <span className="price">💰 {event.price === 0 ? 'Gratis' : `${event.price} €`}</span>
                  </div>
                  <div className="card-footer">
                    <span className="tickets">Biglietti rimasti: {event.available_tickets}</span>
                    {isLogged && <button className="btn-book">Prenota Ora</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;