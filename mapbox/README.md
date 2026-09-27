# Mapa de Mapbox

El estilo es un **Mapbox Standard**. Eso significa que no tiene capas propias:
todas las calles, edificios y etiquetas vienen del basemap importado, y **los
14 colores viven en un único objeto `config`** dentro de `imports[0]`. Ese
objeto *es* el tema. No hay ni una capa que ir a buscar.

```
mapbox/
  theme.json            ← lo único que editas. Solo colores.
  style.current.json    ← caché del estilo vivo (no se versiona)
  vault-style.json      ← el estilo repintado, listo para importar (no se versiona)
  backup-<fecha>.json   ← copia automática antes de cada subida (no se versiona)
```

## Repintar

```bash
pnpm map:pull     # descarga el estilo actual y te enseña los colores que hay
pnpm map:diff     # fusiona theme.json sobre él -> vault-style.json
pnpm map:push     # lo sube. La app no cambia de estilo ni de URL
```

`pnpm map:push -- --dry-run` te dice qué subiría sin escribir nada.

Antes de cada `push` se guarda una copia en `mapbox/backup-<fecha>.json`.

## Cambiar la paleta

Edita los hex de `theme.json` y vuelve a lanzar `map:diff` + `map:push`. No hace
falta tocar nada más. Las claves que **no** estén en `theme.json` se conservan
tal cual, porque el script fusiona en vez de sustituir.

## Arrastrarlo a Mapbox en vez de subirlo

`pnpm map:diff` deja `mapbox/vault-style.json`, que es un estilo completo. En
Mapbox Studio: **Styles → (⋯) → Import style**, lo arrastras y te crea una
copia con los colores nuevos. El style id cambia, así que luego tienes que
copiar el nuevo `mapbox://styles/...` a `VITE_MAPBOX_STYLE_URL` en el `.env`.

**No necesita ningún token**, así que es la vía si no quieres crear un secreto.
Para el uso normal, `map:push` es mejor: repinta el estilo que ya tienes
apuntado y no tocas la configuración de la app.

## El token

`map:push` usa la Styles API, que **solo acepta tokens secretos**. El
`VITE_MAPBOX_TOKEN` del `.env` es público (`pk.`): sirve para pintar el mapa en
el navegador, pero la Styles API rechaza cualquier escritura hecha con él
(`401 Not Authorized - Invalid Token`). Por eso el script usa una variable
aparte, `MAPBOX_STYLE_TOKEN`, que pasas solo en la terminal y nunca se guarda.

Para subir desde la terminal:

```powershell
# account.mapbox.com > Access Tokens > Create token
# marca SOLO "Styles: Read/Write". Scopes: OWNER. No lo publiques.
$env:MAPBOX_STYLE_TOKEN = "sk.eyJ1..."
pnpm map:push
```

En bash/zsh sería `export MAPBOX_STYLE_TOKEN="sk.eyJ1..."`.

La variable desaparece al cerrar la terminal, que es justo lo que quieres con
un secreto. Si prefieres no crear ninguno, usa la vía de arrastrar a Studio
que se explica más abajo: no necesita token.

Si el `PUT` te devuelve 401 o 403 con un token `sk.` que sí acabas de crear,
el problema es que el estilo debe ser tuyo. El id sale de
`VITE_MAPBOX_STYLE_URL` en el `.env`.

## Claves disponibles

Si algún día quieres cambiar algo más, estas son todas las que acepta el
config. Las que no son colores controlan qué se dibuja.

| Clave | Efecto |
|---|---|
| `colorLand` | suelo |
| `colorWater` | agua, ríos |
| `colorGreenspace` | parques y zonas verdes |
| `colorBuildings` | edificios |
| `colorCommercial` / `colorIndustrial` / `colorEducation` / `colorMedical` | uso de suelo por categoría |
| `colorMotorways` | autopistas |
| `colorTrunks` | vías rápidas |
| `colorHdRoads` | calles de detalle fino (la retícula del centro) |
| `colorRoads` | resto de calles |
| `colorPlaceLabels` | topónimos |
| `colorRoadLabels` | rótulos de calle |
| `theme` | contraste del basemap: `faded` o `standard` |
| `show3dObjects`, `showPedestrianRoads`, `showHdRoads`, `showTransitLabels` | capas |
| `showPlaceLabels`, `showRoadLabels`, `showPointOfInterestLabels`, `showLandmarkIcons`, `showLandmarkIconLabels` | etiquetas |
| `font` | tipografía de las etiquetas (`DIN Pro`, `Noto Sans Regular`, …) |
| `lightPreset` | `day`, `night`, `dawn`, `dusk` |

Ahora mismo `show3dObjects` y `showPedestrianRoads` están en `false` y la vista
tiene `pitch: 60`, así que el mapa se ve en 3D aunque el componente fuerce
`pitch: 0` en el mapa. Si algún día quieres el plano totalmente cenital, eso se
cambia en Studio, no aquí.
