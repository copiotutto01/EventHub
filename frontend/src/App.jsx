import React, { useEffect, useState } from 'react';
import keycloak from './auth/keycloak';
import { getEvents, bookEvent } from './services/eventService';
import axios from 'axios';
import './App.css';

// URL aggiornato sulla porta 5001 funzionante
const FIXED_BACKEND_URL = 'https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-5001.app.github.dev';

function EventCard({ event, isLogged, isOrganizer, userData, myEvents, handleBookEvent, handleDeleteEvent, token }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const loadReviews = async () => {
    try {
      const response = await axios.get(`${FIXED_BACKEND_URL}/api/events/${event.id}/reviews`);
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error(`Errore recensioni evento ${event.id}:`, error);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [event.id]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return alert("Inserisci un commento!");

    try {
      await axios.post(
        `${FIXED_BACKEND_URL}/api/events/${event.id}/reviews`,
        { rating: parseInt(rating), comment: comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("⭐ Recensione aggiunta!");
      setComment('');
      setRating(5);
      loadReviews();
    } catch (error) {
      console.error("Errore recensione:", error);
      alert("❌ Impossibile aggiungere la recensione.");
    }
  };

  // FORZATURA: Se sei organizzatore, vedi il tasto elimina su qualunque evento per fare pulizia
  const isOwner = isOrganizer;

  return (
    <div className="event-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h4>{event.title}</h4>
      <p className="description">{event.description}</p>
      <div className="event-details">
        <span>📍 {event.location}</span>
        <span>📅 {new Date(event.date).toLocaleDateString('it-IT')}</span>
        <span className="price">💰 {event.price === 0 ? 'Gratis' : `${event.price} €`}</span>
      </div>
      <div className="card-footer">
        <span className="tickets">Biglietti: {event.available_tickets}</span>
        
        {isLogged && !isOrganizer && (
          myEvents.some(booked => booked.id === event.id) ? (
            <button className="btn-book" disabled style={{ backgroundColor: '#bdc3c7', color: '#7f8c8d', cursor: 'not-allowed' }}>
              🎟️ Già Prenotato
            </button>
          ) : (
            <button className="btn-book" onClick={() => handleBookEvent(event.id)}>
              Prenota Ora
            </button>
          )
        )}

        {isOwner && (
          <button 
            className="btn-delete" 
            onClick={() => handleDeleteEvent(event.id)} 
            style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '4px' }}
          >
            🗑️ Elimina Evento
          </button>
        )}
      </div>

      <div className="reviews-section" style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <h5 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>⭐ Recensioni</h5>
        {reviews.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#95a5a6', fontStyle: 'italic' }}>Nessuna recensione.</p>
        ) : (
          <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {reviews.map((rev) => (
              <div key={rev.id} style={{ backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>@{rev.username || 'Utente'}</span>
                  <span style={{ color: '#f1c40f' }}>{'⭐'.repeat(rev.rating)}</span>
                </div>
                <p style={{ margin: '3px 0 0 0' }}>{rev.comment}</p>
              </div>
            ))}
          </div>
        )}

        {isLogged && !isOrganizer && (
          <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
            <select value={rating} onChange={(e) => setRating(e.target.value)} style={{ padding: '3px' }}>
              <option value="5">⭐⭐⭐⭐⭐ (5)</option>
              <option value="4">⭐⭐⭐⭐ (4)</option>
              <option value="3">⭐⭐⭐ (3)</option>
              <option value="2">⭐⭐ (2)</option>
              <option value="1">⭐ (1)</option>
            </select>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="text" placeholder="Scrivi un commento..." value={comment} onChange={(e) => setComment(e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '12px' }} />
              <button type="submit" style={{ backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '6px', cursor: 'pointer' }}>Invia</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myEvents, setMyEvents] = useState([]);

  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '', price: 0, available_tickets: 50 });

  const loadEvents = () => {
    getEvents()
      .then((data) => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore caricamento eventi:", err);
        setLoading(false);
      });
  };

  const loadMyEvents = async () => {
    if (!keycloak.token) return;
    try {
      const response = await axios.get(`${FIXED_BACKEND_URL}/api/users/me/events`, {
        headers: { Authorization: `Bearer ${keycloak.token}` }
      });
      setMyEvents(response.data.registered_events || []);
    } catch (error) {
      console.error("Errore biglietti utente:", error);
    }
  };

  useEffect(() => {
    if (window.authenticated || keycloak.authenticated) {
      setIsLogged(true);
      setUserData({
        name: keycloak.tokenParsed?.preferred_username || 'Utente',
        id: keycloak.tokenParsed?.sub
      });

      const clientRoles = keycloak.tokenParsed?.resource_access?.['eventhub-frontend']?.roles || [];
      const realmRoles = keycloak.tokenParsed?.realm_access?.roles || [];
      if (clientRoles.includes('organizer') || realmRoles.includes('organizer')) {
        setIsOrganizer(true);
      }

      loadMyEvents();
    }
    loadEvents();
  }, []);

  const handleBookEvent = async (eventId) => {
    try {
      await bookEvent(eventId);
      alert("🎉 Prenotazione completata!");
      loadEvents();
      loadMyEvents();
    } catch (error) {
      alert("❌ Errore durante la prenotazione.");
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${FIXED_BACKEND_URL}/api/events`, newEvent, {
        headers: { 
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        }
      });
      alert("🚀 Evento pubblicato!");
      setNewEvent({ title: '', description: '', date: '', location: '', price: 0, available_tickets: 50 });
      loadEvents();
    } catch (error) {
      console.error("Errore creazione evento:", error);
      if (error.response && error.response.data && error.response.data.message) {
        alert(`❌ Errore: ${error.response.data.message}`);
      } else {
        alert("❌ Errore permessi. Assicurati che l'utente abbia il ruolo 'organizer' su Keycloak.");
      }
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo evento definitivamente?")) return;
    try {
      await axios.delete(`${FIXED_BACKEND_URL}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${keycloak.token}` }
      });
      alert("🗑️ Evento eliminato con successo!");
      loadEvents();
    } catch (error) {
      console.error("Errore durante l'eliminazione:", error);
      alert("❌ Impossibile eliminare l'evento.");
    }
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <h1 className="logo">🎉 EventHub</h1>
        <div className="nav-auth">
          {isLogged ? (
            <>
              <span className="welcome-text">Ciao, <strong>{userData?.name}</strong> {isOrganizer && <span style={{fontSize: '11px', backgroundColor: '#e67e22', color: '#fff', padding: '2px 6px', borderRadius: '4px'}}>Organizzatore</span>}</span>
              <button className="btn-logout" onClick={() => keycloak.logout({ redirectUri: window.location.origin })}>Esci</button>
            </>
          ) : (
            <button className="btn-login" onClick={() => keycloak.login()}>Accedi / Registrati</button>
          )}
        </div>
      </nav>

      {/* Controllo condizionale principale */}
      {!isLogged ? (
        <div className="presentation-screen" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <h2>Scopri e Gestisci i Migliori Eventi Live 🚀</h2>
          <p>
            Benvenuto su <strong>EventHub</strong>! Se sei un appassionato, effettua l'accesso per prenotare i tuoi biglietti e recensire le tue esperienze. Se sei un organizzatore, gestisci e pubblica i tuoi eventi live in pochi clic.
          </p>
          <button 
            onClick={() => keycloak.login()} 
            style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '15px 40px', fontSize: '1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)' }}
          >
            Inizia Ora • Accedi o Registrati 🎟️
          </button>
        </div>
      ) : (
        <div className="main-layout">
          
          <div className="content-area">
            {isOrganizer && (
              <section className="organizer-panel" style={{ backgroundColor: '#fcf3cf', padding: '25px', borderRadius: '12px', border: '1px solid #f39c12' }}>
                <h3>🛠️ Pannello Organizzatore</h3>
                <form onSubmit={handleCreateEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <input type="text" placeholder="Titolo Evento" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required />
                  <input type="text" placeholder="Luogo" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} required />
                  <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
                  <input type="number" min="0" step="0.01" placeholder="Prezzo" value={newEvent.price || ''} onChange={e => setNewEvent({...newEvent, price: parseFloat(e.target.value) || 0})} required   />
                  <input type="number" min="1" placeholder="Biglietti" value={newEvent.available_tickets || ''} onChange={e => setNewEvent({...newEvent, available_tickets: parseInt(e.target.value) || 50})} required style={{ gridColumn: 'span 2' }} />
                  <textarea placeholder="Descrizione..." value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} required style={{ gridColumn: 'span 2', height: '80px' }}></textarea>
                  <button type="submit" style={{ gridColumn: 'span 2', backgroundColor: '#e67e22', color: 'white', cursor: 'pointer', padding: '10px' }}>Pubblica Evento Live 🚀</button>
                </form>
              </section>
            )}

            <section className="events-section">
              <h3>📅 Eventi Disponibili</h3>
              {loading ? <p>Caricamento...</p> : (
                <div className="events-grid">
                  {events.map(ev => (
                    <EventCard 
                      key={ev.id} 
                      event={ev} 
                      isLogged={isLogged} 
                      isOrganizer={isOrganizer}
                      userData={userData}
                      myEvents={myEvents} 
                      handleBookEvent={handleBookEvent} 
                      handleDeleteEvent={handleDeleteEvent}
                      token={keycloak.token} 
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {!isOrganizer && (
            <aside className="sidebar-tickets">
              <h3>🎟️ I Tuoi Biglietti</h3>
              {myEvents.length === 0 ? (
                <p style={{ color: '#7f8c8d', fontStyle: 'italic', fontSize: '0.95rem' }}>Non hai ancora prenotato nessun evento.</p>
              ) : (
                myEvents.map(booked => (
                  <div key={booked.id} className="booked-event-item">
                    <h4>{booked.title}</h4>
                    <p>📍 {booked.location}</p>
                    <p>📅 {new Date(booked.date).toLocaleDateString('it-IT')}</p>
                  </div>
                ))
              )}
            </aside>
          )}

        </div>
      )}
    </div>
  );
}

export default App;