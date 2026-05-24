import api from './api';
import axios from 'axios'; // 🌟 Importiamo l'axios standard
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

// Effettua la prenotazione forzando l'header pulito con Axios standard
export const bookEvent = async (eventId) => {
  try {
    const token = keycloak.token;
    
    // Costruiamo l'URL assoluto puntando direttamente al backend sulla porta 5000
    const url = `https://symmetrical-fishstick-4jxj6vp7qq5wc7wp-5000.app.github.dev/api/events/${eventId}/register`;

    const response = await axios.post(url, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Errore durante la prenotazione dell\'evento:', error);
    throw error;
  }
};