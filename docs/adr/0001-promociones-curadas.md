# 0001. Promociones y cupones curados a mano, nunca derivados del barrido

## Estado

Aceptada (2026-07-23) — enmendada por ADR 0002 en lo relativo al filtrado en cliente.

## Contexto

Hasta ahora el sitio operaba bajo la invariante de no publicar nunca promociones con vencimiento, junto con la de no publicar stock. El usuario decidió que sí quiere mostrar las promociones y cupones vigentes de su tienda de Mercado Libre, porque son un incentivo real de compra.

Al revisar el barrido de `../agas-context/publicaciones/*/publicacion.md` se encontró que cada publicación trae una sección `### Promociones y cupones` con entradas de tipo `DEAL`, `SELLER_CAMPAIGN`, `SELLER_COUPON_CAMPAIGN`, etc., cada una con un campo `estado: candidate|started|pending`.

Se verificó que ese `estado` no es una señal confiable de que el descuento esté realmente aplicado sobre el precio de la publicación:

- La campaña con `estado: started` aparece en casi todas las 104 publicaciones del barrido.
- Solo 2 de esas 104 publicaciones tienen un precio efectivamente rebajado.
- Esas 2 publicaciones con precio rebajado tienen exactamente los mismos estados de campaña que publicaciones sin ningún descuento aplicado.

En cambio, los metadatos de cada campaña (id, nombre, fechas de vigencia) sí son consistentes entre publicaciones: son propiedades de la campaña en sí, no del ítem individual, y no dependen del `estado` reportado por ítem.

Conclusión: no existe en el barrido ninguna señal automatizable para saber si un porcentaje de descuento está realmente aplicado a un producto. Generar promociones o precios rebajados a partir de ese dato sería publicar información falsa.

## Decisión

Las promociones y cupones que se publican en el sitio viven exclusivamente en `src/data/promociones.json`, un dato de negocio curado a mano por el usuario, igual que el resto de `src/data/*.json` que no proviene del generador de catálogo.

- Nunca se autogenera ni se deriva contenido de promociones desde `scripts/generar-catalogo.mjs` ni desde el barrido de `../agas-context`.
- No se publican porcentajes de descuento ni precios promocionales calculados a partir del barrido: solo los que el usuario confirma a mano en el JSON curado.
- Cada promo (cupón o campaña) declara una ventana de vigencia explícita (`desde`/`hasta`, ambos inclusivos).
- El sitio deja siempre explícito que el beneficio se obtiene comprando directamente en la publicación de Mercado Libre, nunca en el sitio.
- La vigencia se filtra dos veces: en build (para no incluir contenido ya vencido en el HTML generado) y en cliente (para que una promo que vence mientras la página sigue cacheada deje de mostrarse).

## Consecuencias

- El JSON de promociones requiere mantenimiento manual cada vez que cambian las campañas o cupones de Mercado Libre; no hay automatización posible mientras el barrido no traiga una señal confiable de aplicación real del descuento.
- A cambio, el sitio nunca afirma un descuento que Mercado Libre no está aplicando efectivamente, preservando la honestidad del catálogo.
- El filtrado doble de vigencia (build + cliente) agrega una pequeña superficie de lógica compartida (`src/lib/promociones.ts`) que debe mantenerse sincronizada entre ambos contextos.
