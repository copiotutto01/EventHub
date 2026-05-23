import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initKeycloak } from './auth/keycloak.js'

const root = ReactDOM.createRoot(document.getElementById('root'));

// Inizializziamo Keycloak e renderizziamo l'app solo quando il controllo della sessione è terminato
initKeycloak(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
});