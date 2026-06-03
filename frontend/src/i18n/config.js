import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import itTranslation from './it.json';
import enTranslation from './en.json';
import frTranslation from './fr.json';
import deTranslation from './de.json';
import esTranslation from './es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      it: itTranslation,
      en: enTranslation,
      fr: frTranslation,
      de: deTranslation,
      es: esTranslation,
    },
    lng: 'it', // Lingua di partenza predefinita
    fallbackLng: 'it', // Lingua di riserva se qualcosa va storto
    interpolation: {
      escapeValue: false, // React protegge già da XSS di suo
    },
  });

export default i18n;