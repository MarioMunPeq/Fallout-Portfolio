/* ==========================================================================
   QUEST LOG — the project data behind the MISIONES module.
   Every entry maps to a real public repository.
   ========================================================================== */

export type QuestStatus = 'active' | 'completed' | 'paused'

export interface Quest {
  id: string
  name: string
  status: QuestStatus
  /** One-line hook shown under the name in the list. */
  tagline: string
  description: string
  /** Stack chips. */
  tech: readonly string[]
  objectives: readonly { text: string; completed: boolean }[]
  repoUrl: string
  /** null when the project has no deployed build. */
  demoUrl: string | null
  year: string
}

const GH = 'https://github.com/MarioMunPeq'
const PAGES = 'https://mariomunpeq.github.io'

export const QUESTS: readonly Quest[] = [
  {
    id: 'vault-archive',
    name: 'FALLOUT PORTFOLIO',
    status: 'active',
    tagline: 'Portfolio dentro de un Pip-Boy 3000',
    description:
      'Reconstrucción de la interfaz del Pip-Boy 3000 (Fallout 3) como portfolio interactivo. Carcasa física, fósforo monocromo, seis módulos, mapa de Valladolid, radio y terminal de hackeo. El objetivo es que dudes si es una web o un dispositivo real.',
    tech: ['React', 'TypeScript', 'Vite', 'Mapbox GL', 'Web Audio'],
    objectives: [
      { text: 'Secuencia de arranque y CRT', completed: true },
      { text: 'Carcasa física y bisel', completed: true },
      { text: 'Módulo STAT (S.P.E.C.I.A.L., Perks)', completed: true },
      { text: 'Módulo DATA (registros, contacto)', completed: true },
      { text: 'Módulo MAPA (POIs, indicadores)', completed: true },
      { text: 'Módulo RADIO (sintetizador, espectro)', completed: true },
      { text: 'Módulo HACK (terminal, minijuego)', completed: true },
      { text: 'Pulido visual y efectos CRT', completed: false },
      { text: 'Easter eggs y contenido oculto', completed: false },
    ],
    repoUrl: `${GH}/Fallout-Portfolio`,
    demoUrl: `${PAGES}/Fallout-Portfolio/`,
    year: '2026',
  },
  {
    id: 'repository-library',
    name: 'STEAM PORTFOLIO',
    status: 'active',
    tagline: 'Portfolio con estética de biblioteca de videojuegos',
    description:
      'Portfolio interactivo inspirado en Steam: cada proyecto se explora como si fuera un videojuego, con perfiles, biblioteca, páginas de proyecto, logros y más. La segunda iteración de este mismo portfolio, con otro lenguaje visual.',
    tech: ['TypeScript', 'React', 'Vite'],
    objectives: [
      { text: 'Sistema de biblioteca y perfiles', completed: true },
      { text: 'Páginas de proyecto', completed: true },
      { text: 'Logros y progreso', completed: true },
      { text: 'Despliegue en GitHub Pages', completed: true },
    ],
    repoUrl: `${GH}/Steam-Portfolio`,
    demoUrl: `${PAGES}/Steam-Portfolio/`,
    year: '2026',
  },
  {
    id: 'persona5',
    name: 'PERSONA 5 PORTFOLIO',
    status: 'completed',
    tagline: 'CV viviente con estética Persona 5',
    description:
      'Portfolio personal construido como un CV viviente con la estética de Persona 5: rojo, negro y alto contraste, animaciones fluidas y secciones de proyectos, experiencia y contacto. La primera iteración pública de este portfolio.',
    tech: ['React', 'TypeScript', 'Vite', 'CSS'],
    objectives: [
      { text: 'Sistema de diseño estilo Persona 5', completed: true },
      { text: 'Animaciones y transiciones', completed: true },
      { text: 'Secciones: proyectos, experiencia, contacto', completed: true },
      { text: 'Publicado en producción', completed: true },
    ],
    repoUrl: `${GH}/portfolio-persona5`,
    demoUrl: 'http://mariomunpeq.is-a.dev/',
    year: '2026',
  },
  {
    id: 'minecraft',
    name: 'MINECRAFT PORTFOLIO',
    status: 'completed',
    tagline: 'El portfolio dentro de Minecraft',
    description:
      'El portfolio convertido en un mundo de Minecraft: cada proyecto es una parcela, cada sección un Firmamento. Experimento de presentación poco convencional donde el medio es el mensaje.',
    tech: ['JavaScript'],
    objectives: [
      { text: 'Diseño del mundo y zonas', completed: true },
      { text: 'Integración del contenido del portfolio', completed: true },
      { text: 'Navegación entre parcelas', completed: true },
    ],
    repoUrl: `${GH}/Minecraft-Portfolio`,
    demoUrl: null,
    year: '2026',
  },
  {
    id: 'dungeon',
    name: 'DUNGEON ARCHIVE',
    status: 'completed',
    tagline: 'Compañero de mesa para campañas de D&D',
    description:
      'Aplicación móvil para jugar en la mesa: buscador del compendio, referencia de reglas, gestión de personaje, seguimiento de combate, tiradas de dados y notas de campaña. Mobile-first y PWA, con los datos disponibles sin conexión para que no dependa de la cobertura del local.',
    tech: ['TypeScript', 'React', 'PWA', 'Offline'],
    objectives: [
      { text: 'Diseño de interfaz mobile-first', completed: true },
      { text: 'Buscador del compendio', completed: true },
      { text: 'Tiradas y gestión de combate', completed: true },
      { text: 'Notas de campaña', completed: true },
      { text: 'PWA con datos disponibles offline', completed: true },
    ],
    repoUrl: `${GH}/Dungeon-Archive`,
    demoUrl: `${PAGES}/Dungeon-Archive/`,
    year: '2026',
  },
  {
    id: 'cosmere',
    name: 'COSMERE ARCHIVE',
    status: 'completed',
    tagline: 'Base de datos del universo de Brandon Sanderson',
    description:
      'Web de referencia sobre el universo Cosmere: libros, personajes, mundos y sistemas de magia en una base de datos navegable con búsqueda en tiempo real y filtros cruzados.',
    tech: ['TypeScript', 'React'],
    objectives: [
      { text: 'Arquitectura de datos', completed: true },
      { text: 'Libros, personajes y mundos', completed: true },
      { text: 'Búsqueda y filtros en tiempo real', completed: true },
      { text: 'Publicado en producción', completed: true },
    ],
    repoUrl: `${GH}/Cosmere-Archive`,
    demoUrl: `${PAGES}/Cosmere-Archive/`,
    year: '2026',
  },
  {
    id: 'euromario',
    name: 'EUROMARIO',
    status: 'active',
    tagline: 'Agregador de noticias de videojuegos con IA',
    description:
      'Agregador que recoge, filtra y resume automáticamente las noticias de videojuegos de las últimas 24 horas. Detecta el juego de cada artículo, puntúa relevancia, agrupa noticias duplicadas y publica un resumen diario. Se actualiza solo con GitHub Actions.',
    tech: ['Python', 'RSS', 'GitHub Actions', 'IA'],
    objectives: [
      { text: 'Pipeline de recolección y detección de juego', completed: true },
      { text: 'Puntuación de relevancia con IA', completed: true },
      { text: 'Agrupación de noticias similares', completed: true },
      { text: 'Resumen diario automatizado', completed: true },
      { text: 'Despliegue en GitHub Pages', completed: true },
    ],
    repoUrl: `${GH}/Euromario`,
    demoUrl: `${PAGES}/Euromario/`,
    year: '2026',
  },
  {
    id: 'tower-defense',
    name: 'PRIMER TOWER DEFENSE',
    status: 'completed',
    tagline: 'Tower defense hecho en Godot',
    description:
      'Mi primer tower defense, desarrollado en Godot con GDScript. Segunda partida, oleadas, mejoras de torres y balance de dificultad. El proyecto donde se entiende que hacer un juego es otra disciplina.',
    tech: ['Godot', 'GDScript'],
    objectives: [
      { text: 'Bucle de oleadas y vidas', completed: true },
      { text: 'Torres, alcance y mejora', completed: true },
      { text: 'Interfaz y feedback', completed: true },
      { text: 'Despliegue en GitHub Pages', completed: true },
    ],
    repoUrl: `${GH}/primer-tower-defense`,
    demoUrl: `${PAGES}/primer-tower-defense/`,
    year: '2026',
  },
  {
    id: 'recomendador-campeones',
    name: 'RECOMENDADOR DE CAMPEONES',
    status: 'completed',
    tagline: 'Proyecto final del bootcamp de IA',
    description:
      'Solución de IA de extremo a extremo que recomienda campeones de League of Legends a partir de las métricas del jugador. Proyecto final del bootcamp de Qualentum: acceso y preprocesado de datos, análisis exploratorio, entrenamiento de un modelo Random Forest, evaluación con accuracy, precision, recall, F1 y ROC-AUC, y funciones de inferencia que consultan la API de Riot Games.',
    tech: ['Python', 'Jupyter', 'Scikit-learn', 'Pandas', 'Riot API'],
    objectives: [
      { text: 'Acceso y preprocesado de datos de campeones', completed: true },
      { text: 'Análisis exploratorio de datos (EDA)', completed: true },
      { text: 'Entrenamiento con Random Forest', completed: true },
      { text: 'Evaluación: accuracy, precision, recall, F1, ROC-AUC', completed: true },
      { text: 'Funciones de inferencia sobre la API de Riot', completed: true },
      { text: 'Monitorización y mejora continua con feedback', completed: true },
    ],
    repoUrl: `${GH}/RecomendadorDeCampeones`,
    demoUrl: null,
    year: '2025',
  },
  {
    id: 'gnuhealth',
    name: 'GNU HEALTH',
    status: 'completed',
    tagline: 'Proyecto solidario con la suite de salud GNU',
    description:
      'Participación en el proyecto solidario GNU Health: desarrollo de una aplicación para Android, empaquetado del APK y documentación de instalación. Herramienta real de gestión de salud usada en el ámbito sanitario.',
    tech: ['Python', 'HTML', 'GNU/Linux', 'Android'],
    objectives: [
      { text: 'Aplicación de escritorio', completed: true },
      { text: 'Compilación y empaquetado de APK', completed: true },
      { text: 'Documentación de instalación', completed: true },
    ],
    repoUrl: `${GH}/MyGNUHealthApp`,
    demoUrl: `${PAGES}/DescargaApkGnuHealth/`,
    year: '2024',
  },
]

export const STATUS_LABEL: Record<QuestStatus, string> = {
  active: 'EN DESARROLLO',
  completed: 'COMPLETADA',
  paused: 'PAUSADA',
}
