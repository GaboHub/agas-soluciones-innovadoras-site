# Tareas — especificacion-base

Dos carriles en paralelo, cada uno en su worktree y su rama, con base en el commit de `main` que contiene este cambio. Dentro de un carril, los chunks van en serie: cada uno nace del commit verificado del anterior. Cada chunk cubre con tests de spec todos los scenarios de los requirements que cita (D0, D1/D2) y termina con `npm test` en verde.

| Carril | Worktree | Rama |
| --- | --- | --- |
| TS (sitio y generador) | `../agas_site-wt/especificacion-base-ts` | `lane/especificacion-base-ts` |
| Python (barrido) | `../agas_site-wt/especificacion-base-py` | `lane/especificacion-base-py` |

Archivos compartidos entre carriles: en `package.json`, el carril Python toca solo `scripts.test` y `scripts.test:py`; el TS, solo dependencias. En `.gitignore`, el Python agrega `.venv/` al final y el TS agrega `dist-ga4/` justo después de `dist/`. Ningún carril escribe en `openspec/`.

## Carril Python

### 1. Arnés pytest y primeros requirements del barrido
Leer: D0, D2. Cierra: — (la auditoría de pytest nace con resolución y ubicación de citas; la cobertura de `barrido` se activa en 2.3).
- [ ] 1.1 `requirements-dev.txt`, `pytest.ini`, `scripts/test-py.sh`, scripts `test:py` y `test` en `package.json`, `.venv/` en `.gitignore`
- [ ] 1.2 `tests/python/conftest.py` e importación del script con el entorno fijado
- [ ] 1.3 Auditoría de pytest (`tests/python/test_auditoria_spec.py`) con sus funciones probadas sobre fixtures; la cobertura de `barrido` se activa en 2.3
- [ ] 1.4 Tests de spec de `barrido`: «Configuración por entorno», «Lectura de la base de mi-app-ml», «Token vigente antes de escribir», «Universo de publicaciones», «La base manda sobre la API», «Datos de la API de Mercado Libre», «Reintentos con backoff»

### 2. Resto del barrido y publicación no disponible
Nace de: 1. Leer: D0, D2. Cierra: `barrido`.
- [ ] 2.1 Tests de spec y código de «Publicación no disponible»
- [ ] 2.2 Tests de spec de «Estructura y contrato de salida», «Imágenes y videos», «Poda conservadora», «Resumen de la corrida», «Página oficial desde los datos del sitio», «Escritura acotada al directorio de salida»
- [ ] 2.3 Activar la cobertura de `barrido` en la auditoría de pytest

## Carril TS

| Chunk | Nace de | Leer | Cierra |
| --- | --- | --- | --- |
| 3 | base | D0, D1 | — |
| 4 | 3 | D0, D4, D5, D14 | `promociones` |
| 5 | 4 | D0, D3 | — |
| 6 | 5 | D0, D3 | — |
| 7 | 6 | D0, D3 | `catalogo` |
| 8 | 7 | D0, D6, D14 | — |
| 9 | 8 | D0, D6, D14 | `seo-geo` |
| 10 | 9 | D0, D14 | — |
| 11 | 10 | D0, D7, D14 | `sitio` |
| 12 | 11 | D0, D8, D14 | — |
| 13 | 12 | D0, D9, D14 | — |
| 14 | 13 | D0, D10 | — |
| 15 | 14 | D0, D11, D14 | — |
| 16 | 15 | D0, D11, D14 | `interfaz` |
| 17 | 16 | D0, D12 | `analitica` |
| 18 | 17 | D0, D13 | — |
| 19 | 18 | D0, D13 | `marca` |

### 3. Capa de tests de spec y auditoría
- [ ] 3.1 `vitest.config.ts` con `tests/spec/**`; comprobar que Playwright recorre `e2e/spec/**`
- [ ] 3.2 Funciones puras de `tests/spec/auditoria/` con sus unit tests sobre fixtures
- [ ] 3.3 `tests/spec/auditoria.test.ts` contra el repo con `CAPACIDADES_PROPIAS` vacía; comprobar que una cita inventada lo hace fallar

### 4. Promociones y llms.txt en el build
- [ ] 4.1 `AGAS_FECHA_BUILD`, `publicables` exportado, `PaginaPromociones.astro` y Container API en Vitest
- [ ] 4.2 Tests de spec de los 8 requirements de `promociones`
- [ ] 4.3 `src/lib/llms.ts`, `src/pages/llms.txt.ts`; borrar `public/llms.txt` y su generación en el generador; migrar los tests de `llms.txt`
- [ ] 4.4 Tests de spec de `seo-geo`: «llms.txt construido con el sitio», «Promociones en llms.txt»
- [ ] 4.5 `e2e/spec/_muestras.ts`
- [ ] 4.6 Agregar `promociones` a `CAPACIDADES_PROPIAS`

### 5. Arnés del generador y retiro de catalogo.json
- [ ] 5.1 Exportar funciones y `main({ contexto, raiz })`; ejecución solo como módulo de entrada
- [ ] 5.2 Fixture de barrido en `tests/fixtures/barrido/`
- [ ] 5.3 Retirar `src/data/catalogo.json`, su escritura y sus consumidores
- [ ] 5.4 Tests de spec de `catalogo`: «Entrada desde el barrido», «Regeneración total e idempotente», «Solo publicaciones activas», «Duplicados de catálogo», «Mapeo de carpetas a fichas», «Categoría por reglas», «Tipo de ficha», «Variantes con deep-link»

### 6. Familias, reseñas, precio y condición
- [ ] 6.1 Código de «Lectura del bloque de reseñas» y «Condición del producto» (generador y `content.config.ts`); `npm run generar` y commit de las fichas: el diff permitido en `content/productos/` es la línea `condicion` nueva
- [ ] 6.2 Tests de spec de `catalogo`: «Familia agrupada por diseño», «Familia genérica con color por miembro», «Reseñas de familia deduplicadas por firma», «Lectura del bloque de reseñas», «Precio referencial y fecha», «Condición del producto»

### 7. Resto del catálogo
- [ ] 7.1 Tests de spec de `catalogo`: «Limpieza de la descripción», «Imágenes de producto», «Frontmatter conforme al contrato», «Fichas sin stock», «Reseñas agregadas del sitio», «Consistencia de categorías y fichas»
- [ ] 7.2 Agregar `catalogo` a `CAPACIDADES_PROPIAS`

### 8. SEO y GEO sobre lo existente
- [ ] 8.1 `@id` de `Organization`
- [ ] 8.2 Tests de spec de `seo-geo`: «Sitio estático canónico», «Metadatos por página», «Títulos y descripciones únicos», «Descripción propia de cada ficha», «Miga de pan», «FAQPage solo con preguntas visibles», «SaleEvent por campaña publicable», «Acceso de rastreadores», «Contenido legible sin JavaScript»

### 9. JSON-LD nuevo y sitemap
- [ ] 9.1 `buildOffer`, `buildProductGroup`, `buildItemList`, fechas de `Article`; `publicado`/`actualizado` en las guías y en `content.config.ts`
- [ ] 9.2 `lastmod` del sitemap desde fuentes fechadas
- [ ] 9.3 Tests de spec de `seo-geo`: «JSON-LD por tipo de página», «Oferta de producto», «Producto simple», «Grupo de productos con variantes», «Article de cada guía», «ItemList en listados», «Sitemap con fechas reales»
- [ ] 9.4 Agregar `seo-geo` a `CAPACIDADES_PROPIAS`

### 10. Sitio: ficha, catálogo y home
- [ ] 10.1 Tests de spec de `sitio`: «Rutas generadas desde datos», «Precio referencial con fecha y sin stock», «Opciones de compra por tipo de ficha», «Selector y CTA de la ficha», «Burbuja de Mercado Libre», «Galería de la ficha», «Buscador del catálogo», «Orden de productos», «Home»

### 11. Sitio: navegación, datos y venta
- [ ] 11.1 `ctaFicha`, `ctaCupon` y consolidación en `ctaHeader`; Escape en el menú móvil
- [ ] 11.2 Tests de spec de `sitio`: «Página de categoría», «Navegación global», «Contacto y ventas por volumen», «Guías», «Reseñas en la ficha», «Caché de assets con hash», «Layout de la ficha», «Datos de negocio fuera de los componentes», «Venta solo en Mercado Libre»
- [ ] 11.3 Agregar `sitio` a `CAPACIDADES_PROPIAS`

### 12. Interfaz: header, foco y navegación
- [ ] 12.1 Tests de spec y código de `interfaz`: «Foco visible y no tapado», «Enlace para saltar al contenido», «Header de una fila», «Reflow sin scroll horizontal», «Estado activo de la navegación»

### 13. Interfaz: contraste, tipografía y movimiento
- [ ] 13.1 devDependency `@axe-core/playwright`
- [ ] 13.2 Tests de spec y código de `interfaz`: «Contraste del texto renderizado», «Cursor en controles», «Unidades de viewport dinámicas», «Texto legible en móvil», «Largo de línea», «Interlineado», «Movimiento reducido»

### 14. Íconos y retiro de emoji
- [ ] 14.1 `src/components/Icono.tsx` y reemplazos de D10
- [ ] 14.2 Retiro del campo `emoji` en datos, generador, esquema y contenido; `npm run generar` y commit de las fichas
- [ ] 14.3 Tests de spec de `interfaz`: «Íconos SVG sin emoji»

### 15. Interfaz: táctil, elementos fijos y visor
- [ ] 15.1 Tests de spec y código de `interfaz`: «Objetivos táctiles», «Elementos fijos sin tapar contenido», «Visor modal centrado»

### 16. Interfaz: imágenes, anuncios y estado en la URL
- [ ] 16.1 Tests de spec y código de `interfaz`: «Imágenes del primer viewport», «Anuncio de cambios dinámicos», «Estado de búsqueda y opción en la URL»
- [ ] 16.2 Agregar `interfaz` a `CAPACIDADES_PROPIAS`

### 17. Analítica
- [ ] 17.1 `AGAS_OUT_DIR`, segundo `webServer` con GA4, proyecto `ga4` y `dist-ga4/` en `.gitignore`
- [ ] 17.2 Tests de spec de los 7 requirements de `analitica`
- [ ] 17.3 Agregar `analitica` a `CAPACIDADES_PROPIAS`

### 18. Marca: tokens, assets comprometidos y hero
- [ ] 18.1 Animación de la constelación acotada a 5 s
- [ ] 18.2 Tests de spec de `marca`: «Tokens de rol como única paleta de la UI», «Contraste AA de los pares de tokens», «Tipografía», «Firma baldosa AGAS», «Colores de los assets de marca», «Paleta de los scripts igual a la de la UI», «Avatar sin baldosa», «Carpeta marca fuera del build», «Hero de marca», «Copy de identidad agnóstico de categoría», y el scenario «Dimensiones comprometidas» de «Rasters de marca generados»

### 19. Marca: generadores
- [ ] 19.1 Arnés de los dos scripts (D13), guarda real de render vacío y `presentacionRedes` en `site.json`
- [ ] 19.2 Tests de spec: scenario «Determinismo» de «Rasters de marca generados», «Guardas de los generadores de marca», «Textos de los assets desde los datos»
- [ ] 19.3 Regenerar los rasters y comprobar que no cambiaron, o explicar la diferencia
- [ ] 19.4 Agregar `marca` a `CAPACIDADES_PROPIAS`; la lista queda completa

## Cierre (documentador)

- [ ] 20.1 Integrar los dos carriles con squash y correr la suite completa sobre `main`
- [ ] 20.2 Pase documental de D15, `openspec archive especificacion-base` y borrado del directorio del cambio
