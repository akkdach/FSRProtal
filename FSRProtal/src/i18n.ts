import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationTH from './locales/th.json';
import translationEN from './locales/en.json';
import translationZH from './locales/zh.json';
import translationJA from './locales/ja.json';

const resources = {
    th: { translation: translationTH },
    en: { translation: translationEN },
    zh: { translation: translationZH },
    ja: { translation: translationJA },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'th',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
