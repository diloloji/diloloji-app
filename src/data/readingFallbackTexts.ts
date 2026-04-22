/**
 * Wikinews API'sine ulaşılamadığında kullanılacak yedek haber metinleri.
 * `level` alanı gösterim ve filtreleme için kullanılır (Wikinews metinlerinde
 * seviye `estimateLevel` ile türetilir).
 */

import type { ReadingLevel } from '../services/wikinewsApi';

export interface FallbackArticle {
  id: string;
  level: ReadingLevel;
  theme: string;
  title: string;
  /** Plain-text içerik; paragraflar \n\n ile ayrılabilir. */
  extract: string;
  sourceUrl: string;
}

export const FALLBACK_ARTICLES: FallbackArticle[] = [
  {
    id: 'fb_01',
    level: 'A2',
    theme: 'ciudad',
    title: 'Un nuevo parque abre en el centro de Madrid',
    extract: `El Ayuntamiento de Madrid inauguró ayer un nuevo parque en el centro de la ciudad. El parque tiene árboles, bancos y una zona infantil. Muchas familias fueron a visitarlo durante el fin de semana. "Es un lugar perfecto para descansar", dijo una vecina del barrio. El parque abre todos los días de ocho de la mañana a diez de la noche.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_02',
    level: 'A2',
    theme: 'ciencia',
    title: 'Científicos descubren una nueva especie de pez en el Pacífico',
    extract: `Un grupo de científicos españoles descubrió una nueva especie de pez en el océano Pacífico. El animal vive a más de dos mil metros de profundidad y tiene colores muy brillantes. Los investigadores tomaron fotos y recogieron muestras para estudiarlas. El descubrimiento apareció en una revista científica internacional esta semana.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_03',
    level: 'A2',
    theme: 'deporte',
    title: 'La selección argentina gana el partido amistoso en Buenos Aires',
    extract: `La selección argentina de fútbol ganó ayer un partido amistoso contra Brasil en Buenos Aires. El marcador final fue dos a uno. El primer gol lo marcó Lautaro Martínez en el minuto veinte. Miles de aficionados celebraron la victoria en las calles de la ciudad. El próximo partido será en marzo.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_04',
    level: 'B1',
    theme: 'tecnología',
    title: 'España lidera el uso de energía solar en Europa',
    extract: `España se ha convertido en el país europeo que más energía solar produce por habitante. Durante el último año, las instalaciones de paneles solares aumentaron un cuarenta por ciento en todo el territorio. Los expertos señalan que la transición energética avanza más rápido de lo esperado, aunque todavía quedan retos importantes para almacenar la energía producida durante el día.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_05',
    level: 'B1',
    theme: 'cultura',
    title: 'El Museo del Prado celebra su bicentenario con una exposición especial',
    extract: `El Museo del Prado de Madrid celebra doscientos años desde su fundación con una exposición que reúne obras nunca antes mostradas al público. La muestra incluye pinturas de Velázquez, Goya y El Greco que normalmente permanecen en los almacenes del museo. Las entradas se agotaron en pocas horas tras abrirse la venta online. La exposición permanecerá abierta hasta finales de junio.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_06',
    level: 'B1',
    theme: 'economía',
    title: 'El turismo en México alcanza cifras récord este verano',
    extract: `México recibió este verano más turistas extranjeros que en cualquier otro período de su historia. Según las autoridades, más de veinte millones de personas visitaron el país entre junio y agosto. Las ciudades más visitadas fueron Ciudad de México, Cancún y Oaxaca. Sin embargo, algunos expertos advierten que el exceso de turismo puede dañar los ecosistemas y las comunidades locales.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_07',
    level: 'B1',
    theme: 'salud',
    title: 'Investigadores desarrollan una vacuna contra el dengue en Colombia',
    extract: `Un equipo de investigadores colombianos anunció el desarrollo de una nueva vacuna contra el dengue que podría distribuirse en toda América Latina en los próximos años. Los ensayos clínicos mostraron una eficacia del ochenta y ocho por ciento. Si los organismos reguladores la aprueban, sería la primera vacuna de este tipo producida íntegramente en la región.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_08',
    level: 'B2',
    theme: 'política',
    title: 'Chile debate una nueva reforma constitucional',
    extract: `El parlamento chileno inició esta semana el debate sobre una nueva propuesta de reforma constitucional que modifica los artículos relacionados con los derechos sociales y el sistema de pensiones. La oposición critica que el texto no incorpora suficientes garantías para los sectores más vulnerables, mientras que el gobierno sostiene que representa un equilibrio necesario entre crecimiento económico y justicia social. El proceso podría culminar con un referéndum antes de fin de año.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_09',
    level: 'B2',
    theme: 'medioambiente',
    title: 'La Amazonía registra el peor nivel de deforestación en una década',
    extract: `Los datos satelitales publicados esta semana revelan que la Amazonía perdió el año pasado una superficie equivalente a tres veces la ciudad de São Paulo. Organizaciones ambientales atribuyen el fenómeno a la expansión de la agricultura industrial y a la reducción de los presupuestos destinados a la vigilancia forestal. Científicos advierten que superar ciertos umbrales de deforestación podría desencadenar cambios irreversibles en el ciclo del agua de todo el continente.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_10',
    level: 'B2',
    theme: 'tecnología',
    title: 'La inteligencia artificial transforma el diagnóstico médico en hospitales españoles',
    extract: `Varios hospitales públicos españoles han comenzado a implementar sistemas de inteligencia artificial para apoyar el diagnóstico de enfermedades oncológicas. Los modelos analizan imágenes médicas con una precisión comparable a la de especialistas con años de experiencia. Sin embargo, los médicos subrayan que la tecnología debe entenderse como una herramienta de apoyo y no como un sustituto del criterio clínico humano, especialmente en casos complejos donde el contexto del paciente resulta determinante.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_11',
    level: 'A2',
    theme: 'viaje',
    title: 'Un tren de alta velocidad conectará Lisboa y Madrid en cuatro horas',
    extract: `Los gobiernos de España y Portugal firmaron ayer un acuerdo para construir una línea de tren de alta velocidad entre Lisboa y Madrid. El viaje durará menos de cuatro horas cuando el proyecto esté listo. Las obras comenzarán el próximo año y terminarán en 2031. Los dos países esperan que el nuevo tren reduzca el uso del avión entre las dos capitales.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
  {
    id: 'fb_12',
    level: 'B1',
    theme: 'educación',
    title: 'Argentina impulsa la enseñanza de programación en escuelas primarias',
    extract: `El Ministerio de Educación de Argentina anunció un programa nacional para incorporar la enseñanza de programación y pensamiento computacional en todas las escuelas primarias del país a partir del próximo curso. La iniciativa incluye la formación de más de cincuenta mil docentes y la distribución de materiales didácticos gratuitos. Expertos en educación destacan que la medida puede reducir la brecha digital entre distintas regiones del país.`,
    sourceUrl: 'https://es.wikinews.org/',
  },
];
