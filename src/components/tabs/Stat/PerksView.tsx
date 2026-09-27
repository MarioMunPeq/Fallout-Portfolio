import {
  type SimpleIcon,
  siAndroidstudio,
  siFirebase,
  siGit,
  siGodotengine,
  siKotlin,
  siMysql,
  siOdoo,
  siOpenjdk,
  siPandas,
  siPytorch,
  siPython,
  siReact,
  siSharp,
  siTypescript,
  siUnity,
} from 'simple-icons'
import './PerksView.css'

interface Perk {
  id: string
  name: string
  tag: string
  icon: SimpleIcon
}

/** Extraído del CV: lenguajes, IA y datos, y el stack que usa de verdad. */
const PERKS: readonly Perk[] = [
  { id: 'java', name: 'JAVA', tag: 'LENGUAJE', icon: siOpenjdk },
  { id: 'kotlin', name: 'KOTLIN', tag: 'LENGUAJE', icon: siKotlin },
  { id: 'csharp', name: 'C#', tag: 'LENGUAJE', icon: siSharp },
  { id: 'python', name: 'PYTHON', tag: 'LENGUAJE', icon: siPython },
  { id: 'typescript', name: 'TYPESCRIPT', tag: 'LENGUAJE', icon: siTypescript },
  { id: 'sql', name: 'SQL', tag: 'BASE DE DATOS', icon: siMysql },
  { id: 'react', name: 'REACT', tag: 'FRONTEND', icon: siReact },
  { id: 'odoo', name: 'ODOO', tag: 'ERP', icon: siOdoo },
  { id: 'git', name: 'GIT', tag: 'CONTROL DE VERSIONES', icon: siGit },
  { id: 'androidstudio', name: 'ANDROID', tag: 'MÓVIL', icon: siAndroidstudio },
  { id: 'godot', name: 'GODOT', tag: 'MOTOR DE JUEGOS', icon: siGodotengine },
  { id: 'unity', name: 'UNITY', tag: 'MOTOR DE JUEGOS', icon: siUnity },
  { id: 'pytorch', name: 'PYTORCH', tag: 'DEEP LEARNING', icon: siPytorch },
  { id: 'pandas', name: 'PANDAS', tag: 'ANÁLISIS DE DATOS', icon: siPandas },
  { id: 'firebase', name: 'FIREBASE', tag: 'BACKEND', icon: siFirebase },
]

/** CSS no tiene icono propio en Simple Icons; se dibuja aparte. */
const CSS_PERK: { name: string; path: string } = {
  name: 'CSS',
  path: 'M4 3h16l-1.6 9.1L12 20.3 5.6 12.1 4 3zm4.3 2-.5 2.9h11.4l.5-2.9H8.3z',
}

export function PerksView() {
  return (
    <div className="perks pip-scroll">
      <p className="pip-label perks__header">
        PERKS INSTALADOS · {PERKS.length + 1}
      </p>

      <ul className="perks-grid">
        {PERKS.map((perk) => (
          <li key={perk.id} className="perks-cell" tabIndex={0}>
            <svg
              className="perks-cell__icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path d={perk.icon.path} />
            </svg>
            <span className="perks-cell__name">{perk.name}</span>
            <span className="perks-cell__tag">{perk.tag}</span>
          </li>
        ))}

        <li className="perks-cell" tabIndex={0}>
          <svg
            className="perks-cell__icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path d={CSS_PERK.path} />
          </svg>
          <span className="perks-cell__name">{CSS_PERK.name}</span>
          <span className="perks-cell__tag">LENGUAJE</span>
        </li>
      </ul>
    </div>
  )
}
