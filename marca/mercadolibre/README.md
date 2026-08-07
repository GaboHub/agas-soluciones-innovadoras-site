# Assets de marca para Mercado Libre

Imágenes listas para subir a la página oficial de Mercado Libre
(https://www.mercadolibre.cl/pagina/agas_soluciones_innovadoras), generadas a
partir del logo y de la paleta «Acero y cobre» del sitio: acero `#24455C`
(baldosa y degradado), cobre `#9E5220` (travesaño sobre claro y resplandor),
cobre claro `#C8813F` (travesaño sobre oscuro) y acero claro `#DCE6ED`
(bajada "SOLUCIONES INNOVADORAS"), con Sora para los titulares e Inter para el
texto de apoyo.

| Archivo | Uso en ML | Mínimo exigido | Tamaño real |
| :--- | :--- | :--- | :--- |
| `banner-escritorio.png` | Imagen para escritorio | 1920×100 px | 3840×200 px (2×) |
| `banner-movil.png` | Imagen para móvil | 720×160 px | 1440×320 px (2×) |
| `logo.png` | Logo | 500×500 px | 1000×1000 px (2×) |

Los tres cumplen el formato aceptado (.png) y quedan muy por debajo del peso
máximo de 10 MB.

## Cómo se regeneran

```sh
node scripts/generar-marca-ml.mjs
```

El script vuelve a producir los tres archivos de esta carpeta y, de paso, los
rasters del sitio (`public/logo.png`, `public/apple-touch-icon.png`,
`src/assets/images/logo.png`); imprime las dimensiones de cada salida al
terminar. No se editan a mano: un cambio de paleta o de textos se hace en el
script o en `src/data/site.json` —de donde salen el chip y la línea de envío
de los banners— y se vuelve a correr. Las salidas son deterministas, así que
una corrida sin cambios de entrada deja los archivos idénticos.

Necesita las fuentes convertidas de `marca/fuentes/`; sin ellas el script
aborta en vez de caer a una tipografía de sistema.

Esta carpeta NO forma parte del build del sitio: Astro solo publica `src/` y
`public/`, así que nada de `marca/` llega a `dist/` ni al deploy.

Contexto y decisiones de la identidad en
`docs/adr/0005-paleta-acero-y-cobre-y-assets-de-marca-reproducibles.md`.
