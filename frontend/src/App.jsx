import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import keycloak from './auth/keycloak';
import { getEvents, bookEvent } from './services/eventService';
import axios from 'axios';
import './App.css';

// URL aggiornato sulla porta 5000, che è la porta esposta dal backend nel container
const FIXED_BACKEND_URL = 'https://silver-space-meme-pj7rjj94jw5g39w66-5000.app.github.dev/';

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

function EventCard({ event, isLogged, isOrganizer, myEvents, handleBookEvent, handleDeleteEvent, token }) {
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
    <div className="event-card">
      
      {/* Badge della Categoria e Stato Biglietti */}
      <div className="badge-container">
        <span className="category-badge" style={getCategoryStyle(event.category)}>
          {event.category || t('organizer.categoryGeneric')}
        </span>
        <div className="status-indicator">
          <span className="status-dot" style={{ backgroundColor: statusColor }}></span>
          {tLeft === 0 ? t('events.soldOut') : tLeft < 15 ? t('events.limitedTickets') : t('events.available')}
        </div>
      </div>

      <h4>{event.title}</h4>
      
      <p className="description">{event.description}</p>
      
      <div className="event-details">
        <span>📍 {event.location}</span>
        <span>📅 {new Date(event.date).toLocaleDateString()}</span>
        <span style={{ marginTop: '4px' }}>
          💰 <span className="price">
            {event.price === 0 ? t('events.priceFree') : `${Number(event.price).toFixed(2)} €`}
          </span>
        </span>
      </div>

      <div className="card-footer">
        <span className="tickets" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
          🎫 {t('events.ticketsLeft', { count: tLeft })}
        </span>
        
        {isLogged && !isOrganizer && (
          myEvents.some(booked => booked.id === event.id) ? (
            <button className="btn-book" disabled>
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
          >
            {t('events.delete')}
          </button>
        )}
      </div>

      {/* Sezione Recensioni */}
      <div className="reviews-section">
        <h5>
          💬 {t('events.reviews')} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 'normal' }}>({reviews.length})</span>
        </h5>
        
        {reviews.length === 0 ? (
          <p className="no-reviews-text">{t('events.noReviews')}</p>
        ) : (
          <div className="reviews-list">
            {reviews.map((rev) => (
              <div key={rev.id} className="review-item">
                <div className="review-item-header">
                  <span className="review-username">@{rev.username || 'Utente'}</span>
                  <span className="review-rating">{'⭐'.repeat(rev.rating)}</span>
                </div>
                <p className="review-comment">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}

        {isLogged && !isOrganizer && (
          <form onSubmit={handleAddReview} className="review-form">
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="5">⭐⭐⭐⭐⭐ (5)</option>
              <option value="4">⭐⭐⭐⭐ (4)</option>
              <option value="3">⭐⭐⭐ (3)</option>
              <option value="2">⭐⭐ (2)</option>
              <option value="1">⭐ (1)</option>
            </select>
            <div className="review-form-group">
              <input 
                type="text" 
                placeholder={t('events.writeReview')} 
                value={comment} 
                onChange={(e) => setComment(e.target.value)}
              />
              <button type="submit">{t('events.sendReview')}</button>
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

  if (!keycloak.token) return;

  if (paymentStatus === 'success' && eventId) {
    axios.post(`${FIXED_BACKEND_URL}/api/events/${eventId}/confirm-payment`, {}, {
      headers: { Authorization: `Bearer ${keycloak.token}` }
    }).then(() => {
      alert(t('alerts.paymentSuccess'));
      window.history.replaceState({}, document.title, window.location.pathname);
      loadEvents();
      loadMyEvents();
    }).catch(console.error);
  }

  if (paymentStatus === 'cancel') {
    alert(t('alerts.paymentCancelled'));
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, [isLogged]);

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
              onClick={() => changeLanguage('fr')} 
              style={{ 
                background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', 
                opacity: isCurrentLanguage('fr') ? 1 : 0.4, 
                transform: isCurrentLanguage('fr') ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.2s' 
              }}
              title="Français"
            >
              🇫🇷
            </button>

            <button 
              onClick={() => changeLanguage('de')} 
              style={{ 
                background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', 
                opacity: isCurrentLanguage('de') ? 1 : 0.4, 
                transform: isCurrentLanguage('de') ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.2s' 
              }}
              title="Deutsch"
            >
              🇩🇪
            </button>

            <button 
              onClick={() => changeLanguage('es')} 
              style={{ 
                background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer', 
                opacity: isCurrentLanguage('es') ? 1 : 0.4, 
                transform: isCurrentLanguage('es') ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.2s' 
              }}
              title="Español"
            >
              🇪🇸
            </button>

            <button 
              onClick={toggleTheme}
              className="theme-toggle-btn"
              style={{
                background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer',
                marginLeft: '10px', padding: '4px', transition: 'transform 0.2s'
              }}
              title={theme === 'light' ? t('theme.toggleDark') : t('theme.toggleLight')}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>

          {isLogged ? (
            <>
              <span className="welcome-text">
                {t('navbar.welcome', { name: userData?.name })} {' '}
                {isOrganizer && <span style={{fontSize: '11px', backgroundColor: '#7c3aed', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontWeight: '600'}}>{t('navbar.organizerBadge')}</span>}
              </span>
              <button className="btn-logout" onClick={() => keycloak.logout({ redirectUri: window.location.origin })}>{t('navbar.logout')}</button>
            </>
          ) : (
            <button className="btn-login" onClick={() => keycloak.login()}>{t('navbar.login')}</button>
          )}
        </div>
      </nav>

      {!isLogged ? (
        <div className="presentation-screen">
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🎟️</div>
          <h2>{t('hero.title')}</h2>
          <p>{t('hero.description')}</p>
          <button onClick={() => keycloak.login()}>
            {t('hero.cta')}
          </button>
        </div>
      ) : (
        <div className="main-layout">
          
          <div className="content-area">
            {isOrganizer && (
              <section className="organizer-panel">
                <h3>✨ {t('organizer.panelTitle')}</h3>
                <form onSubmit={handleCreateEvent}>
                  <input type="text" placeholder={t('organizer.eventTitle')} value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required />
                  <input type="text" placeholder={t('organizer.location')} value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} required />
                  <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
                  <input type="number" min="0" step="0.01" placeholder={t('organizer.price')} value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: e.target.value})} required />
                  
                  <select 
                    value={newEvent.category} 
                    onChange={e => setNewEvent({...newEvent, category: e.target.value})}
                  >
                    <option value="Generico">Generico</option>
                    <option value="Musica">Musica (Concerti, Festival Live)</option>
                    <option value="Tecnologia">Tecnologia (Workshop, Tech Talk)</option>
                    <option value="Cultura">Cultura (Teatro, Libri, Mostre)</option>
                    <option value="Fiere e Festival">Fiere e Festival (Comics, Esposizioni)</option>
                  </select>

                  <input type="number" min="1" placeholder={t('organizer.tickets')} value={newEvent.available_tickets} onChange={e => setNewEvent({...newEvent, available_tickets: e.target.value})} required />
                  <textarea placeholder={t('organizer.description')} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} required></textarea>
                  <button type="submit">{t('organizer.submit')}</button>
                </form>
              </section>
            )}

            <section className="events-section">
              <h3>
                🚀 {t('events.title')}
              </h3>
              {loading ? <p className="loading-text">{t('events.loading')}</p> : (
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
              <h3>
                🎟️ {t('sidebar.title')}
              </h3>
              {myEvents.length === 0 ? (
                <p className="no-tickets-text">{t('sidebar.noTickets')}</p>
              ) : (
                <div className="tickets-list">
                  {myEvents.map(booked => (
                    <div key={booked.id} className="booked-event-item">
                      <h4>{booked.title}</h4>
                      <p>📍 {booked.location}</p>
                      <p>📅 {new Date(booked.date).toLocaleDateString()}</p>
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