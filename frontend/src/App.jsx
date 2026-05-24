import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import keycloak from './auth/keycloak';
import { getEvents, bookEvent } from './services/eventService';
import axios from 'axios';
import './App.css';

// URL aggiornato sulla porta 5001 funzionante
const FIXED_BACKEND_URL = 'https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-5001.app.github.dev';

function EventCard({ event, isLogged, isOrganizer, userData, myEvents, handleBookEvent, handleDeleteEvent, token }) {
  const { t } = useTranslation();
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
    if (!comment.trim()) return alert(t('events.writeReview'));

    try {
      await axios.post(
        `${FIXED_BACKEND_URL}/api/events/${event.id}/reviews`,
        { rating: parseInt(rating), comment: comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(t('events.reviewSuccess'));
      setComment('');
      setRating(5);
      loadReviews();
    } catch (error) {
      console.error("Errore recensione:", error);
      alert(t('events.reviewError'));
    }
  };

  const isOwner = isOrganizer;

  return (
    <div className="event-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h4>{event.title}</h4>
      <p className="description">{event.description}</p>
      <div className="event-details">
        <span>📍 {event.location}</span>
        <span>📅 {new Date(event.date).toLocaleDateString()}</span>
        <span className="price">💰 {event.price === 0 ? t('events.priceFree') : `${event.price} €`}</span>
      </div>
      <div className="card-footer">
        <span className="tickets">{t('events.ticketsLeft', { count: event.available_tickets })}</span>
        
        {isLogged && !isOrganizer && (
          myEvents.some(booked => booked.id === event.id) ? (
            <button className="btn-book" disabled style={{ backgroundColor: '#bdc3c7', color: '#7f8c8d', cursor: 'not-allowed' }}>
              {t('events.alreadyBooked')}
            </button>
          ) : (
            <button className="btn-book" onClick={() => handleBookEvent(event.id)}>
              {t('events.bookNow')}
            </button>
          )
        )}

        {isOwner && (
          <button 
            className="btn-delete" 
            onClick={() => handleDeleteEvent(event.id)} 
            style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '4px' }}
          >
            {t('events.delete')}
          </button>
        )}
      </div>

      <div className="reviews-section" style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <h5 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{t('events.reviews')}</h5>
        {reviews.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#95a5a6', fontStyle: 'italic' }}>{t('events.noReviews')}</p>
        ) : (
          <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {reviews.map((rev) => (
              <div key={rev.id} className="review-item" style={{ padding: '8px', borderRadius: '6px', fontSize: '12px' }}>
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
              <input type="text" placeholder={t('events.writeReview')} value={comment} onChange={(e) => setComment(e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '12px' }} />
              <button type="submit" style={{ backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '6px', cursor: 'pointer' }}>{t('events.sendReview')}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function App() {
  const { t, i18n } = useTranslation();
  const [isLogged, setIsLogged] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myEvents, setMyEvents] = useState([]);
  
  // Gestione dello stato del Tema (Scuro / Chiaro)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '', price: '', available_tickets: '' });

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Switch del tema chiaro/scuro
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Effetto per salvare la scelta del tema e impostare la classe sull'elemento root
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

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

  // 🌟 INTERCETTAZIONE RITORNO DA STRIPE DOPO PAGAMENTO
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paymentStatus = query.get('payment_status');
    const eventId = query.get('event_id');

    if (paymentStatus === 'success' && eventId) {
      const verifyAndRegister = async () => {
        try {
          // Chiamiamo il backend per dirgli di convalidare l'acquisto nel database
          await axios.post(`${FIXED_BACKEND_URL}/api/events/${eventId}/confirm-payment`, {}, {
            headers: { Authorization: `Bearer ${keycloak.token}` }
          });
          alert("Pagamento ricevuto! Il tuo biglietto è stato registrato con successo.");
          // Pulisce i parametri dall'indirizzo URL del browser
          window.history.replaceState({}, document.title, window.location.pathname);
          loadEvents();
          loadMyEvents();
        } catch (err) {
          console.error("Errore convalida pagamento:", err);
        }
      };
      
      // Esegui la convalida solo se il token Keycloak è pronto ed autenticato
      if (keycloak.token) {
        verifyAndRegister();
      }
    } else if (paymentStatus === 'cancel') {
      alert("Pagamento annullato. Nessun biglietto è stato acquistato.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isLogged, events]); // Monitora lo stato di login e il caricamento eventi

  // 🌟 PRENOTAZIONE AGGIORNATA CON REINDIRIZZAMENTO DIRETTO A STRIPE CHECKOUT
  const handleBookEvent = async (eventId) => {
    try {
      const data = await bookEvent(eventId);
      
      // Se l'evento richiede Stripe, andiamo sulla pagina di pagamento sicura
      if (data.requires_stripe && data.url) {
        window.location.href = data.url; 
      } else {
        // Se l'evento era gratuito (0€), il backend lo ha salvato direttamente
        alert(t('alerts.bookSuccess'));
        loadEvents();
        loadMyEvents();
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || t('alerts.bookError');
      alert(errMsg);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const parsedPrice = parseFloat(newEvent.price);
      const parsedTickets = parseInt(newEvent.available_tickets, 10);
      const ticketsValue = isNaN(parsedTickets) ? 50 : parsedTickets;

      const eventDataToSend = {
        title: newEvent.title.trim(),
        location: newEvent.location.trim(),
        date: newEvent.date,
        price: isNaN(parsedPrice) ? 0.0 : parsedPrice,
        max_tickets: ticketsValue,
        total_tickets: ticketsValue,
        description: newEvent.description.trim(),
        category: 'Generico'
      };

      console.log("=== DEBUG PAYLOAD EVENTO ===", eventDataToSend);

      await axios.post(`${FIXED_BACKEND_URL}/api/events`, eventDataToSend, {
        headers: { 
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert(t('alerts.createSuccess') || "Evento pubblicato con successo!");
      setNewEvent({ title: '', description: '', date: '', location: '', price: '', available_tickets: '' });
      loadEvents();
    } catch (error) {
      console.error("Errore creazione evento:", error);
      const serverMessage = error.response?.data?.message || "Errore durante la creazione dell'evento.";
      alert(serverMessage);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm(t('alerts.confirmDelete'))) return;
    try {
      await axios.delete(`${FIXED_BACKEND_URL}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${keycloak.token}` }
      });
      alert(t('alerts.deleteSuccess'));
      loadEvents();
    } catch (error) {
      console.error("Errore durante l'eliminazione:", error);
      alert(t('alerts.deleteError'));
    }
  };

  // Funzione di supporto per verificare in modo sicuro la lingua corrente (gestisce anche i formati 'it-IT', 'en-US')
  const isCurrentLanguage = (lang) => {
    return i18n.language && i18n.language.startsWith(lang);
  };

  return (
    <div className={`app-container ${theme}`}>
      <nav className="navbar">
        <h1 className="logo">{t('navbar.title')}</h1>
        <div className="nav-auth">
          <div className="lang-switcher" style={{ marginRight: '15px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* 🇮🇹 Bandiera Italiana Forzata */}
            <button 
              onClick={() => changeLanguage('it')} 
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '1.6rem', 
                cursor: 'pointer', 
                opacity: isCurrentLanguage('it') ? 1 : 0.4, 
                transform: isCurrentLanguage('it') ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.2s' 
              }}
              title="Italiano"
            >
              🇮🇹
            </button>
            
            {/* 🇬🇧 Bandiera Inglese Forzata */}
            <button 
              onClick={() => changeLanguage('en')} 
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '1.6rem', 
                cursor: 'pointer', 
                opacity: isCurrentLanguage('en') ? 1 : 0.4, 
                transform: isCurrentLanguage('en') ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.2s' 
              }}
              title="English"
            >
              🇬🇧
            </button>

            {/* Bottone selettore Dark/Light Mode */}
            <button 
              onClick={toggleTheme}
              className="theme-toggle-btn"
              style={{
                background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer',
                marginLeft: '10px', padding: '4px', transition: 'transform 0.2s'
              }}
              title={theme === 'light' ? 'Attiva Dark Mode' : 'Attiva Light Mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>

          {isLogged ? (
            <>
              <span className="welcome-text">
                {t('navbar.welcome', { name: userData?.name })} {' '}
                {isOrganizer && <span style={{fontSize: '11px', backgroundColor: '#e67e22', color: '#fff', padding: '2px 6px', borderRadius: '4px'}}>{t('navbar.organizerBadge')}</span>}
              </span>
              <button className="btn-logout" onClick={() => keycloak.logout({ redirectUri: window.location.origin })}>{t('navbar.logout')}</button>
            </>
          ) : (
            <button className="btn-login" onClick={() => keycloak.login()}>{t('navbar.login')}</button>
          )}
        </div>
      </nav>

      {!isLogged ? (
        <div className="presentation-screen" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <h2>{t('hero.title')}</h2>
          <p>{t('hero.description')}</p>
          <button 
            onClick={() => keycloak.login()} 
            style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '15px 40px', fontSize: '1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}
          >
            {t('hero.cta')}
          </button>
        </div>
      ) : (
        <div className="main-layout">
          
          <div className="content-area">
            {isOrganizer && (
              <section className="organizer-panel">
                <h3>{t('organizer.panelTitle')}</h3>
                <form onSubmit={handleCreateEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <input type="text" placeholder={t('organizer.eventTitle')} value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required />
                  <input type="text" placeholder={t('organizer.location')} value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} required />
                  <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
                  <input type="number" min="0" step="0.01" placeholder={t('organizer.price')} value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: e.target.value})} required />
                  <input type="number" min="1" placeholder={t('organizer.tickets')} value={newEvent.available_tickets} onChange={e => setNewEvent({...newEvent, available_tickets: e.target.value})} required style={{ gridColumn: 'span 2' }} />
                  <textarea placeholder={t('organizer.description')} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} required style={{ gridColumn: 'span 2', height: '80px' }}></textarea>
                  <button type="submit" style={{ gridColumn: 'span 2', backgroundColor: '#e67e22', color: 'white', cursor: 'pointer', padding: '10px' }}>{t('organizer.submit')}</button>
                </form>
              </section>
            )}

            <section className="events-section">
              <h3>{t('events.title')}</h3>
              {loading ? <p>{t('events.loading')}</p> : (
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
              <h3>{t('sidebar.title')}</h3>
              {myEvents.length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.95rem' }} className="no-tickets-text">{t('sidebar.noTickets')}</p>
              ) : (
                myEvents.map(booked => (
                  <div key={booked.id} className="booked-event-item">
                    <h4>{booked.title}</h4>
                    <p>📍 {booked.location}</p>
                    <p>📅 {new Date(booked.date).toLocaleDateString()}</p>
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