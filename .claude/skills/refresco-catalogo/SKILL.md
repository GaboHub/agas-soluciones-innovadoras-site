---
name: refresco-catalogo
description: Úsala cuando el usuario pida descargar o actualizar publicaciones, variantes, precios, reseñas, imágenes u ofertas del catálogo de AGAS desde Mercado Libre, o cuando el catálogo generado quede desactualizado frente a lo que hay publicado en la cuenta.
---

# Refresco del catálogo desde Mercado Libre

Flujo completo: `npm run barrido` → `npm run generar` → (assets de redes si
cambiaron conteos por categoría) → gates → cierre documental. Contratos en
`openspec/specs/barrido/spec.md` y `openspec/specs/catalogo/spec.md`.

## 1. Prerrequisitos

- El contenedor `pg-dev` tiene que estar corriendo: `docker ps`.
- Token de Mercado Libre vigente en la base:
  ```sh
  docker exec pg-dev psql -U agas -d mi_app_ml -At -c \
    "SELECT token_expires_at FROM ml_account WHERE ml_user_id = 3016787556"
  ```
  Lo rota sola la app `mi-app-ml` cuando corre, con 5 minutos de margen; si
  está vencido, hay que abrir esa app para que lo refresque.
- La base tiene que estar sincronizada con Mercado Libre: la lista de
  publicaciones que lee el barrido sale de la tabla `listing`. Para
  resincronizarla, correr la app `mi-app-ml` con sesión OAuth activa y llamar
  `POST /api/inventory/listings/sync`. Para comprobar que está al día,
  comparar `SELECT ml_item_id FROM listing WHERE status='active'` contra
  `GET /users/{seller_id}/items/search?status=active` (con el token vigente).
- `python3` con el paquete `requests` instalado (no hay manifiesto de
  dependencias Python en este repo).
- `.env` en la raíz, copiado de `.env.example`
  (`AGAS_ML_USER_ID`, `AGAS_CONTEXT_DIR`, `AGAS_PG_CONTAINER`, `AGAS_PG_USER`,
  `AGAS_PG_DB`). El entorno real (variables ya exportadas) manda sobre lo que
  diga el archivo.

## 2. Barrido

```sh
npm run barrido
```

Ejecuta `scripts/exportar-contexto-ml.py`, que escribe `../agas-context`
(`empresa.md`, `indice.md`, `publicaciones/<carpeta>/publicacion.md` +
imágenes). Es el único proceso con permiso de escritura sobre ese directorio;
nunca se edita a mano (ver punto 9).

El resumen final imprime procesadas, familias, errores y "Carpetas obsoletas
eliminadas". La poda de carpetas que ya no aparecen en la corrida solo se
ejecuta en un barrido completo (nunca con `--only`), y solo si el listado de
publicaciones de la base no vino vacío y no hubo errores en la corrida; si
hubo errores, la poda se omite y el resumen lo dice — hay que reintentar el
barrido antes de confiar en que `publicaciones/` está limpio.

Publicaciones eliminadas de la cuenta devuelven 403 en la API de Mercado
Libre y simplemente no aparecen en el barrido, aunque la base todavía las
tenga en `listing`.

Flags:

- `--output <ruta>`: escribe en un directorio distinto de `../agas-context`.
  Útil para descartar todo lo viejo de una vez: barrer a un directorio nuevo
  y después hacer el swap manual (alternativa a la poda incremental cuando se
  quiere partir de cero).
- `--only <MLC…>` (repetible): barre solo esas publicaciones. Con `--only`
  nunca se poda.
- `--skip-images` / `--force-images`: se excluyen entre sí.
- `--skip-videos`.

## 3. Generar

```sh
npm run generar
```

Corre `scripts/generar-catalogo.mjs` sobre `../agas-context` y regenera
`content/productos/`, `src/assets/images/productos/` y
`src/data/resenas.json`; `llms.txt` lo construye el build, no el generador.
Para generar desde otro directorio de contexto (p. ej. un worktree):
`AGAS_CONTEXT_DIR=<ruta> npm run generar`. El generador exporta
`main({ contexto, raiz, slugMap })`; `condicion` es un enum validado
(`new|used|refurbished`) y `parseReviews` devuelve `null` si no hay datos de
reseñas. Lee la salida por advertencias e interpreta cada una:

| Advertencia | Qué significa | Acción |
| :--- | :--- | :--- |
| Estado `closed` (u otro no `active`), se descarta | Publicación cerrada en Mercado Libre | Esperado; no hacer nada salvo que era la única del slug (ver fila siguiente) |
| Duplicada de una publicación de catálogo | Hay una gemela de catálogo activa para el mismo `user_product_id` | Esperado si la gemela sigue viva; revisar si el slug quedó apuntando a la publicación correcta |
| "No se encontró carpeta para el prefijo X" | Una publicación suelta que estaba mapeada por prefijo pasó a formar parte de una familia, o desapareció de Mercado Libre | Actualizar el `prefijo` de esa entrada en `SLUG_MAP`, o si el producto salió del catálogo, quitar la entrada y removerlo de `site.json`, `textos-productos.json` y los tests |
| "Carpeta sin mapeo explícito" | Publicación o familia nueva sin entrada en `SLUG_MAP` | Elegir slug y título en `SLUG_MAP`; si es una familia cuyos títulos de miembro no terminan en un nombre de color, agregar `coloresMiembros` con el color por ML item id; si los miembros forman una matriz diseño × color (sufijo de título `<diseño> <color>`), `agruparPorDiseno: true` (layout de grupos, como `fundas-silicona-grips-control-ps5`), y `etiquetas: { grupo, opcion }` cuando «Diseño»/«Color» no describen bien los ejes (caso pixel: «Funda»/«Grips») |
| "no matcheó ninguna regla de categoría" | Producto que ninguna regla de `REGLAS_CATEGORIA` reconoce | Ajustar `REGLAS_CATEGORIA` |

El generador descarta publicaciones (y miembros de familia) cuyo estado no es
`active` ANTES de resolver duplicados de catálogo: evita que una publicación
de catálogo cerrada le gane a su gemela activa y quede publicado un link
muerto (caso real: MLC4160547282 cerró y perdía contra MLC2035097907 sin este
orden).

## 4. Producto nuevo o retirado

Si el barrido trajo un producto nuevo o sacó uno del catálogo, actualizar en
el mismo cambio:

- `src/data/site.json`: `categorias[].productos` de la categoría afectada, y
  su `resumen` si el conteo lo amerita.
- `src/data/textos-productos.json`: descripción y `metaDescription` (≤160
  caracteres) para el producto nuevo. Nunca afirmar estrellas o cantidad de
  reseñas que el frontmatter de la ficha no respalde (una publicación de
  catálogo sin reseñas propias no hereda las de otra).
- Conteos exactos en `tests/unit/contenido.test.ts`,
  `tests/unit/textos-productos.test.ts`, `tests/unit/resenas.test.ts` y
  `e2e/buscador.spec.ts`.

## 5. Assets de redes

Si cambió algún conteo de productos por categoría, los conteos quedan
horneados en el carrusel de redes:

```sh
node scripts/generar-marca-redes.mjs
```

y republicar las láminas afectadas. El script valida fuentes y rasters antes
de escribir y lee `presentacionRedes` de `src/data/site.json`.

## 6. Promociones

`src/data/promociones.json` es dato curado a mano: el barrido y la
API de promociones de Mercado Libre son solo referencia, nunca fuente
automática.

Consulta de referencia, con los tres endpoints:

- `GET /seller-promotions/users/{seller_id}?app_version=v2`: lista campañas
  con `start_date`/`finish_date` en UTC.
- `GET /seller-promotions/promotions/{id}?promotion_type=<TYPE>&app_version=v2`:
  detalle (por ejemplo `fixed_percentage` de un cupón).
- `GET /seller-promotions/promotions/{id}/items?promotion_type=<TYPE>&app_version=v2&limit=50`:
  ítems de la promoción, paginado con `searchAfter`; `status` por ítem es
  `started|pending|candidate`.

Snippet para tomar el token vigente de la base y listar campañas:

```sh
TOKEN=$(docker exec pg-dev psql -U agas -d mi_app_ml -At -c \
  "SELECT access_token FROM ml_account WHERE ml_user_id = 3016787556")
python3 - "$TOKEN" <<'EOF'
import sys, requests
token = sys.argv[1]
r = requests.get(
    "https://api.mercadolibre.com/seller-promotions/users/3016787556",
    params={"app_version": "v2"},
    headers={"Authorization": f"Bearer {token}"},
)
for p in r.json():
    print(p.get("type"), p.get("status"), p.get("start_date"), p.get("finish_date"), p.get("id"), p.get("name"))
EOF
```

Qué publicar: **todas** las campañas y cupones vigentes o próximos de la
cuenta con ventana de vigencia clara (`SELLER_CAMPAIGN`,
`SELLER_COUPON_CAMPAIGN`, `DEAL` puntuales), en cada refresco. Las entradas
vencidas se quitan de `promociones.json`. Qué NO publicar: promociones que
vencen el mismo día del barrido, cupones de carritos abandonados, y los
programas automáticos SMART, PRICE_MATCHING, LIGHTNING y PRICE_DISCOUNT.

Regla de fechas: Mercado Libre cierra sus campañas al final del día en Chile
(02:59:59Z en horario de verano, 03:59:59Z en invierno), así que `hasta` en
`promociones.json` es el día anterior al `finish_date` en UTC. `desde` es el
primer día completo de vigencia en Chile: si la promoción arranca antes de
la medianoche chilena (p. ej. un `DEAL` a las 23:00), `desde` es el día
siguiente.

Sin porcentajes ni precios promocionales derivados del barrido: el
estado `candidate`/`started` de un ítem no garantiza que el descuento esté
aplicado.

Editar `src/data/promociones.json` y las fixtures de
`tests/unit/promociones.test.ts` con los datos confirmados a mano. Las
promociones se reflejan en `llms.txt` con el próximo build.

## 7. Gates

```sh
npm run check
npm run build
npm run test:py
npm run test:unit
npm run test:e2e
```

Si el puerto 4321 está ocupado por otro proyecto (`reuseExistingServer`
probaría el sitio equivocado):

```sh
E2E_PORT=4331 npm run test:e2e
```

El e2e levanta además un segundo build con un GA4 de prueba en
`E2E_PORT_GA4` (4322 por defecto); si está ocupado, fijar otro puerto libre.

## 8. Cierre

Anotar el cambio en `[Unreleased]` de `CHANGELOG.md`. Cortar release y hacer
push solo cuando el usuario lo pida, según el flujo de `README.md`.

## 9. Trampas conocidas

- **Reseñas replicadas por familia**: Mercado Libre repite el mismo bloque de
  reseñas en cada miembro de una familia. El generador deduplica por firma
  del bloque (promedio, cantidad, distribución y comentarios) antes de
  agregar; el techo conocido es que dos miembros genuinamente distintos con
  cifras idénticas y sin comentarios colapsarían en uno.
- **Publicación de catálogo cerrada con gemela activa**: el filtro de estado
  corre antes de la detección de duplicados, precisamente para que esto no
  pase.
- **`../agas-context` solo lo escribe `npm run barrido`**, nunca a mano; un
  dato mal capturado se corrige en el script de barrido o en el generador, no
  editando el markdown exportado.
- Barrer a un directorio nuevo con `--output` más swap manual es la
  alternativa cuando se quiere descartar todo lo viejo de una sola vez, en
  vez de confiar en la poda incremental.
- **`column "…" does not exist` en `npm run barrido`**: el barrido lee
  columnas de `listing`/`listing_variation` del esquema de `mi-app-ml`; es una
  migración de esa app que renombró la columna. Se corrige en las consultas de
  `scripts/exportar-contexto-ml.py` (caso real: `V27`, `seller_custom_field` →
  `seller_sku`).
