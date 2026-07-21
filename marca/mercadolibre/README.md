# Assets de marca para Mercado Libre

Imágenes listas para subir a la página oficial de Mercado Libre
(https://www.mercadolibre.cl/pagina/agas_soluciones_innovadoras), generadas a
partir del logo y la paleta del sitio (azul `#1B3FC4`, naranja `#F07E12`,
gradiente del hero y tipografías Manrope/Inter).

| Archivo | Uso en ML | Mínimo exigido | Tamaño real |
| :--- | :--- | :--- | :--- |
| `banner-escritorio.png` | Imagen para escritorio | 1920×100 px | 3840×200 px (2×) |
| `banner-movil.png` | Imagen para móvil | 720×160 px | 1440×320 px (2×) |
| `logo.png` | Logo | 500×500 px | 1000×1000 px (2×) |

Los tres cumplen el formato aceptado (.png) y quedan muy por debajo del peso
máximo de 10 MB.

Esta carpeta NO forma parte del build del sitio: Astro solo publica `src/` y
`public/`, así que nada de `marca/` llega a `dist/` ni al deploy.
