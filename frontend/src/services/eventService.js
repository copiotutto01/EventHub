import api from './api';
import keycloak from '../auth/keycloak';

// Recupera tutti gli eventi
export const getEvents = async () => {
  try {
    const response = await api.get('/api/events');
    return response.data;
  } catch (error) {
    console.error('Errore nel recupero degli eventi:', error);
    throw error;
  }
};

// Inizia la procedura di prenotazione / pagamento con Stripe Checkout
export const bookEvent = async (eventId) => {
  try {
    const token = keycloak.token;
    
    // Chiamata all'endpoint di checkout sulla porta 5000 gestita dall'istanza api
    const response = await api.post(`/api/events/${eventId}/checkout`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data; // Questo restituirà {requires_stripe: true, url: "..."} o i dati di registrazione diretta
  } catch (error) {
    console.error('Errore durante la prenotazione dell\'evento:', error);
    throw error;
  }
};

// Convalida l'iscrizione nel DB dopo che il pagamento Stripe è andato a buon fine
export const confirmPaymentAfterCheckout = async (eventId) => {
  try {
    const token = keycloak.token;
    const response = await api.post(`/api/events/${eventId}/confirm-payment`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Errore durante la conferma del pagamento:', error);
    throw error;
  }
};