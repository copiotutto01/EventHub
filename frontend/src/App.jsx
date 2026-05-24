import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import keycloak from './auth/keycloak';
import { getEvents, bookEvent } from './services/eventService';
import axios from 'axios';
import './App.css';

// URL aggiornato sulla porta 5001 funzionante
const FIXED_BACKEND_URL = 'https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-5001.app.github.dev';

// Funzione di supporto per generare un badge di categoria colorato ed estetico
const getCategoryStyle = (category) => {
  const cat = category ? category.toLowerCase() : 'generico';
  switch (cat) {
    case 'musica':
      return { backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' };
    case 'tecnologia':
      return { backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px solid #7dd3fc' };
    case 'cultura':
      return { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' };
    case 'fiere e festival':
    case 'festival':
      return { backgroundColor: '#faf5ff', color: '#7c3aed', border: '1px solid #d8b4fe' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' };
  }
};

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
  
  // Calcolo dinamico dello stato dei biglietti per l'indicatore visivo
  const tLeft = event.available_tickets !== undefined ? event.available_tickets : event.max_tickets;
  const statusColor = tLeft === 0 ? '#ef4444' : tLeft < 15 ? '#f59e0b' : '#10b981';

  return (
    <div className="event-card" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid rgba(0,0,0,0.05)',
      position: 'relative',
      transition: 'transform 0.2s, box-shadow 0.2s'
    }}>
      
      {/* Badge della Categoria e Stato Biglietti */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ 
          padding: '4px 10px', 
          borderRadius: '20px', 
          fontSize: '11px', 
          fontWeight: 'bold',
          textTransform: 'uppercase',
          ...getCategoryStyle(event.category)
        }}>
          {event.category || 'Generico'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor, display: 'inline-block' }}></span>
          {tLeft === 0 ? 'Esaurito' : tLeft < 15 ? 'Ultimi rimasti!' : 'Disponibile'}
        </div>
      </div>

      <h4 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: '700', color: 'inherit' }}>{event.title}</h4>
      
      <p className="description" style={{ margin: '0', fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.4', flexGrow: 1 }}>
        {event.description}
      </p>
      
      <div className="event-details" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px', 
        fontSize: '0.85rem', 
        backgroundColor: 'rgba(0,0,0,0.02)', 
        padding: '10px', 
        borderRadius: '8px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📍 <span>{event.location}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📅 <span>{new Date(event.date).toLocaleDateString()}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          💰 <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: event.price === 0 ? '#10b981' : 'inherit' }}>
            {event.price === 0 ? t('events.priceFree') : `${Number(event.price).toFixed(2)} €`}
          </span>
        </div>
      </div>

      <div className="card-footer" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '8px',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        paddingTop: '12px'
      }}>
        <span className="tickets" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
          🎫 {t('events.ticketsLeft', { count: tLeft })}
        </span>
        
        {isLogged && !isOrganizer && (
          myEvents.some(booked => booked.id === event.id) ? (
            <button className="btn-book" disabled style={{ 
              backgroundColor: '#e5e7eb', 
              color: '#9ca3af', 
              cursor: 'not-allowed',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}>
              {t('events.alreadyBooked')}
            </button>
          ) : (
            <button className="btn-book" onClick={() => handleBookEvent(event.id)} style={{
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
            }}>
              {t('events.bookNow')}
            </button>
          )
        )}

        {isOwner && (
          <button 
            className="btn-delete" 
            onClick={() => handleDeleteEvent(event.id)} 
            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 14px', cursor: 'pointer', borderRadius: '6px', fontWeight: '600', fontSize: '0.85rem' }}
          >
            {t('events.delete')}
          </button>
        )}
      </div>

      {/* Sezione Recensioni Abbellita */}
      <div className="reviews-section" style={{ marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px' }}>
        <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💬 {t('events.reviews')} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 'normal' }}>({reviews.length})</span>
        </h5>
        
        {reviews.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic', margin: '4px 0' }}>{t('events.noReviews')}</p>
        ) : (
          <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {reviews.map((rev) => (
              <div key={rev.id} className="review-item" style={{ 
                padding: '10px', 
                borderRadius: '8px', 
                fontSize: '0.8rem',
                backgroundColor: 'rgba(0,0,0,0.015)',
                border: '1px solid rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px' }}>
                  <span style={{ color: '#4f46e5' }}>@{rev.username || 'Utente'}</span>
                  <span style={{ letterSpacing: '1px' }}>{'⭐'.repeat(rev.rating)}</span>
                </div>
                <p style={{ margin: '0', color: '#4b5563', lineHeight: '1.3' }}>{rev.comment}</p>
              </div>
            ))}
          </div>
        )}

        {isLogged && !isOrganizer && (
          <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
            <select value={rating} onChange={(e) => setRating(e.target.value)} style={{ 
              padding: '6px', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db', 
              fontSize: '0.8rem',
              backgroundColor: '#fff'
            }}>
              <option value="5">⭐⭐⭐⭐⭐ (5)</option>
              <option value="4">⭐⭐⭐⭐ (4)</option>
              <option value="3">⭐⭐⭐ (3)</option>
              <option value="2">⭐⭐ (2)</option>
              <option value="1">⭐ (1)</option>
            </select>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="text" 
                placeholder={t('events.writeReview')} 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db' }} 
              />
              <button type="submit" style={{ 
                backgroundColor: '#10b981', 
                color: '#fff', 
                border: 'none', 
                padding: '0 14px', 
                cursor: 'pointer', 
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '0.8rem'
              }}>{t('events.sendReview')}</button>
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

  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '', price: '', available_tickets: '', category: 'Generico' });

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
          await axios.post(`${FIXED_BACKEND_URL}/api/events/${eventId}/confirm-payment`, {}, {
            headers: { Authorization: `Bearer ${keycloak.token}` }
          });
          alert("Pagamento ricevuto! Il tuo biglietto è stato registrato con successo.");
          window.history.replaceState({}, document.title, window.location.pathname);
          loadEvents();
          loadMyEvents();
        } catch (err) {
          console.error("Errore convalida pagamento:", err);
        }
      };
      
      if (keycloak.token) {
        verifyAndRegister();
      }
    } else if (paymentStatus === 'cancel') {
      alert("Pagamento annullato. Nessun biglietto è stato acquistato.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isLogged, events]);

  const handleBookEvent = async (eventId) => {
    try {
      const data = await bookEvent(eventId);
      if (data.requires_stripe && data.url) {
        window.location.href = data.url; 
      } else {
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
        category: newEvent.category
      };

      await axios.post(`${FIXED_BACKEND_URL}/api/events`, eventDataToSend, {
        headers: { 
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert(t('alerts.createSuccess') || "Evento pubblicato con successo!");
      setNewEvent({ title: '', description: '', date: '', location: '', price: '', available_tickets: '', category: 'Generico' });
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

  const isCurrentLanguage = (lang) => {
    return i18n.language && i18n.language.startsWith(lang);
  };

  return (
    <div className={`app-container ${theme}`}>
      <nav className="navbar">
        <h1 className="logo">{t('navbar.title')}</h1>
        <div className="nav-auth">
          <div className="lang-switcher" style={{ marginRight: '15px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={() => changeLanguage('it')} 
              style={{ 
                background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', 
                opacity: isCurrentLanguage('it') ? 1 : 0.4, 
                transform: isCurrentLanguage('it') ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.2s' 
              }}
              title="Italiano"
            >
              🇮🇹
            </button>
            
            <button 
              onClick={() => changeLanguage('en')} 
              style={{ 
                background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', 
                opacity: isCurrentLanguage('en') ? 1 : 0.4, 
                transform: isCurrentLanguage('en') ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.2s' 
              }}
              title="English"
            >
              🇬🇧
            </button>

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
        <div className="presentation-screen" style={{ textAlign: 'center', padding: '80px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🎟️</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '15px' }}>{t('hero.title')}</h2>
          <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '30px', lineHeight: '1.6' }}>{t('hero.description')}</p>
          <button 
            onClick={() => keycloak.login()} 
            style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '16px 45px', fontSize: '1.2rem', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 10px 20px rgba(79, 70, 229, 0.3)', transition: 'transform 0.2s' }}
          >
            {t('hero.cta')}
          </button>
        </div>
      ) : (
        <div className="main-layout">
          
          <div className="content-area">
            {isOrganizer && (
              <section className="organizer-panel" style={{ padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: '0', marginBottom: '15px' }}>✨ {t('organizer.panelTitle')}</h3>
                <form onSubmit={handleCreateEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <input type="text" placeholder={t('organizer.eventTitle')} value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  <input type="text" placeholder={t('organizer.location')} value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  <input type="number" min="0" step="0.01" placeholder={t('organizer.price')} value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  
                  {/* Selettore di categoria aggiunto nel form in modo pulito ed estetico */}
                  <select 
                    value={newEvent.category} 
                    onChange={e => setNewEvent({...newEvent, category: e.target.value})}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', gridColumn: 'span 2', backgroundColor: '#fff' }}
                  >
                    <option value="Generico">Generico</option>
                    <option value="Musica">Musica (Concerti, Festival Live)</option>
                    <option value="Tecnologia">Tecnologia (Workshop, Tech Talk)</option>
                    <option value="Cultura">Cultura (Teatro, Libri, Mostre)</option>
                    <option value="Fiere e Festival">Fiere e Festival (Comics, Esposizioni)</option>
                  </select>

                  <input type="number" min="1" placeholder={t('organizer.tickets')} value={newEvent.available_tickets} onChange={e => setNewEvent({...newEvent, available_tickets: e.target.value})} required style={{ gridColumn: 'span 2', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                  <textarea placeholder={t('organizer.description')} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} required style={{ gridColumn: 'span 2', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }}></textarea>
                  <button type="submit" style={{ gridColumn: 'span 2', backgroundColor: '#e67e22', color: 'white', cursor: 'pointer', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem' }}>{t('organizer.submit')}</button>
                </form>
              </section>
            )}

            <section className="events-section">
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🚀 {t('events.title')}
              </h3>
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
            <aside className="sidebar-tickets" style={{ padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: '0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                🎟️ {t('sidebar.title')}
              </h3>
              {myEvents.length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: '#9ca3af' }} className="no-tickets-text">{t('sidebar.noTickets')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myEvents.map(booked => (
                    <div key={booked.id} className="booked-event-item" style={{ 
                      padding: '12px', 
                      borderRadius: '8px', 
                      borderLeft: '4px solid #4f46e5',
                      backgroundColor: 'rgba(79, 70, 229, 0.03)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: '600' }}>{booked.title}</h4>
                      <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#4b5563' }}>📍 {booked.location}</p>
                      <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#4b5563' }}>📅 {new Date(booked.date).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          )}

        </div>
      )}
    </div>
  );
}

export default App;