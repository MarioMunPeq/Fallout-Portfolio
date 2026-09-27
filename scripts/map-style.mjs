#!/usr/bin/env node
/**
 * ============================================================================
 *  MAPBOX STYLE PAINTER
 * ----------------------------------------------------------------------------
 *  Recolours the Mapbox style referenced by VITE_MAPBOX_STYLE_URL from
 *  `mapbox/theme.json`, and changes absolutely nothing else.
 *
 *  The style is a Mapbox "Standard" style, so it has no layers of its own:
 *  every colour in the basemap lives in the `config` object of its `imports`
 *  entry. That object is the whole theme. This script merges `mapbox/theme.json`
 *  over it and leaves the keys you didn't list — show*, font, lightPreset,
 *  projection, center, zoom, bearing, pitch — exactly as they were.
 *
 *    node scripts/map-style.mjs pull            # cache the live style locally
 *    node scripts/map-style.mjs diff            # write mapbox/vault-style.json
 *    node scripts/map-style.mjs push --dry-run  # show what would be uploaded
 *    node scripts/map-style.mjs push            # upload it to Mapbox
 *
 *  Two ways to apply it:
 *
 *    push  Nothing in the app changes, because it repaints the style you
 *          already point at. This is the one you want.
 *
 *    drag  `diff` also writes mapbox/vault-style.json, a complete style you
 *          can drop into Mapbox Studio via  Styles > (⋯) > Import style.
 *          Use it if you'd rather eyeball the result in Studio first. It
 *          replaces the whole style, so the style id in .env changes.
 *
 *  `push` always writes mapbox/backup-<timestamp>.json first.
 * ========================================================================== */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MAPBOX_DIR = join(ROOT, 'mapbox')
const THEME_PATH = join(MAPBOX_DIR, 'theme.json')
const CACHE_PATH = join(MAPBOX_DIR, 'style.current.json')
const OUT_PATH = join(MAPBOX_DIR, 'vault-style.json')

mkdirSync(MAPBOX_DIR, { recursive: true })

/* ---- .env, the same file the app already reads ---------------------------- */
function readEnv(file) {
  if (!existsSync(file)) return {}
  const out = {}
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!match) continue
    out[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...readEnv(join(ROOT, '.env')), ...process.env }
/** Read scope: any valid token, public ones included. */
const TOKEN = env.VITE_MAPBOX_TOKEN ?? env.MAPBOX_TOKEN
/**
 * Write scope: the Styles API only accepts a SECRET token, so this is a
 * separate variable on purpose. You pass it per-invocation, it never lands in
 * .env, and the app keeps working with the public token.
 */
const WRITE_TOKEN = env.MAPBOX_STYLE_TOKEN ?? env.MAPBOX_TOKEN ?? TOKEN
const STYLE_URL = env.VITE_MAPBOX_STYLE_URL ?? env.MAPBOX_STYLE_URL

/** `mapbox://styles/<user>/<id>` -> { user, id }. */
function parseStyleUrl(url) {
  const match = url?.match(/^mapbox:\/\/styles\/([^/]+)\/([^/?#]+)/)
  if (!match) {
    throw new Error(
      `VITE_MAPBOX_STYLE_URL no apunta a un estilo propio: "${url}".\n` +
        'Hace falta un mapbox://styles/<usuario>/<id> propio para poder escribir en él.',
    )
  }
  return { user: match[1], id: match[2].replace(/\.json$/, '') }
}

/** The basemap import is the one whose config carries the colours. */
function basemapImport(style) {
  const entry = (style.imports ?? []).find((i) => i.config)
  if (!entry) {
    throw new Error(
      'Este estilo no tiene `imports[].config`, así que no es un estilo Standard ' +
        'y no se puede repintar por config. Decímelo y lo hago por capas.',
    )
  }
  return entry
}

/**
 * Fields that belong to your Mapbox account, not to the style. A downloaded
 * style carries them and the Styles API PUT chokes on them; Studio's import
 * is happier without them too. Stripped on write so one file works for both.
 */
const ACCOUNT_FIELDS = ['_rev', 'owner', 'id', 'draft', 'protected', 'created', 'modified']

function portable(style) {
  const copy = { ...style }
  for (const field of ACCOUNT_FIELDS) delete copy[field]
  return copy
}

/* ---- Commands ------------------------------------------------------------ */

async function pull() {
  const { user, id } = parseStyleUrl(STYLE_URL)
  const res = await fetch(
    `https://api.mapbox.com/styles/v1/${user}/${id}?access_token=${encodeURIComponent(TOKEN)}`,
  )
  const style = await res.json()
  if (style.message) throw new Error(`Mapbox: ${style.message}`)
  writeFileSync(CACHE_PATH, JSON.stringify(style, null, 2))
  console.log(`Estilo "${style.name}" guardado en mapbox/style.current.json`)
  console.log(`Colores actuales:`)
  for (const [key, value] of Object.entries(basemapImport(style).config)) {
    if (key.startsWith('color')) console.log(`  ${key.padEnd(30)} ${value}`)
  }
}

function loadStyle() {
  if (!existsSync(CACHE_PATH)) {
    throw new Error('No existe mapbox/style.current.json. Ejecutá `pull` primero.')
  }
  return JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
}

function diff() {
  const style = loadStyle()
  const theme = JSON.parse(readFileSync(THEME_PATH, 'utf8'))
  // $comment is documentation for humans, not a Mapbox key.
  const { $comment, ...palette } = theme

  const entry = basemapImport(style)
  const before = { ...entry.config }

  // Merge, don't replace: any key absent from the theme keeps its old value.
  entry.config = { ...entry.config, ...palette }

  writeFileSync(OUT_PATH, JSON.stringify(portable(style), null, 2))

  const changed = Object.keys(palette).filter((k) => before[k] !== palette[k])
  console.log(`\n${changed.length} valores cambiados:\n`)
  for (const key of changed) {
    console.log(`  ${key.padEnd(30)} ${before[key] ?? '(sin valor)'}  ->  ${palette[key]}`)
  }

  const kept = Object.keys(before).filter((k) => !(k in palette))
  console.log(`\nSin tocar (${kept.length}): ${kept.join(', ')}`)
  if ($comment) console.log('\nComentario del theme.json: ' + $comment.join(' '))

  console.log(`\nEscrito: mapbox/vault-style.json`)

  // The copy-paste route. Only 15 values live in imports[0].config, so pasting
  // that one object into Studio's JSON editor beats moving a 1.4 MB file
  // around, and it needs no token and no import dialog.
  console.log('\n--- PEGA ESTO EN STUDIO (Edit in Studio > JSON editor) ---')
  console.log('--- sustituye el objeto "config" del import "basemap" por este ---')
  console.log('"config": {')
  for (const [key, value] of Object.entries(entry.config)) {
    console.log(`  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  }
  console.log('}')
  console.log('--- fin ---')

  console.log('\nSi prefieres el archivo en vez del pegado:')
  console.log('  Styles > pasa el ratón por el estilo > (⋯) > Import style')
  console.log('  y elige vault-style.json en el diálogo. NO lo arrastres.')
  console.log('\nO, con token secreto: pnpm map:push')
}

async function push() {
  if (!existsSync(OUT_PATH)) {
    throw new Error('No existe mapbox/vault-style.json. Ejecutá `diff` primero.')
  }

  // Fail before the request instead of after: a public token always gets a
  // bare 401 from the Styles API, which explains nothing.
  if (!WRITE_TOKEN.startsWith('sk.')) {
    throw new Error(
      'Para subir hace falta un token SECRETO (sk.). El VITE_MAPBOX_TOKEN del .env es\n' +
        'público (pk.) y solo sirve para pintar el mapa en el navegador: la Styles API\n' +
        'rechaza cualquier escritura hecha con él.\n\n' +
        'Opción A — token secreto (recomendada, no tocas la app):\n' +
        '  1. account.mapbox.com > Access Tokens > Create token\n' +
        '  2. Solo marca "Styles: Read/Write" y ponle un scopes OWNER (no públicas)\n' +
        '  3. En esta terminal:\n' +
        '       $env:MAPBOX_STYLE_TOKEN = "sk.eyJ1..."   # PowerShell\n' +
        '       export MAPBOX_STYLE_TOKEN="sk.eyJ1..."   # bash / zsh\n' +
        '  4. pnpm map:push\n\n' +
        'Opción B — sin token ninguno: arrastra el archivo a Studio\n' +
        '  1. pnpm map:diff   (ya hecho: mapbox/vault-style.json existe)\n' +
        '  2. En Studio: Styles > (⋯) > Import style, y arrastra vault-style.json\n' +
        '  3. Studio te crea una copia con los colores nuevos. Luego copia su\n' +
        '     mapbox://styles/... a VITE_MAPBOX_STYLE_URL en el .env',
    )
  }

  const { user, id } = parseStyleUrl(STYLE_URL)
  const next = JSON.parse(readFileSync(OUT_PATH, 'utf8'))

  // The Styles API rejects the read-only fields a downloaded style carries.
  delete next._rev
  delete next.owner
  delete next.draft
  delete next.protected

  if (process.argv.includes('--dry-run')) {
    console.log(
      `--dry-run: se subirían ${next.layers.length} capas y el config de ` +
        `"${basemapImport(next).id}" a ${user}/${id}. No se ha escrito nada.`,
    )
    return
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  writeFileSync(join(MAPBOX_DIR, `backup-${stamp}.json`), readFileSync(OUT_PATH, 'utf8'))

  const res = await fetch(`https://api.mapbox.com/styles/v1/${user}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WRITE_TOKEN}`,
    },
    body: JSON.stringify(next),
  })

  if (!res.ok) {
    const detail = await res.text()
    const hint =
      res.status === 401 || res.status === 403
        ? '\n\nEl token es inválido o no tiene el scope styles:write sobre ESTE estilo.\n' +
          'El estilo tiene que ser tuyo: el id viene de VITE_MAPBOX_STYLE_URL en el .env.'
        : ''
    throw new Error(`Mapbox rechazó el PUT (${res.status}):\n${detail}${hint}`)
  }

  console.log(`Actualizado ${user}/${id}. Recarga la pestaña del MAP.`)
  console.log('Si lo tenías abierto en Studio, pulsa recargar ahí para no machacar el cambio.')
}

const [command = 'help'] = process.argv.slice(2)

try {
  if (!TOKEN) throw new Error('Falta VITE_MAPBOX_TOKEN en .env. Necesita scope styles:write.')
  if (command === 'pull') await pull()
  else if (command === 'diff') diff()
  else if (command === 'push') await push()
  else if (command === 'help')
    console.log('Uso: node scripts/map-style.mjs <pull|diff|push [--dry-run]>')
  else throw new Error(`Comando desconocido: ${command}`)
} catch (error) {
  console.error(`\n${error.message}\n`)
  process.exit(1)
}
