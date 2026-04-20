/**
 * Okuma Pratiği — CEFR seviyelerine göre kategorize edilmiş okuma metinleri ve
 * her metin için çoktan seçmeli sorular. Her dil (fr/es/en) için A1'den C1'e
 * artan uzunlukta ve zorlukta metinler.
 */

export type ReadingLang = 'fr' | 'es' | 'en';
export type ReadingLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface ReadingQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Reading {
  id: string;
  lang: ReadingLang;
  level: ReadingLevel;
  title: string;
  /** Tek paragraf halinde düz metin. Kelimeler boşluk/noktalama ile ayrılır. */
  text: string;
  /** Tahmini okuma süresi (dakika). */
  estimatedMinutes: number;
  questions: ReadingQuestion[];
}

export const READING_LEVELS: ReadingLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export const READING_LANG_META: Record<ReadingLang, { label: string; flag: string; groqName: string }> = {
  fr: { label: 'Français', flag: '🇫🇷', groqName: 'Fransızca' },
  es: { label: 'Español', flag: '🇪🇸', groqName: 'İspanyolca' },
  en: { label: 'English', flag: '🇬🇧', groqName: 'İngilizce' },
};

export const LEVEL_META: Record<
  ReadingLevel,
  { label: string; description: string; badgeClass: string }
> = {
  A1: {
    label: 'A1',
    description: 'Başlangıç · 50–100 kelime',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  },
  A2: {
    label: 'A2',
    description: 'Temel · 100–150 kelime',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-400/30',
  },
  B1: {
    label: 'B1',
    description: 'Orta · 180–250 kelime',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  },
  B2: {
    label: 'B2',
    description: 'Üst orta · 280–350 kelime',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
  },
  C1: {
    label: 'C1',
    description: 'İleri · 400+ kelime · akademik',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  },
};

/* ─────────────── FRANSIZCA ─────────────── */

const FR_READINGS: Reading[] = [
  {
    id: 'fr-a1-ma-journee',
    lang: 'fr',
    level: 'A1',
    title: 'Ma journée',
    estimatedMinutes: 1,
    text:
      "Je m'appelle Léa. J'habite à Lyon, en France. Le matin, je prends mon petit déjeuner à sept heures. Je mange du pain avec du beurre et je bois un café. Ensuite, je vais à l'école à pied. J'aime beaucoup mon école. Après les cours, je rentre à la maison avec ma sœur. Nous faisons nos devoirs ensemble. Le soir, ma famille mange à vingt heures. Avant de dormir, je lis un petit livre. Je dors bien la nuit.",
    questions: [
      {
        id: 'q1',
        question: "Où habite Léa ?",
        options: ['À Paris', 'À Lyon', 'À Nice', 'À Marseille'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: "Comment va-t-elle à l'école ?",
        options: ['En voiture', 'En bus', 'À pied', 'À vélo'],
        correctIndex: 2,
      },
      {
        id: 'q3',
        question: 'Que fait-elle avant de dormir ?',
        options: ['Elle regarde la télé', 'Elle lit un livre', 'Elle mange', 'Elle joue'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'fr-a2-marche',
    lang: 'fr',
    level: 'A2',
    title: 'Le marché du samedi',
    estimatedMinutes: 2,
    text:
      "Chaque samedi matin, ma grand-mère et moi allons au marché du village. Nous partons tôt, vers huit heures, parce qu'elle aime choisir les meilleurs fruits. Le marché se trouve sur la place de l'église. Il y a beaucoup de vendeurs : un boulanger, un fromager et un fleuriste. Ma grand-mère achète toujours des tomates, des courgettes et un poulet rôti. Moi, j'aime les fraises en été et les clémentines en hiver. Après les courses, nous prenons un chocolat chaud au café du coin. Les gens parlent, les enfants jouent et les chiens aboient. C'est mon moment préféré de la semaine.",
    questions: [
      {
        id: 'q1',
        question: 'À quelle heure partent-ils au marché ?',
        options: ['Vers sept heures', 'Vers huit heures', 'Vers neuf heures', 'Vers dix heures'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: 'Que boivent-ils après les courses ?',
        options: ['Un café', 'Un thé', 'Un chocolat chaud', 'Un jus de fruit'],
        correctIndex: 2,
      },
      {
        id: 'q3',
        question: "Que n'achète pas la grand-mère ?",
        options: ['Des tomates', 'Un poulet', 'Des fraises', 'Des courgettes'],
        correctIndex: 2,
      },
      {
        id: 'q4',
        question: 'Où se trouve le marché ?',
        options: ['Dans une rue', 'Sur la place de l’église', 'Dans un centre commercial', 'À la gare'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'fr-b1-voyage-train',
    lang: 'fr',
    level: 'B1',
    title: 'Un voyage en train',
    estimatedMinutes: 3,
    text:
      "L'été dernier, j'ai décidé de traverser la France en train plutôt qu'en avion. Je voulais voir les paysages et rencontrer des gens différents. Je suis partie de Paris un matin d'août. Dans le wagon, une dame âgée m'a proposé un biscuit et m'a raconté sa jeunesse en Bretagne. Son histoire était si vivante que le temps est passé très vite. Quand le train est arrivé à Bordeaux, la chaleur était étouffante, mais la ville avait un charme indéniable avec ses bâtiments en pierre blanche. J'ai continué vers Toulouse, puis vers Marseille. Chaque étape apportait son propre rythme, ses propres odeurs, ses propres accents. J'ai compris, en arrivant à destination, que voyager lentement permet de mieux apprécier ce que l'on voit et ce que l'on entend. Depuis ce jour, je préfère toujours prendre le train quand c'est possible.",
    questions: [
      {
        id: 'q1',
        question: 'Pourquoi a-t-elle choisi le train ?',
        options: [
          'Pour gagner du temps',
          'Pour voir les paysages et les gens',
          "Parce que c'est moins cher",
          "Parce qu'elle a peur de l'avion",
        ],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: 'Qui a-t-elle rencontré dans le train ?',
        options: [
          'Un jeune homme breton',
          "Une dame âgée de Bretagne",
          'Un contrôleur de train',
          'Un groupe de touristes',
        ],
        correctIndex: 1,
      },
      {
        id: 'q3',
        question: 'Quel temps faisait-il à Bordeaux ?',
        options: ['Il pleuvait', 'Il faisait très chaud', 'Il faisait frais', 'Il neigeait'],
        correctIndex: 1,
      },
      {
        id: 'q4',
        question: 'Quelle leçon a-t-elle tirée de ce voyage ?',
        options: [
          "Voyager en avion est plus pratique",
          'Voyager lentement permet de mieux apprécier',
          "Le train est toujours en retard",
          'Les villes françaises se ressemblent',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'fr-b2-ville-intelligente',
    lang: 'fr',
    level: 'B2',
    title: 'La ville intelligente',
    estimatedMinutes: 4,
    text:
      "L'expression « ville intelligente » désigne aujourd'hui un ensemble de pratiques urbaines dans lesquelles les technologies numériques, les capteurs et l'analyse de données massives servent à améliorer la qualité de vie des habitants. Les promoteurs de ce modèle affirment que des feux de circulation adaptatifs, des poubelles connectées ou encore des réseaux d'énergie intelligents peuvent réduire la pollution, optimiser les déplacements et diminuer les coûts de fonctionnement d'une municipalité. Cependant, les critiques rappellent qu'une ville n'est pas seulement un flux de données à optimiser, mais aussi un tissu social complexe où se rencontrent différentes communautés, histoires et mémoires. Ils soulignent que la collecte massive d'informations pose des questions essentielles de vie privée, de souveraineté numérique et de concentration du pouvoir entre les mains de quelques entreprises. Certaines municipalités européennes ont donc choisi une approche plus prudente, privilégiant des plateformes ouvertes, la transparence des algorithmes et l'implication directe des citoyens dans les choix technologiques. À Barcelone, par exemple, des assemblées de quartier participent à la définition des priorités urbaines. Ce type d'initiative suggère qu'une ville véritablement intelligente ne se mesure pas seulement au nombre de capteurs qu'elle contient, mais surtout à la qualité du dialogue démocratique qu'elle entretient avec ses habitants.",
    questions: [
      {
        id: 'q1',
        question: "Selon le texte, que promettent les partisans de la ville intelligente ?",
        options: [
          "Supprimer complètement la pollution",
          "Réduire la pollution et optimiser les déplacements",
          "Augmenter le budget municipal",
          "Remplacer les élus par des algorithmes",
        ],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: "Quelle critique majeure est évoquée ?",
        options: [
          "La technologie coûte trop cher",
          "Les capteurs sont peu fiables",
          "La vie privée et la concentration du pouvoir",
          "Les citoyens refusent le progrès",
        ],
        correctIndex: 2,
      },
      {
        id: 'q3',
        question: "Qu'a choisi Barcelone ?",
        options: [
          'Des algorithmes fermés',
          'Des assemblées de quartier pour définir les priorités',
          'Interdire toute technologie',
          'Vendre ses données à des entreprises',
        ],
        correctIndex: 1,
      },
      {
        id: 'q4',
        question: "Quelle est la conclusion de l'auteur ?",
        options: [
          "Une ville intelligente se mesure au nombre de capteurs",
          "Le dialogue démocratique est essentiel",
          "Les villes européennes sont en retard",
          "La vie privée n'est plus importante",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'fr-c1-memoire-collective',
    lang: 'fr',
    level: 'C1',
    title: 'La mémoire collective et ses paradoxes',
    estimatedMinutes: 6,
    text:
      "La notion de mémoire collective, théorisée par le sociologue Maurice Halbwachs dans l'entre-deux-guerres, désigne l'ensemble des représentations qu'un groupe social produit à propos de son propre passé. À première vue, elle semble un simple prolongement de la mémoire individuelle ; en réalité, elle en diffère profondément, puisqu'elle est le fruit d'une construction continue, traversée d'intérêts politiques, d'exigences identitaires et de silences stratégiques. Ce qu'un peuple choisit de commémorer, ce qu'il décide d'oublier ou de reléguer en marge, dessine une cartographie symbolique dont les enjeux dépassent largement le registre historique. Les historiens contemporains insistent désormais sur le caractère instable de cette mémoire : loin d'être un dépôt neutre où sédimenteraient les faits, elle apparaît comme un champ de luttes où s'affrontent des acteurs divers — institutions d'État, associations militantes, anciens combattants, diasporas, survivants et descendants. Chaque génération réinterprète le passé à l'aune de ses propres interrogations, ce qui conduit à des reconfigurations parfois spectaculaires : ainsi, des figures longtemps célébrées se retrouvent soudainement contestées, tandis que d'autres, longtemps marginalisées, accèdent à une reconnaissance officielle. Ce travail permanent de révision n'est pas le signe d'un relativisme moral, mais plutôt celui d'une société en dialogue avec elle-même. Il suppose toutefois un ensemble d'institutions — archives, musées, universités, médias indépendants — capables de fournir aux citoyens les outils nécessaires pour appréhender la complexité du passé sans céder aux simplifications propagandistes. Lorsque ces institutions s'affaiblissent, ou lorsque le débat public se polarise à l'excès, la mémoire collective perd sa fonction critique et tend à devenir un simple instrument de légitimation politique. Reconnaître cette fragilité, c'est comprendre que la mémoire n'est jamais acquise : elle se cultive, se discute et, parfois, se défend.",
    questions: [
      {
        id: 'q1',
        question: 'Qui a théorisé la notion de mémoire collective ?',
        options: ['Émile Durkheim', 'Maurice Halbwachs', 'Pierre Bourdieu', 'Michel Foucault'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: 'Selon le texte, la mémoire collective est...',
        options: [
          'un simple dépôt neutre des faits',
          'identique à la mémoire individuelle',
          "un champ de luttes en construction continue",
          "une invention récente des médias",
        ],
        correctIndex: 2,
      },
      {
        id: 'q3',
        question: 'Quelle est la condition pour préserver sa fonction critique ?',
        options: [
          "Éviter tout débat public",
          "Avoir des institutions solides et indépendantes",
          "Centraliser toute la mémoire par l'État",
          "Supprimer les archives anciennes",
        ],
        correctIndex: 1,
      },
      {
        id: 'q4',
        question: "Que signifie la phrase finale « la mémoire n'est jamais acquise » ?",
        options: [
          'Elle ne peut jamais être écrite',
          'Elle doit être cultivée et défendue en permanence',
          'Personne ne doit la questionner',
          'Elle appartient uniquement aux historiens',
        ],
        correctIndex: 1,
      },
    ],
  },
];

/* ─────────────── İSPANYOLCA ─────────────── */

const ES_READINGS: Reading[] = [
  {
    id: 'es-a1-mi-familia',
    lang: 'es',
    level: 'A1',
    title: 'Mi familia',
    estimatedMinutes: 1,
    text:
      'Hola, me llamo Carlos. Tengo diez años. Vivo en Madrid con mi familia. Mi padre se llama Juan y trabaja en un hospital. Mi madre se llama Ana y es profesora. Tengo una hermana pequeña. Se llama Lucía y tiene seis años. Ella es muy divertida. También tenemos un perro. Se llama Toby. Los fines de semana, comemos juntos en casa de mi abuela. Mi abuela cocina muy bien. Yo quiero mucho a mi familia.',
    questions: [
      {
        id: 'q1',
        question: '¿Dónde vive Carlos?',
        options: ['En Barcelona', 'En Madrid', 'En Sevilla', 'En Valencia'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: '¿Cuántos años tiene su hermana?',
        options: ['Cuatro', 'Seis', 'Ocho', 'Diez'],
        correctIndex: 1,
      },
      {
        id: 'q3',
        question: '¿Quién cocina los fines de semana?',
        options: ['Su madre', 'Su padre', 'Su abuela', 'Su hermana'],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 'es-a2-un-dia-en-la-playa',
    lang: 'es',
    level: 'A2',
    title: 'Un día en la playa',
    estimatedMinutes: 2,
    text:
      'El sábado pasado fui a la playa con mis amigos. Nos levantamos temprano porque queríamos coger el primer autobús. Cuando llegamos, el sol ya brillaba y el agua estaba muy fría. Alquilamos una sombrilla y dos tumbonas. Marta trajo un bocadillo de jamón y Pedro compró limonada para todos. Después de nadar un rato, jugamos al voleibol en la arena. Por la tarde, conocimos a un grupo de estudiantes italianos. Hablamos con ellos en español e inglés y nos reímos mucho. Volvimos a casa cansados pero felices. Fue un día perfecto y queremos repetirlo pronto.',
    questions: [
      {
        id: 'q1',
        question: '¿Por qué se levantaron temprano?',
        options: [
          'Para hacer deporte',
          'Para coger el primer autobús',
          'Para desayunar juntos',
          'Para estudiar',
        ],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: '¿Qué trajo Marta?',
        options: ['Un bocadillo de jamón', 'Un pastel', 'Limonada', 'Fruta'],
        correctIndex: 0,
      },
      {
        id: 'q3',
        question: '¿A quién conocieron por la tarde?',
        options: [
          'A unos amigos del colegio',
          'A un grupo de estudiantes italianos',
          'A sus profesores',
          'A unos vecinos',
        ],
        correctIndex: 1,
      },
      {
        id: 'q4',
        question: '¿Cómo volvieron a casa?',
        options: ['Tristes', 'Enfadados', 'Cansados pero felices', 'Aburridos'],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 'es-b1-camino-santiago',
    lang: 'es',
    level: 'B1',
    title: 'Una experiencia en el Camino de Santiago',
    estimatedMinutes: 3,
    text:
      'El verano pasado decidí hacer el Camino de Santiago con mi mejor amigo. Empezamos en Sarria y caminamos durante seis días hasta Santiago de Compostela. Cada mañana nos levantábamos antes de las siete para aprovechar las horas frescas. Llevábamos solo una mochila pequeña con ropa ligera, un impermeable y algo de comida. El paisaje gallego era verde y tranquilo, lleno de pequeñas aldeas con iglesias antiguas. En los albergues conocimos a peregrinos de muchos países: una pareja alemana, un grupo de brasileños y una señora mayor que caminaba sola por tercera vez. Por las noches, compartíamos la cena y contábamos nuestras historias en una mezcla de idiomas. Algunos días fueron duros por el cansancio o la lluvia, pero cada atardecer nos recordaba por qué habíamos empezado. Al llegar a la catedral de Santiago, nos abrazamos y guardamos silencio durante unos minutos. Aprendí que lo importante no siempre es la meta, sino las personas y las dudas que encontramos por el camino.',
    questions: [
      {
        id: 'q1',
        question: '¿Cuántos días duró el camino?',
        options: ['Tres días', 'Cinco días', 'Seis días', 'Diez días'],
        correctIndex: 2,
      },
      {
        id: 'q2',
        question: '¿Qué llevaban en la mochila?',
        options: [
          'Ropa ligera, impermeable y comida',
          'Muchos libros',
          'Equipos electrónicos',
          'Solo agua',
        ],
        correctIndex: 0,
      },
      {
        id: 'q3',
        question: '¿A quién conocieron en los albergues?',
        options: [
          'A unos compañeros del trabajo',
          'A peregrinos de varios países',
          'A nadie, estaban vacíos',
          'A sus familiares',
        ],
        correctIndex: 1,
      },
      {
        id: 'q4',
        question: '¿Qué aprendió el narrador?',
        options: [
          'Que la meta es lo único importante',
          'Que no debería volver a caminar',
          'Que lo importante son las personas y el camino',
          'Que caminar es demasiado difícil',
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 'es-b2-teletrabajo',
    lang: 'es',
    level: 'B2',
    title: 'El auge del teletrabajo',
    estimatedMinutes: 4,
    text:
      'En los últimos años, el teletrabajo ha pasado de ser una práctica minoritaria a convertirse en una modalidad habitual en muchas empresas. Esta transformación, acelerada por la pandemia, ha tenido consecuencias que trascienden el ámbito estrictamente laboral. Por un lado, numerosos trabajadores han descubierto las ventajas de organizar su tiempo con mayor autonomía, evitar los desplazamientos diarios y conciliar mejor la vida familiar con las obligaciones profesionales. Diversos estudios sugieren que la productividad no se resiente necesariamente cuando los empleados cuentan con la infraestructura adecuada y una cultura empresarial basada en la confianza. Por otro lado, el teletrabajo también plantea retos significativos: el aislamiento, la dificultad para separar la vida personal de la laboral y una menor espontaneidad en la comunicación entre colegas. Además, las ciudades se están viendo obligadas a replantear sus modelos, puesto que la disminución del tráfico hacia los centros de negocios afecta al comercio local y al transporte público. Algunos expertos abogan por modelos híbridos que combinen días presenciales con jornadas a distancia, argumentando que esta fórmula permite aprovechar las ventajas de ambos mundos. Sin embargo, para que el teletrabajo resulte realmente sostenible, será imprescindible regular aspectos como el derecho a la desconexión, la ergonomía en el hogar y la igualdad de oportunidades entre quienes acuden a la oficina y quienes no. El futuro del trabajo, en definitiva, dependerá menos de la tecnología disponible que de nuestra capacidad colectiva para diseñar reglas justas.',
    questions: [
      {
        id: 'q1',
        question: '¿Qué aceleró la adopción del teletrabajo?',
        options: [
          'Una nueva ley europea',
          'La pandemia',
          'El aumento del turismo',
          'Un avance en inteligencia artificial',
        ],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: 'Según el texto, la productividad...',
        options: [
          'siempre disminuye con el teletrabajo',
          'no tiene relación con el entorno laboral',
          'no se resiente necesariamente si hay infraestructura y confianza',
          'aumenta siempre sin ninguna condición',
        ],
        correctIndex: 2,
      },
      {
        id: 'q3',
        question: '¿Qué modelo defienden algunos expertos?',
        options: [
          'El totalmente presencial',
          'El totalmente a distancia',
          'Un modelo híbrido',
          'El trabajo por proyectos únicamente',
        ],
        correctIndex: 2,
      },
      {
        id: 'q4',
        question: '¿Qué aspectos habría que regular según el autor?',
        options: [
          'El derecho a la desconexión y la ergonomía',
          'Los horarios escolares',
          'El precio de los alquileres',
          'Los transportes internacionales',
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'es-c1-lectura-digital',
    lang: 'es',
    level: 'C1',
    title: 'La lectura en la era digital',
    estimatedMinutes: 6,
    text:
      'Durante siglos, la lectura se concibió como una práctica silenciosa, lineal y concentrada, asociada a un objeto concreto —el libro— y a un espacio íntimo donde el sujeto podía, en palabras de Proust, "convertirse en el lector de sí mismo". La irrupción de los soportes digitales ha alterado de forma profunda este paradigma. Las pantallas no solo sustituyen al papel, sino que proponen una experiencia radicalmente distinta: hipervínculos que invitan a desviarse del texto, notificaciones que fragmentan la atención, algoritmos que deciden qué leeremos a continuación. Algunos investigadores, apoyándose en estudios de neurociencia cognitiva, advierten sobre el riesgo de una "lectura superficial", caracterizada por el escaneo rápido de párrafos, una menor retención de la información y una pérdida progresiva de la capacidad para sostener argumentos complejos. Otros, por el contrario, rechazan este diagnóstico alarmista: sostienen que la lectura digital amplía el acceso a los textos, democratiza el conocimiento y permite formas inéditas de análisis colaborativo, como las anotaciones sociales o las ediciones críticas en código abierto. En realidad, la cuestión no puede reducirse a una oposición maniquea entre papel y pantalla. Lo que está en juego es el tipo de atención que somos capaces de cultivar y las condiciones institucionales —bibliotecas, escuelas, familias— que favorecen o desalientan determinadas prácticas lectoras. Investigaciones recientes muestran que la calidad de la lectura depende menos del soporte que del contexto en el que se realiza: una persona que alterna entre una novela impresa y artículos académicos en una tableta, sin interrupciones, probablemente mantendrá una comprensión alta en ambos casos. El verdadero desafío pedagógico, por tanto, consiste en enseñar a los lectores contemporáneos a discernir cuándo conviene leer despacio y cuándo basta con un vistazo, cuándo vale la pena detenerse en una nota al pie y cuándo seguir el hilo principal del argumento. Formar lectores críticos, capaces de navegar entre ambos mundos, parece hoy más necesario que nunca, si aspiramos a que la lectura siga siendo una herramienta para pensar y no únicamente para consumir.',
    questions: [
      {
        id: 'q1',
        question: 'Según el texto, las pantallas...',
        options: [
          'son simplemente un soporte alternativo al papel',
          'proponen una experiencia distinta, con hipervínculos y notificaciones',
          'solo sirven para leer textos cortos',
          'eliminan por completo la lectura tradicional',
        ],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: '¿Qué advierten algunos investigadores?',
        options: [
          'Que el papel es obsoleto',
          'Que los algoritmos deberían ser prohibidos',
          'Que existe el riesgo de una lectura superficial',
          'Que los jóvenes ya no leen nada',
        ],
        correctIndex: 2,
      },
      {
        id: 'q3',
        question: 'Según investigaciones recientes, la calidad de la lectura depende sobre todo de...',
        options: [
          'el soporte utilizado',
          'el contexto en el que se realiza',
          'la nacionalidad del lector',
          'la hora del día',
        ],
        correctIndex: 1,
      },
      {
        id: 'q4',
        question: '¿Cuál es el verdadero desafío pedagógico?',
        options: [
          'Prohibir las pantallas en las escuelas',
          'Obligar a leer solo en papel',
          'Enseñar a discernir cuándo leer despacio y cuándo rápido',
          'Automatizar la lectura mediante algoritmos',
        ],
        correctIndex: 2,
      },
    ],
  },
];

/* ─────────────── İNGİLİZCE ─────────────── */

const EN_READINGS: Reading[] = [
  {
    id: 'en-a1-my-weekend',
    lang: 'en',
    level: 'A1',
    title: 'My Weekend',
    estimatedMinutes: 1,
    text:
      "My name is Emma. I am twelve years old. On Saturday, I get up at nine o'clock. I eat toast and drink orange juice for breakfast. After breakfast, I go to the park with my dog. His name is Max. He is small and brown. In the park, we play with a ball. I meet my friend Sophie there. We eat ice cream and talk about school. In the afternoon, I watch a movie at home. On Sunday, I visit my grandmother. She makes good cakes. I love weekends.",
    questions: [
      {
        id: 'q1',
        question: 'When does Emma get up on Saturday?',
        options: ['At eight', 'At nine', 'At ten', 'At eleven'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: "What is her dog's name?",
        options: ['Rex', 'Buddy', 'Max', 'Charlie'],
        correctIndex: 2,
      },
      {
        id: 'q3',
        question: 'Who does Emma visit on Sunday?',
        options: ['Her friend', 'Her teacher', 'Her grandmother', 'Her cousin'],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 'en-a2-first-day',
    lang: 'en',
    level: 'A2',
    title: 'My First Day at the Library',
    estimatedMinutes: 2,
    text:
      "Last Monday, I started my first job at the city library. I was a little nervous but also excited. The head librarian, Mrs. Parker, welcomed me with a warm smile. She showed me the computer system and explained how to help visitors find books. During the morning, I mostly watched and took notes. In the afternoon, a young boy asked me where the dinosaur books were. I wasn't sure, so I checked the map on the wall. Thankfully, I found the right shelf quickly. The boy was very happy. At five o'clock, my colleague Tom invited me to have tea in the break room. He told me funny stories about strange questions that visitors sometimes ask. When I went home, I felt tired but proud. I realized that being kind and patient is more important than knowing every answer.",
    questions: [
      {
        id: 'q1',
        question: 'How did the narrator feel at the beginning?',
        options: ['Angry', 'Bored', 'Nervous and excited', 'Sad'],
        correctIndex: 2,
      },
      {
        id: 'q2',
        question: 'What did the young boy want?',
        options: [
          'To borrow a computer',
          'To find dinosaur books',
          'To meet Mrs. Parker',
          'To play with Tom',
        ],
        correctIndex: 1,
      },
      {
        id: 'q3',
        question: 'Who is Tom?',
        options: ['A visitor', 'A colleague', 'The narrator’s brother', 'The boy’s father'],
        correctIndex: 1,
      },
      {
        id: 'q4',
        question: 'What did the narrator learn?',
        options: [
          'That working in a library is boring',
          'That being kind and patient matters more than knowing everything',
          'That Mrs. Parker is strict',
          'That children ask too many questions',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'en-b1-volunteering',
    lang: 'en',
    level: 'B1',
    title: 'Volunteering Changed My Summer',
    estimatedMinutes: 3,
    text:
      "Last summer, instead of travelling abroad, I decided to volunteer at a local community centre that supports elderly people living alone. Honestly, I was not very enthusiastic at first. I thought the work would be slow and perhaps a little boring. However, after only a few days, my opinion changed completely. Every morning, I visited two or three residents in their small apartments. Some of them did not have family nearby, and they were simply happy to have company. One gentleman, Mr. Davies, used to be a jazz musician in the 1960s. He told me incredible stories about playing in clubs in London and meeting famous artists. Another woman, Mrs. Lopez, taught me how to cook a traditional Spanish tortilla. We laughed a lot when I accidentally burnt the onions. Through these small interactions, I realised that loneliness is one of the biggest problems in modern cities, but it is also one that we can address if we simply give a few hours of our time. By the end of the summer, I had not visited a single tourist destination, yet I felt I had learnt more about human connection than during any holiday before.",
    questions: [
      {
        id: 'q1',
        question: 'Why did the narrator volunteer?',
        options: [
          'Because they needed money',
          'Because they could not travel',
          'Because they chose to instead of travelling',
          'Because their school required it',
        ],
        correctIndex: 2,
      },
      {
        id: 'q2',
        question: 'Who was Mr. Davies?',
        options: [
          'A retired teacher',
          'A former jazz musician',
          'The narrator’s grandfather',
          'A chef',
        ],
        correctIndex: 1,
      },
      {
        id: 'q3',
        question: 'What did Mrs. Lopez teach the narrator?',
        options: [
          'How to play jazz',
          'How to cook a Spanish tortilla',
          'Spanish grammar',
          'How to drive',
        ],
        correctIndex: 1,
      },
      {
        id: 'q4',
        question: 'What did the narrator realise?',
        options: [
          'That volunteering is boring',
          'That travelling is always better than volunteering',
          'That loneliness is a big problem that can be addressed',
          'That elderly people do not like visitors',
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 'en-b2-social-media',
    lang: 'en',
    level: 'B2',
    title: 'Social Media and Public Conversation',
    estimatedMinutes: 4,
    text:
      "The emergence of social media platforms in the early 21st century transformed public conversation in ways that few could have predicted. On the one hand, these platforms democratised information, allowing ordinary citizens to publish their views without the intervention of traditional gatekeepers such as editors or broadcasters. Individual journalists, activists and even small communities gained the ability to reach global audiences overnight. On the other hand, this same openness has produced unintended consequences that many observers now find troubling. Algorithms designed to maximise engagement tend to amplify emotionally charged content, which is often outrageous, divisive or simplistic. As a result, complex debates are increasingly reduced to slogans, while nuance and measured argument struggle to compete for attention. Another concern is the phenomenon of filter bubbles, where users are repeatedly exposed to opinions similar to their own, reinforcing existing beliefs and limiting exposure to alternative perspectives. Some scholars argue that this dynamic is eroding the common ground required for democratic deliberation. However, it would be simplistic to blame technology alone. Media literacy, the design choices of platform companies, and the broader political climate all shape how digital spaces are used. Recent initiatives, including independent fact-checking organisations, transparency reports and educational programmes in schools, suggest that public awareness is growing. Whether these efforts can keep pace with the rapid evolution of the platforms remains, however, an open question. What is certain is that society must resist the temptation to treat social media as a mere source of entertainment. The way we discuss politics, science and even our own communities is at stake.",
    questions: [
      {
        id: 'q1',
        question: 'According to the text, one positive effect of social media was...',
        options: [
          'replacing all traditional journalists',
          'giving ordinary citizens global reach',
          'eliminating misinformation',
          'increasing the price of news',
        ],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: 'What do engagement-driven algorithms tend to amplify?',
        options: [
          'Calm, measured arguments',
          'Emotionally charged content',
          'Purely visual content only',
          'Educational articles',
        ],
        correctIndex: 1,
      },
      {
        id: 'q3',
        question: 'What is a "filter bubble"?',
        options: [
          'A software used to remove spam',
          'A kind of online advertisement',
          'A state where users mostly see similar opinions',
          'A privacy setting',
        ],
        correctIndex: 2,
      },
      {
        id: 'q4',
        question: 'What does the author conclude?',
        options: [
          'Technology alone is to blame',
          'Public awareness plus design and literacy all matter',
          'Social media should be banned',
          'Traditional media are perfect',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'en-c1-aging-population',
    lang: 'en',
    level: 'C1',
    title: 'Rethinking an Aging Population',
    estimatedMinutes: 6,
    text:
      "The demographic transition currently underway in most developed economies, and increasingly in emerging ones, is reshaping the social, economic and political landscape with a subtlety that often escapes public debate. While alarmist headlines tend to frame the aging population solely as a looming crisis for pension systems, a more nuanced reading suggests that the phenomenon is both inevitable and, when properly understood, rich in opportunities. Life expectancy has risen steadily over the past century thanks to advances in public health, nutrition and medical technology. At the same time, declining fertility rates have meant that the proportion of older citizens is growing relative to the working-age population. Policy responses have traditionally focused on parametric adjustments: raising the retirement age, revising contribution formulas or encouraging private savings. Yet these technical fixes, however necessary, do not address the deeper cultural question of how societies should organise themselves around longer, more varied life courses. A growing body of research in gerontology challenges the assumption that productivity and creativity decline abruptly after a certain age. Seniors bring with them decades of accumulated expertise, social networks and, increasingly, excellent health. Several European countries are experimenting with phased retirement schemes, intergenerational mentoring programmes and lifelong learning initiatives that recognise older workers as strategic assets rather than liabilities. In parallel, the so-called silver economy, encompassing sectors from healthcare and housing to leisure and technology, is emerging as a significant engine of innovation and employment. Of course, these opportunities will not materialise automatically. They require deliberate policy design, enlightened corporate leadership and cultural shifts that dismantle pervasive stereotypes about aging. Moreover, fairness demands that the benefits of longer lives do not accrue only to the privileged. Health inequalities, gender gaps in pensions and geographic disparities must be confronted explicitly if we wish to avoid an aging society that is also an unequal one. Ultimately, how a community treats its oldest members is a telling indicator of its moral seriousness. Rather than clinging to a youth-centric paradigm, we would do well to imagine institutions capable of honouring the full arc of human life.",
    questions: [
      {
        id: 'q1',
        question: 'Why does the author consider alarmist framing insufficient?',
        options: [
          'It exaggerates medical advances',
          "It treats aging only as a crisis and ignores opportunities",
          'It focuses too much on emerging economies',
          'It denies that fertility is declining',
        ],
        correctIndex: 1,
      },
      {
        id: 'q2',
        question: 'Traditional policy responses have mostly involved...',
        options: [
          'lifelong learning initiatives',
          'phased retirement experiments',
          'parametric adjustments like raising the retirement age',
          'cultural campaigns against ageism',
        ],
        correctIndex: 2,
      },
      {
        id: 'q3',
        question: 'According to the text, what is the "silver economy"?',
        options: [
          'A currency for older citizens',
          'Economic sectors built around needs of older people',
          'A fund for retired civil servants',
          'A synonym for the informal economy',
        ],
        correctIndex: 1,
      },
      {
        id: 'q4',
        question: 'What ethical point does the author make at the end?',
        options: [
          'Retirement should be abolished',
          'Only the elderly matter',
          "How a society treats its oldest members reveals its moral seriousness",
          'Cultural stereotypes cannot be changed',
        ],
        correctIndex: 2,
      },
    ],
  },
];

export const READINGS: Reading[] = [...FR_READINGS, ...ES_READINGS, ...EN_READINGS];

/** Belirli bir dil + seviye için metinleri döndürür. */
export function getReadings(lang: ReadingLang, level: ReadingLevel): Reading[] {
  return READINGS.filter((r) => r.lang === lang && r.level === level);
}

/** ID ile tek bir metni bul. */
export function findReadingById(id: string): Reading | undefined {
  return READINGS.find((r) => r.id === id);
}
