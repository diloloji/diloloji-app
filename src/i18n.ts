import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  tr: {
    translation: {
      // Navbar
      fiil_laboratuvari: 'Fiil Laboratuvarı',
      ezber_makinesi: 'Ezber Makinesi',
      sozluk: 'Sözlük',
      giris_yap: 'Giriş Yap',
      // Arama alanı
      fiil_girin: 'Fiil girin',
      zaman_secin: 'Zaman seçin',
      tum_zamanlari_goster: 'Tüm Zamanları Göster',
      tekli_gorunume_don: 'Tekli Görünüme Dön',
      // Sekmeler
      ogrenme: 'Öğrenme',
      alistirma: 'Alıştırma',
      zamana_karsi: 'Zamana Karşı',
      kiyaslama: 'Kıyaslama',
      // Dil adları (dropdown için)
      lang_turkce: 'Türkçe',
      lang_english: 'English',
      lang_francais: 'Français',
      lang_espanol: 'Español',
      // Ek UI
      arayuz_dili: 'Arayüz dili',
      dil_secin: 'Dil seçin',
    },
  },
  en: {
    translation: {
      fiil_laboratuvari: 'Verb Lab',
      ezber_makinesi: 'Memorizer',
      sozluk: 'Dictionary',
      giris_yap: 'Sign In',
      fiil_girin: 'Enter verb',
      zaman_secin: 'Select tense',
      tum_zamanlari_goster: 'Show All Tenses',
      tekli_gorunume_don: 'Single View',
      ogrenme: 'Learning',
      alistirma: 'Practice',
      zamana_karsi: 'Time Attack',
      kiyaslama: 'Compare',
      lang_turkce: 'Türkçe',
      lang_english: 'English',
      lang_francais: 'Français',
      lang_espanol: 'Español',
      arayuz_dili: 'UI language',
      dil_secin: 'Select language',
    },
  },
  fr: {
    translation: {
      fiil_laboratuvari: 'Laboratoire de verbes',
      ezber_makinesi: 'Mémorisateur',
      sozluk: 'Dictionnaire',
      giris_yap: 'Connexion',
      fiil_girin: 'Entrez le verbe',
      zaman_secin: 'Choisir le temps',
      tum_zamanlari_goster: 'Tous les temps',
      tekli_gorunume_don: 'Vue unique',
      ogrenme: 'Apprentissage',
      alistirma: 'Pratique',
      zamana_karsi: 'Contre la montre',
      kiyaslama: 'Comparer',
      lang_turkce: 'Türkçe',
      lang_english: 'English',
      lang_francais: 'Français',
      lang_espanol: 'Español',
      arayuz_dili: 'Langue de l\'interface',
      dil_secin: 'Choisir la langue',
    },
  },
  es: {
    translation: {
      fiil_laboratuvari: 'Laboratorio de verbos',
      ezber_makinesi: 'Memorizador',
      sozluk: 'Diccionario',
      giris_yap: 'Iniciar sesión',
      fiil_girin: 'Introduce el verbo',
      zaman_secin: 'Elegir tiempo',
      tum_zamanlari_goster: 'Todos los tiempos',
      tekli_gorunume_don: 'Vista única',
      ogrenme: 'Aprendizaje',
      alistirma: 'Práctica',
      zamana_karsi: 'Contra reloj',
      kiyaslama: 'Comparar',
      lang_turkce: 'Türkçe',
      lang_english: 'English',
      lang_francais: 'Français',
      lang_espanol: 'Español',
      arayuz_dili: 'Idioma de la interfaz',
      dil_secin: 'Elegir idioma',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'tr',
    supportedLngs: ['tr', 'en', 'fr', 'es'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
