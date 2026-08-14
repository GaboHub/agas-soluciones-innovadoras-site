# Primera publicación en Instagram

Paquete listo para publicar el post de presentación de la tienda: las seis
láminas del carrusel más el texto del caption en `texto-del-post.txt`, que se
pega tal cual (es texto plano, con los emojis y saltos de línea ya puestos).

**Las láminas se suben en orden, de la 1 a la 6.** Cuentan una secuencia
(marca → quiénes somos → las tres categorías → compra segura), la barra de
progreso del pie marca la posición y la decoración cruza los cortes entre
láminas; publicadas en otro orden, se nota.

Para la foto de perfil de la cuenta está `../avatar.png` (1080×1080).

Las imágenes de esta carpeta son una copia de instantánea de lo publicado: las
canónicas viven en `marca/redes/` y se regeneran con
`node scripts/generar-marca-redes.mjs` a partir de `src/data/site.json`
(ver `../README.md`). Si el catálogo o el copy cambian y se regeneran las
canónicas, esta carpeta NO se actualiza sola: registra lo que salió al aire en
la primera publicación. El caption es coherente con el copy de identidad
agnóstico de categoría vigente al 2026-08-14 (la marca no se encasilla en tech;
lo tech es el catálogo actual).
