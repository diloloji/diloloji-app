/**
 * Wikinews API'sine ulaşılamadığında kullanılacak 3 yedek haber metni.
 * Format, Wikinews'ten çekilen makalelerle uyumlu tutulmuştur.
 */

export interface FallbackArticle {
  id: string;
  title: string;
  /** Plain-text içerik; paragraflar \n\n ile ayrılır. */
  extract: string;
  /** Kaynak URL'i (Wikinews veya ilgili bağlantı). */
  sourceUrl: string;
}

export const FALLBACK_ARTICLES: FallbackArticle[] = [
  {
    id: 'fallback_01',
    title: 'Un nuevo parque abre sus puertas en el centro de Madrid',
    extract:
      'Este sábado abrió sus puertas un nuevo parque en el centro de Madrid. Cientos de personas acudieron al acto de inauguración con sus familias. El alcalde dijo que este espacio busca ofrecer un lugar tranquilo para descansar y hacer deporte.\n\nEl parque tiene zonas verdes, senderos para caminar y un pequeño lago. Los niños pueden jugar en áreas especiales con columpios nuevos. Los vecinos celebraron la apertura porque el barrio necesitaba un espacio abierto así.\n\nDurante el primer día, varios músicos tocaron música en vivo. Los visitantes disfrutaron de una tarde soleada y comieron en los puestos de comida. Las autoridades esperan que el parque se convierta en un lugar popular para todos.',
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fallback_02',
    title: 'Científicos descubren una nueva especie de pez en el Pacífico',
    extract:
      'Un equipo de científicos ha descubierto una nueva especie de pez en las aguas profundas del océano Pacífico. El animal vive a más de dos mil metros de profundidad y tiene un color azul brillante. Los investigadores publicaron sus resultados en una revista internacional.\n\nEl director del proyecto afirmó que este hallazgo demuestra cuánto queda por explorar en los océanos del mundo. El pez se alimenta de pequeños organismos y mide unos veinte centímetros. Según los expertos, vive en total oscuridad y usa señales químicas para comunicarse con otros peces.\n\nLa expedición duró tres meses y contó con la colaboración de varias universidades. Los científicos esperan volver el próximo año para estudiar otras zonas cercanas. Advierten, además, que la contaminación y la pesca ilegal podrían amenazar estas especies.',
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fallback_03',
    title: 'La selección argentina gana el partido amistoso en Buenos Aires',
    extract:
      'La selección argentina ganó ayer el partido amistoso en el estadio Monumental de Buenos Aires. El equipo venció por dos goles a cero ante miles de aficionados. El entrenador mostró su satisfacción con el rendimiento de los jugadores jóvenes.\n\nEl primer gol llegó en el minuto veintitrés tras una jugada bien elaborada. El segundo tanto se produjo en la segunda parte con un disparo desde fuera del área. Los hinchas celebraron con cánticos y banderas durante todo el encuentro.\n\nEl capitán declaró después del partido que el grupo está trabajando duro para los próximos torneos internacionales. La próxima semana el equipo volverá a entrenarse para prepararse contra un rival europeo. Muchos seguidores ya compran entradas para el siguiente partido.',
    sourceUrl: 'https://es.wikinews.org/',
  },
];
