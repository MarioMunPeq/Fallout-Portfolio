# Fallout Portfolio

Portfolio construido dentro de un **Pip-Boy 3000 (Mk I)** de Fallout 3. No es
una web con un filtro verde: hay una carcasa, un tubo de rayos catódicos y seis
módulos que funcionan.

Demo: <https://mariomunpeq.github.io/Fallout-Portfolio/>

![Pip-Boy 3000](https://img.shields.io/badge/Pip--Boy-3000-9ece6a?style=flat-square&labelColor=070b05)

## Módulos

| Tecla | Módulo | Qué hace |
| --- | --- | --- |
| `1` | **STAT** | Hoja de personaje. S.P.E.C.I.A.L. interactivo (clic en un stat para ver su lectura), perks, y estado deconditions. |
| `2` | **MISIONES** | Diario de misiones al estilo F3: lista a la izquierda, detalle a la derecha, objetivos con checklist, enlaces a repo y demo. |
| `3` | **DATA** | Terminal de la bóveda. Registros de identidad, formación, experiencia y contacto, con efecto de máquina de escribir. |
| `4` | **MAP** | Mapa de Valladolid (Mapbox GL) con los sitios donde he estudiado y trabajado, indicadores de los que quedan fuera de pantalla y lecturas de coordenadas. |
| `5` | **RADIO** | Radio con dial, espectro de barras, medidor de señal y dos emisoras con música real. Sigue sonando al cambiar de módulo. |
| `6` | **HACK** | Minijuego Termlink de Fallout. Eliges palabras del volcado de memoria; los desbloqueos `{...}` borran una palabra o devuelven intentos. |

También: teclas `1`-`6`, flechas en la barra de módulos, botón de encendido en
la carcasa (apaga y enciende el tubo de verdad), y el estado del operador
(HP / NIVEL / AP) siempre visible abajo.

## Sobre el mapa

El mapa usa [Mapbox GL](https://docs.mapbox.com/mapbox-gl-js/) con un estilo
propio hecho en Mapbox Studio. Para que encaje con el fósforo del resto de la
interfaz, el estilo debe ser monocromo verde sobre negro:

| Capa | Color |
| --- | --- |
| Fondo / tierra | `#070b05` |
| Agua (río Pisuerga) | `#12240f` |
| Edificios | relleno `#0d1509`, sin contorno |
| Zonas verdes | `#0c1a0b` |
| Carretera `trunk` / `primary` | `#9ece6a`, grosor 2.2 |
| Carretera `secondary` | `#6b8f4a` |
| Calle / residencial | `#3a4d2a` |
| Ferrocarril | `#4a5f35`, discontinuo |
| Rótulos | `#cfe6b0`, halo `#070b05` |

> El logotipo y la atribución de Mapbox **no se ocultan**: sus términos de uso
> obligan a mostrarlos. Se recolorean al fósforo y se reagrupan en la esquina
> inferior derecha (`Map.css`), de forma que ya no chocan con el panel de
> ubicación.

## Puesta en marcha

```bash
pnpm install
pnpm dev
```

### Variables de entorno

Copia `.env.example` a `.env`:

```
VITE_MAPBOX_TOKEN=pk.eyJ1Ijoi...
VITE_MAPBOX_STYLE_URL=mapbox://styles/tu-usuario/xxxxx
```

Sin estas dos variables el módulo MAP sigue funcionando: muestra
`SEÑAL GPS NO DISPONIBLE` en lugar de romperse.

## Estructura

```
src/
  components/
    Device/        Carcasa física: chapa, tornillos, dial, rejilla, botones
    Screen/        Envoltorio del tubo (crt.css)
    StatusBar/     Barra persistente de HP / NIVEL / AP
    TabNav/        Barra de módulos y subpestañas
    BootSequence/  Arranque con sprite + log POST
    tabs/          Un directorio por módulo
  data/            operator.ts, projects.ts, mapLocations.ts
  hooks/           useActiveTab, useFrameSequence
  styles/
    variables.css  Tokens: fósforo, carcasa, escala tipográfica, ritmo
    global.css     Reset + esqueleto .pip-screen + primitivas
    device.css     La carcasa
    crt.css        Scanlines, rejilla de apertura, glare, interferencia
```

### Reglas de maquetación

Estas tres reglas evitan la mayoría de los errores de solapado que arrastraba
la versión anterior:

1. `.pip-screen` es una rejilla de tres filas: módulos / cuerpo / estado. Solo
   la fila central es flexible.
2. Todo hijo de flex o rejilla lleva `min-height: 0` y `min-width: 0`.
3. Ningún módulo usa `vh`, `vw` ni alturas mínimas en píxeles. Los tamaños
   salen de los tokens `--fs-*`, que derivan de `--u`.

## Personalización

- **Fósforo**: cambia `--pipboy-color` y `--pipboy-hot` en
  `src/styles/variables.css`. Todo el resto (incluidos el mapa y el
  osciloscopio) se deriva de ahí.
- **Carcasa**: `--case-*` en el mismo archivo.
- **Escala**: `--u` define el tamaño base de toda la interfaz.
- **Proyectos del diario**: `src/data/projects.ts`.
- **Emisoras**: deja MP3 en `src/assets/audio/radio/estacion-N/`. Se recogen
  solos. Las pistas se nombran `Artista - Título`.
- **Palabras del minijuego**: `src/assets/dictionary/common.txt`, una palabra
  en minúscula por línea, solo letras, de 4 a 12 caracteres.

## Scripts

```bash
pnpm dev      # servidor de desarrollo
pnpm build    # tsc -b && vite build
pnpm lint     # eslint (incluye las reglas de React Compiler)
pnpm preview  # sirve dist/
```

Despliegue automático a GitHub Pages vía `.github/workflows/deploy.yml`.

## Créditos

- Tipografía: **Monofonto** de Ray Larabie (Typodermic Fonts).
- Icons: [Simple Icons](https://simpleicons.org/).
- Fallout es marca de Bethesda Softworks / ZeniMax. Esto es un homenaje de
  fans, sin afiliación.
