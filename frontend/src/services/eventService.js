import api from './api';
import axios from 'axios'; 
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

// Effettua la prenotazione sulla porta corretta (5001) tramite istanza condivisa
export const bookEvent = async (eventId) => {
  try {
    const token = keycloak.token;
    
    // Utilizziamo l'istanza 'api' preconfigurata così eredita automaticamente la porta 5001 corretta
    const response = await api.post(`/api/events/${eventId}/register`, {}, {
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