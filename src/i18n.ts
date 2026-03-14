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
      // Arama alanı (teşvik edici, aksiyona yönlendiren)
      fiil_girin: 'Hangi fiili keşfediyoruz?',
      zaman_secin: 'Hangi zamanda çekelim?',
      verb_lab_empty_heading: 'Laboratuvar hazır! İlk fiilini gir ve çekimlerin matematiğini çöz.',
      verb_lab_ready: 'Laboratuvar Hazır!',
      verb_lab_empty_subtitle: 'Çekimini merak ettiğiniz fiili yazın veya aşağıdan popüler bir fiil seçin.',
      verb_lab_popular_label: 'En Çok Arananlar',
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
      how_it_works: 'Nasıl Çalışır',
      coming_soon: 'Yakında',
    },
  },
  en: {
    translation: {
      fiil_laboratuvari: 'Verb Lab',
      ezber_makinesi: 'Memorizer',
      sozluk: 'Dictionary',
      giris_yap: 'Sign In',
      fiil_girin: 'Which verb shall we explore?',
      zaman_secin: 'Which tense shall we conjugate?',
      verb_lab_empty_heading: 'The lab is ready! Enter your first verb and unlock the math of conjugations.',
      verb_lab_ready: 'Lab Ready!',
      verb_lab_empty_subtitle: 'Type a verb you want to conjugate, or pick a popular one below.',
      verb_lab_popular_label: 'Popular Verbs',
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
      how_it_works: 'How it works',
      coming_soon: 'Coming Soon',
    },
  },
  fr: {
    translation: {
      fiil_laboratuvari: 'Laboratoire de verbes',
      ezber_makinesi: 'Mémorisateur',
      sozluk: 'Dictionnaire',
      giris_yap: 'Connexion',
      fiil_girin: 'Quel verbe explorer?',
      zaman_secin: 'À quel temps conjuguer?',
      verb_lab_empty_heading: 'Le labo est prêt! Saisis ton premier verbe et découvre la conjugaison.',
      verb_lab_ready: 'Labo prêt !',
      verb_lab_empty_subtitle: 'Écrivez le verbe à conjuguer ou choisissez-en un ci-dessous.',
      verb_lab_popular_label: 'Les plus recherchés',
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
      how_it_works: 'Comment ça marche',
    },
  },
  es: {
    translation: {
      fiil_laboratuvari: 'Laboratorio de verbos',
      ezber_makinesi: 'Memorizador',
      sozluk: 'Diccionario',
      giris_yap: 'Iniciar sesión',
      fiil_girin: '¿Qué verbo exploramos?',
      zaman_secin: '¿En qué tiempo conjugamos?',
      verb_lab_empty_heading: '¡El laboratorio está listo! Escribe tu primer verbo y descubre la conjugación.',
      verb_lab_ready: '¡Laboratorio listo!',
      verb_lab_empty_subtitle: 'Escribe el verbo que quieras conjugar o elige uno popular abajo.',
      verb_lab_popular_label: 'Los más buscados',
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
      how_it_works: 'Cómo funciona',
      coming_soon: 'Próximamente',
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
