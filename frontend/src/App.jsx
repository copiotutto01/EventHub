import React, { useEffect, useState } from 'react';
import keycloak from './auth/keycloak';
import { getEvents, bookEvent } from './services/eventService';
import axios from 'axios';
import './App.css';

function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false); // 🌟 Stato per verificare se è un organizzatore
  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myEvents, setMyEvents] = useState([]);

  // Stati per il modulo di creazione nuovo evento
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    price: 0,
    available_tickets: 50
  });

  const loadEvents = () => {
    getEvents()
      .then((data) => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Impossibile caricare gli eventi:", err);
        setLoading(false);
      });
  };

  const loadMyEvents = async () => {
    if (!window.authenticated || !keycloak.token) return;
    try {
      const response = await axios.get('https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-5000.app.github.dev/api/users/me/events', {
        headers: { Authorization: `Bearer ${keycloak.token}` }
      });
      setMyEvents(response.data.registered_events || []);
    } catch (error) {
      console.error("Errore nel recupero dei miei eventi:", error);
    }
  };

  useEffect(() => {
    if (window.authenticated && keycloak.tokenParsed) {
      setIsLogged(true);
      setUserData({
        name: keycloak.tokenParsed.preferred_username || 'Utente',
        id: keycloak.tokenParsed.sub
      });

      // 🌟 Controllo Ruolo: Verifica se l'utente ha il ruolo 'organizer' nel client eventhub-backend
      const roles = keycloak.tokenParsed.resource_access?.['eventhub-backend']?.roles || [];
      if (roles.includes('organizer')) {
        setIsOrganizer(true);
      }

      loadMyEvents();
    }
    loadEvents();
  }, []);

  const handleBookEvent = async (eventId) => {
    try {
      await bookEvent(eventId);
      alert("🎉 Prenotazione completata con successo!");
      loadEvents();
      loadMyEvents();
    } catch (error) {
      alert("❌ Errore durante la prenotazione.");
    }
  };

  // 🌟 FUNZIONE: Gestisce l'invio del modulo per creare un nuovo evento sul backend
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-5000.app.github.dev/api/events', newEvent, {
        headers: { 
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        }
      });
      alert("🚀 Nuovo evento pubblicato con successo!");
      // Resetta il modulo e rinfresca la bacheca
      setNewEvent({ title: '', description: '', date: '', location: '', price: 0, available_tickets: 50 });
      loadEvents();
    } catch (error) {
      console.error("Errore creazione evento:", error);
      alert("❌ Impossibile creare l'evento. Controlla i permessi.");
    }
  };

  const handleLogin = () => keycloak.login();
  const handleLogout = () => keycloak.logout({ redirectUri: window.location.origin });

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <h1 className="logo">🎉 EventHub</h1>
        <div className="nav-auth">
          {isLogged ? (
            <>
              <span className="welcome-text">Ciao, <strong>{userData?.name}</strong> {isOrganizer && <span style={{fontSize: '11px', backgroundColor: '#e67e22', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px'}}>Organizzatore</span>}</span>
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

        {/* 🌟 NUOVO: Pannello di Creazione Eventi (Visibile SOLO agli Organizzatori connessi) */}
        {isLogged && isOrganizer && (
          <section className="organizer-panel" style={{ backgroundColor: '#fcf3cf', padding: '25px', borderRadius: '12px', border: '1px solid #f39c12', marginBottom: '4px' }}>
            <h3 style={{ color: '#d35400', marginTop: 0 }}>🛠️ Pannello di Gestione Organizzatore</h3>
            <p style={{ fontSize: '14px', color: '#7e5109' }}>Inserisci i dettagli qui sotto per pubblicare un nuovo evento in tempo reale sulla piattaforma.</p>
            
            <form onSubmit={handleCreateEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <input type="text" placeholder="Titolo Evento" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              <input type="text" placeholder="Luogo / Location" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              <input type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              <input type="number" placeholder="Prezzo (€)" value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: parseFloat(e.target.value)})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              <input type="number" placeholder="Biglietti Disponibili" value={newEvent.available_tickets} onChange={e => setNewEvent({...newEvent, available_tickets: parseInt(e.target.value)})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', gridColumn: 'span 2' }} />
              <textarea placeholder="Descrizione dell'evento..." value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', gridColumn: 'span 2', height: '80px' }}></textarea>
              <button type="submit" style={{ gridColumn: 'span 2', backgroundColor: '#e67e22', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Pubblica Evento Live 🚀</button>
            </form>
          </section>
        )}

        {/* Sezione Eventi */}
        <section className="events-section" style={{ marginTop: '30px' }}>
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
                    {isLogged && (
                      myEvents.some(booked => booked.id === event.id) ? (
                        <button className="btn-book" disabled style={{ backgroundColor: '#bdc3c7', color: '#7f8c8d', cursor: 'not-allowed', boxShadow: 'none' }}>
                          🎟️ Già Prenotato
                        </button>
                      ) : (
                        <button className="btn-book" onClick={() => handleBookEvent(event.id)}>
                          Prenota Ora
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sezione Biglietti */}
        {isLogged && (
          <section className="my-tickets-section" style={{ marginTop: '50px', paddingTop: '30px', borderTop: '2px dashed #ccc' }}>
            <h3>🎟️ I Miei Biglietti ({myEvents.length})</h3>
            {myEvents.length === 0 ? (
              <p style={{ color: '#777', fontStyle: 'italic' }}>Non hai ancora prenotato nessun evento.</p>
            ) : (
              <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                {myEvents.map((booked) => (
                  <div key={booked.id} style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '18px' }}>{booked.title}</h4>
                      <p style={{ margin: 0, fontSize: '14px', color: '#7f8c8d' }}>📍 {booked.location} &nbsp;|&nbsp; 📅 {new Date(booked.date).toLocaleDateString('it-IT')}</p>
                    </div>
                    <span style={{ backgroundColor: '#2ecc71', color: '#fff', padding: '6px 14px', borderRadius: '50px', fontSize: '13px', fontWeight: 'bold' }}>✓ Confermato</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;