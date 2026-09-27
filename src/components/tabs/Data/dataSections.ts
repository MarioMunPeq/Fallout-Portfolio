export type DataSectionId =
  | 'ABOUT'
  | 'EXPERIENCE'
  | 'EDUCATION'
  | 'SKILLS'
  | 'CONTACT'

export interface DataEntry {
  id: string
  name: string
  lines: readonly string[]
  /** When set, the viewer shows a proficiency meter instead of plain text. */
  level?: number
  url?: string
  urlText?: string
  /** Renders the action as inert (used for channels that aren't published). */
  urlDisabled?: boolean
}

export interface DataSectionInfo {
  id: DataSectionId
  label: string
  path: string
  entries: readonly DataEntry[]
}

/** Terminal-style redaction for fields the operator hasn't published. */
const REDACTED = '▓▓▓▓▓▓▓▓▓▓▓'

const ABOUT_ENTRIES: readonly DataEntry[] = [
  {
    id: 'registro-personal',
    name: 'REGISTRO.TXT',
    lines: [
      'REGISTRO PERSONAL - ENTRADA #001',
      '',
      'USUARIO .........: MARIO MUÑOZ PEQUEÑO',
      'ALIAS ...........: MarioMunPeq',
      'ORIGEN ..........: VALLADOLID, ESPAÑA',
      'FUNCIÓN .........: PEGA DEVELOPER',
      'EMPLEADOR .......: COGNIZANT',
      'FORMACIÓN .......: GRADO SUPERIOR EN DESARROLLO DE',
      '                    APLICACIONES MULTIPLATAFORMA (DAM)',
      '                    + BOOTCAMP DE INTELIGENCIA ARTIFICIAL',
      'IDIOMAS .........: CASTELLANO (NATIVO)',
      '                    INGLÉS (B2 - OXFORD Y TRINITY)',
      'CARNET ..........: PERMISO DE CONDUCIR B',
      '',
      'NOTA DEL SISTEMA',
      'El operador de este dispositivo reside en Valladolid y',
      'desarrolla software desde septiembre de 2026, primero en',
      'Cognizant como Pega Developer y antes en la Diputación',
      'de Valladolid como desarrollador web.',
      '',
      'Su base es la ingeniería de software: grado superior en',
      'DAM tras pasar por automatización y robótica industrial,',
      'con un bootcamp de inteligencia artificial de 450 horas',
      'como especialización.',
      '',
      'Fuera del horario de servicio, los registros muestran',
      'actividad en: videojuegos, rol de mesa (D&D), lectura',
      'de fantasía, inteligencia artificial y un interés',
      'constante por el diseño y la tecnología en general.',
      '',
      'Este portfolio ha sido reescrito varias veces, cada una',
      'con una estética distinta: Persona 5, Minecraft, una',
      'biblioteca de repositorios, un compañero de mesa de',
      'D&D y ahora un Pip-Boy. Mismo contenido, cinco',
      'dispositivos.',
      '',
      'SIN MÁS DATAS - FIN DE REGISTRO',
    ],
  },
]

const EXPERIENCE_ENTRIES: readonly DataEntry[] = [
  {
    id: 'exp-cognizant',
    name: 'EXP_001.LOG',
    lines: [
      'PERIODO ........: SEP 2026 - PRESENTE',
      'EMPRESA ........: COGNIZANT',
      'ROL ............: PEGA DEVELOPER',
      'SEDE ...........: VALLADOLID, ESPAÑA',
      'ESTADO .........: EN CURSO',
      '',
      'Puesto actual. Desarrollo de aplicaciones sobre la',
      'plataforma Pega.',
    ],
  },
  {
    id: 'exp-diputacion',
    name: 'EXP_002.LOG',
    lines: [
      'PERIODO ........: FEB 2026 - SEP 2026',
      'EMPRESA ........: DIPUTACIÓN DE VALLADOLID',
      'ROL ............: DESARROLLADOR WEB',
      'ESTADO .........: FINALIZADO',
      '',
      'Desarrollo web con Liferay y Odoo, y soporte técnico.',
    ],
  },
  {
    id: 'exp-michelin',
    name: 'EXP_003.LOG',
    lines: [
      'PERIODO ........: MAR 2024 - JUN 2024',
      'EMPRESA ........: MICHELIN',
      'ROL ............: TÉCNICO (PRÁCTICAS QUE FORMARON',
      '                    PARTE DEL GRADO SUPERIOR DAM)',
      'ESTADO .........: FINALIZADO',
      '',
      'Power Apps, Power BI, análisis de datos con Power BI,',
      'Python y SharePoint.',
    ],
  },
  {
    id: 'exp-synersight',
    name: 'EXP_004.LOG',
    lines: [
      'PERIODO ........: MAR 2022 - JUN 2022',
      'EMPRESA ........: SYNERSIGHT SL',
      'ROL ............: TÉCNICO (PRÁCTICAS QUE FORMARON',
      '                    PARTE DEL GRADO SUPERIOR ARI)',
      'ESTADO .........: FINALIZADO',
      '',
      'SEE Electrical, manejo de robots AGV y participación',
      'activa en reuniones.',
    ],
  },
]

const EDUCATION_ENTRIES: readonly DataEntry[] = [
  {
    id: 'edu-dam',
    name: 'EDU_001.SYS',
    lines: [
      'TÍTULO ..........: GRADO SUPERIOR',
      'ESPECIALIDAD ...: DESARROLLO DE APLICACIONES',
      '                    MULTIPLATAFORMA (DAM)',
      'CENTRO ..........: IES JULIÁN MARÍAS',
      'PERIODO ........: SEP 2022 - JUN 2024',
      'ESTADO ..........: COMPLETADO',
      '',
      'Formación en ingeniería de software. Mención honrosa',
      'en el TFG.',
    ],
  },
  {
    id: 'edu-ia',
    name: 'EDU_002.SYS',
    lines: [
      'TÍTULO ..........: BOOTCAMP DE INTELIGENCIA ARTIFICIAL',
      'CENTRO ..........: QUALENTUM',
      'PERIODO ........: JUN 2024 - ENE 2025',
      'DURACIÓN .......: 450 HORAS',
      'ESTADO ..........: COMPLETADO',
      '',
      'Especialización en IA y aprendizaje automático.',
    ],
  },
  {
    id: 'edu-robotica',
    name: 'EDU_003.SYS',
    lines: [
      'TÍTULO ..........: GRADO SUPERIOR',
      'ESPECIALIDAD ...: AUTOMATIZACIÓN Y ROBÓTICA',
      '                    INDUSTRIAL (ARI)',
      'CENTRO ..........: IES GALILEO',
      'PERIODO ........: SEP 2020 - JUN 2022',
      'ESTADO ..........: COMPLETADO (SIN TFG)',
      '',
      'Especialización en automatización y control industrial.',
    ],
  },
  {
    id: 'edu-telco',
    name: 'EDU_004.SYS',
    lines: [
      'TÍTULO ..........: GRADO MEDIO',
      'ESPECIALIDAD ...: INSTALACIONES DE',
      '                    TELECOMUNICACIONES',
      'CENTRO ..........: IES LA MERCED',
      'PERIODO ........: SEP 2018 - JUN 2020',
      'ESTADO ..........: COMPLETADO',
      '',
      'Rama técnica: redes y sistemas de comunicación.',
    ],
  },
]

const SKILLS_ENTRIES: readonly DataEntry[] = [
  {
    id: 'sk-lenguajes',
    name: 'SK_001.IDX',
    lines: [
      'LENGUAJES DE PROGRAMACIÓN',
      '',
      'Java · Python · Kotlin · C# · SQL · HTML · CSS',
      '',
      'TypeScript es el lenguaje con el que más trabajo: es el',
      'que sostiene este portfolio y el resto de webs que ha',
      'publicado.',
    ],
  },
  {
    id: 'sk-ia',
    name: 'SK_002.IDX',
    lines: [
      'IA Y DATOS',
      '',
      'Scikit-learn · Pandas · PyTorch',
      '',
      'Formación en el bootcamp de 450 horas de Qualentum.',
      'Proyecto final: un recomendador de campeones de',
      'League of Legends con Random Forest, evaluación',
      'completa y funciones de inferencia sobre la API',
      'de Riot Games.',
    ],
  },
  {
    id: 'sk-tecnologias',
    name: 'SK_003.IDX',
    lines: [
      'TECNOLOGÍAS',
      '',
      'React · Angular · Git / GitHub · Liferay · Odoo',
      'SharePoint · Firebase · Android Studio',
      'Unity · Godot',
      '',
      'En el trabajo: Pega, Liferay y Odoo. En casa: React',
      'para web, Unity y Godot para videojuegos.',
    ],
  },
  {
    id: 'sk-otros',
    name: 'SK_004.IDX',
    lines: [
      'HERRAMIENTAS Y OTROS',
      '',
      'Figma · Office',
      '',
      'Intereses: inteligencia artificial, desarrollo',
      'backend, automatización y desarrollo de videojuegos.',
    ],
  },
  {
    id: 'sk-idiomas',
    name: 'SK_005.IDX',
    lines: [
      'IDIOMAS',
      '',
      'CASTELLANO .......: NATIVO',
      'INGLÉS ..........: NIVEL B2',
      '                  CERTIFICADO POR OXFORD Y TRINITY',
      '',
      'PERMISO DE CONDUCIR: B',
    ],
  },
  {
    id: 'sk-solidario',
    name: 'SK_006.LOG',
    lines: [
      'PROYECTO SOLIDARIO',
      '',
      'ONG GNU HEALTH',
      '',
      'Desarrollo de una aplicación para Android,',
      'empaquetado del APK y documentación de',
      'instalación para la suite de salud libre GNU.',
    ],
  },
]

const CONTACT_ENTRIES: readonly DataEntry[] = [
  {
    id: 'ct-github',
    name: 'CONTACTO_GITHUB.CFG',
    url: 'https://github.com/MarioMunPeq',
    urlText: 'ABRIR PERFIL',
    lines: [
      'CANAL .....: GITHUB',
      'VALOR .....: github.com/MarioMunPeq',
      '',
      '20 repositorios públicos. Código, juegos y portfolio.',
    ],
  },
  {
    id: 'ct-web',
    name: 'CONTACTO_WEB.CFG',
    url: 'https://mariomunpeq.is-a.dev/',
    urlText: 'ABRIR SITIO',
    lines: [
      'CANAL .....: SITIO WEB',
      'VALOR .....: mariomunpeq.is-a.dev',
      '',
      'Subdominio propio. Alojado en GitHub Pages.',
    ],
  },
  {
    id: 'ct-linkedin',
    name: 'CONTACTO_LINKEDIN.CFG',
    url: 'https://www.linkedin.com/in/mario-mu%C3%B1oz-peque%C3%B1o/',
    urlText: 'ABRIR PERFIL',
    lines: [
      'CANAL .....: LINKEDIN',
      'VALOR .....: linkedin.com/in/mario-muñoz-pequeño',
      '',
      'Perfil profesional.',
    ],
  },
  {
    id: 'ct-email',
    name: 'CONTACTO_EMAIL.CFG',
    urlDisabled: true,
    lines: [
      'CANAL .....: CORREO ELECTRÓNICO',
      'VALOR .....: ' + REDACTED,
      '',
      'Canal no publicado. Usa GitHub o LinkedIn para',
      'contactar directamente.',
    ],
  },
]

export const DATA_SECTIONS: readonly DataSectionInfo[] = [
  {
    id: 'ABOUT',
    label: 'ABOUT',
    path: 'SYS:\\VAULT\\OPERADOR\\',
    entries: ABOUT_ENTRIES,
  },
  {
    id: 'EXPERIENCE',
    label: 'EXPERIENCE',
    path: 'SYS:\\VAULT\\REGISTROS\\EXPERIENCIA\\',
    entries: EXPERIENCE_ENTRIES,
  },
  {
    id: 'EDUCATION',
    label: 'EDUCATION',
    path: 'SYS:\\VAULT\\REGISTROS\\EDUCACION\\',
    entries: EDUCATION_ENTRIES,
  },
  {
    id: 'SKILLS',
    label: 'SKILLS',
    path: 'SYS:\\VAULT\\REGISTROS\\HABILIDADES\\',
    entries: SKILLS_ENTRIES,
  },
  {
    id: 'CONTACT',
    label: 'CONTACT',
    path: 'SYS:\\VAULT\\CONTACTOS\\',
    entries: CONTACT_ENTRIES,
  },
]
