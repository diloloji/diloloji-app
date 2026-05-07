export const regionalVariants = {
  coger: {
    spain: { usage: 'normal', meaning: 'almak, tutmak', example: 'Coge el autobús.' },
    latam: { usage: 'vulgar', meaning: 'kaba anlam taşır', example: 'Toma el autobús kullan.' },
    warning: "Latin Amerika'da bu fiili kullanmaktan kaçın",
    level: 'critical',
  },
  vosotros: {
    spain: { usage: 'normal', meaning: '2. çoğul şahıs', example: '¿Vosotros venís?' },
    latam: { usage: 'unused', meaning: 'kullanılmaz, yerine ustedes', example: '¿Ustedes vienen?' },
    warning: null,
    level: 'info',
  },
  tomar: {
    spain: { usage: 'normal', meaning: 'almak', example: 'Toma el tren.' },
    latam: { usage: 'preferred', meaning: 'coger yerine tercih edilir', example: 'Toma el tren.' },
    warning: null,
    level: 'info',
  },
};
