import api from './api';

export const getEvents = async () => {
  try {
    const response = await api.get('/api/events'); // Assicurati che l'endpoint sul backend sia questo
    return response.data;
  } catch (error) {
    console.error('Errore nel recupero degli eventi:', error);
    throw error;
  }
};