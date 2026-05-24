import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import itTranslation from './it.json';
import enTranslation from './en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      it: itTranslation,
      en: enTranslation,
    },
    lng: 'it', // Lingua di partenza predefinita
    fallbackLng: 'it', // Lingua di riserva se qualcosa va storto
    interpolation: {
      escapeValue: false, // React protegge già da XSS di suo
    },
  });

export default i18n;