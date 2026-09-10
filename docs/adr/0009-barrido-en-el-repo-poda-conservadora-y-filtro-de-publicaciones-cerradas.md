# 0009. Barrido en el repo, poda conservadora y filtro de publicaciones cerradas

## Estado

Aceptada, 2026-09-10. No anula a ningún ADR anterior: complementa al
[ADR 0001](0001-promociones-curadas.md) — el barrido y la API de promociones de
Mercado Libre siguen siendo solo referencia, y la curación de
`src/data/promociones.json` sigue siendo a mano.

## Contexto

El script que produce `../agas-context` vivía en otro repo
(`mi-app-ml/scripts/agas_context_export.py`), separado del proyecto que
consume su salida. El barrido vigente era del 2026-08-03, frente a la fecha de
este refresco (2026-09-10).

Al regenerar con un barrido nuevo aparecieron cuatro problemas concretos:

1. La publicación de catálogo MLC4160547282 (audífonos USB-C, la que aportaba
   4.2★ y 135 reseñas al slug `audifonos-usb-c-manos-libres` —
   `git show v1.3.0:content/productos/audifonos-usb-c-manos-libres.md | grep -A2 "^reviews:"`
   → `promedio: 4.2`, `cantidad: 135`) pasó a `closed` en Mercado Libre. El
   generador no filtraba por estado antes de resolver duplicados de catálogo,
   así que esa publicación cerrada seguía ganándole a su gemela activa
   MLC2035097907 (mismo `user_product_id`, sin reseñas) y el sitio publicaba
   un link muerto.
2. Dos publicaciones sueltas (MLC1859283513 y MLC1858910757) pasaron a ser
   miembros de familias virtuales nuevas de dos colores cada una, con títulos
   de miembro que no terminan en el nombre del color, así que el mapeo por
   sufijo de título que ya existía no alcanzaba para asignarles la etiqueta
   correcta.
3. Mercado Libre replica el mismo bloque de reseñas en todos los miembros de
   una familia: los dos miembros de la familia del kit de funda acrílica
   traen bloques de reseñas idénticos, y un miembro creado en agosto con 0
   vendidos arrastra una reseña fechada 2026-06-09 que en realidad pertenece
   al otro miembro. El agregado por familia sumaba esos bloques repetidos y
   contaba el doble de reseñas de las que existen.
4. Mover el barrido a un directorio corregido cada vez que hay un problema
   transitorio de la API arriesga borrar carpetas de `publicaciones/` que
   siguen siendo válidas: una poda ciega ante un listado vacío o una corrida
   con errores parciales podría dejar el catálogo sin publicaciones que en
   Mercado Libre siguen activas.

## Decisión

**El script de barrido pasa a vivir en este repo**, como
`scripts/exportar-contexto-ml.py` (Python 3, stdlib + `requests`), con
`npm run barrido` como entrada y configuración por `.env` (nuevo
`.env.example`, con `AGAS_CONTEXT_DIR` como la misma variable que ya leía
`generar-catalogo.mjs`). El script de `mi-app-ml` deja de usarse desde allá.
Lee el token vigente y el listado de publicaciones/variantes/familias
virtuales desde la base Postgres de la app `mi-app-ml` (contenedor Docker
`pg-dev`), y consulta la API de Mercado Libre para el resto. Esto no cambia el
ADR 0001: el barrido sigue siendo un dato de solo lectura para el generador y
para consultar promociones de referencia, nunca la fuente de lo que se
publica.

**La poda de carpetas obsoletas es conservadora a propósito.** El barrido
completo (nunca uno con `--only`) borra de `publicaciones/` lo que ya no
aparece en la corrida, pero solo si se cumplen dos condiciones: el listado de
publicaciones que trae la base no vino vacío, y la corrida no tuvo errores. El
set de carpetas protegidas se calcula ANTES de los fetch, a partir de lo que la
corrida *pretende* escribir, no de lo que efectivamente logró escribir. Ante un
fallo transitorio de la API la poda se omite y el script lo dice: es preferible
dejar una carpeta obsoleta de más que borrar una válida por un error pasajero.

**El generador descarta publicaciones no `active` antes de detectar
duplicados de catálogo**, y antes de armar familias (descarta también
miembros no activos). Así, una publicación de catálogo cerrada nunca le gana a
su gemela activa por llegar primero al filtro de duplicados.

**Se agrega la clave `coloresMiembros` al `SLUG_MAP`**: un mapeo explícito de
ML item id a etiqueta de color, para las familias cuyos títulos de miembro no
terminan en un nombre de color reconocible. Convive con el mapeo por sufijo de
título que ya existía para las familias que sí lo cumplen.

**Las familias genéricas deduplican reseñas de sus miembros no-catálogo por
firma del bloque** (promedio, cantidad, distribución y comentarios) antes de
agregarlas, en vez de sumarlas directamente. El techo conocido: dos miembros
genuinamente distintos que por coincidencia tuvieran cifras idénticas y sin
comentarios colapsarían en uno solo. Se acepta ese techo porque el caso
observado —bloques honestamente repetidos por la plataforma— es el que
domina, y no hay en el barrido una señal para distinguir una coincidencia
real de una replicación de Mercado Libre.

## Consecuencias

- El barrido pasa a depender de infraestructura de otro proyecto: el
  contenedor `pg-dev` tiene que estar corriendo y la app `mi-app-ml` tiene que
  haber dejado un token vigente en la base (la rota ella sola cuando corre).
  Sin eso, `npm run barrido` no tiene de dónde leer el listado de
  publicaciones.
- `requests` es una dependencia de Python sin manifiesto propio en este repo
  (no hay `requirements.txt` ni `pyproject.toml`): queda documentado en la
  skill de refresco, no fijado por herramienta.
- Una carpeta obsoleta puede sobrevivir en `../agas-context/publicaciones/`
  más de una corrida si el barrido sigue teniendo errores parciales; se
  limpia sola en la primera corrida completa y sin errores.
- El dedupe de reseñas por firma tiene el techo descrito arriba: si algún día
  dos miembros de una familia genuinamente distintos tienen 0 reseñas propias
  y Mercado Libre les asigna coincidentemente el mismo resumen agregado (caso
  no observado hasta ahora), el generador los contaría como uno.
- `../agas-context` pasa a ser escrito exclusivamente por `npm run barrido`
  (`scripts/exportar-contexto-ml.py`): la invariante de "solo lectura" para el
  generador de catálogo no cambia, lo que cambia es que ahora hay un único
  script en este repo, y no otro proyecto, que tiene permiso de escritura
  sobre ese directorio.
