# 0004. La burbuja de Mercado Libre vuelve a todos los viewports

## Estado

Aceptada, 2026-08-06. Anula parcialmente al
[ADR 0003](0003-identidad-visual-serena-e-innovadora.md).

## Contexto

El ADR 0003 repartió el salto a Mercado Libre por dispositivo: en móvil una
barra fija inferior nueva (`BarraMercadoLibre.astro`) y en escritorio la
burbuja flotante de siempre, restringida a `hidden md:flex`. Esa barra
enlazaba siempre al mismo destino, `site.mercadolibre.tienda`, la tienda
general del vendedor (`git show a749d42:src/components/BarraMercadoLibre.astro`).

La burbuja no hace eso. En una ficha de producto recibe el permalink de la
publicación concreta y, cuando el producto tiene variantes, la isla de la
ficha le reescribe el `href` para que siga a la variante activa
(`grep -n "burbuja-mercadolibre" src/components/FichaProducto.tsx`,
`grep -n "ctaBurbujaProducto" src/pages/productos/\[slug\]/index.astro`).

El reparto por dispositivo del ADR 0003, entonces, le quitaba al visitante
móvil justamente el enlace más específico y lo reemplazaba por un CTA
genérico a la tienda. En un sitio cuyo único objetivo es derivar al
permalink correcto, y donde la mayoría del tráfico es móvil, la pérdida de
especificidad pesa más que la mayor prominencia de una barra fija.

## Decisión

La burbuja flotante vuelve a mostrarse en todos los viewports (`flex`, sin
prefijo de breakpoint, en `src/components/BurbujaMercadoLibre.astro`) y la
barra fija inferior se elimina junto con su spec e2e. `BaseLayout` deja de
montarla y pierde el padding inferior que compensaba su alto
(`git show a749d42:src/layouts/BaseLayout.astro | grep -n "pb-\["`). La
cobertura e2e de la burbuja vuelve a correr en ambos projects de Playwright,
desktop y mobile, como antes del ADR 0003.

La burbuja conserva el `active:translate-y-[2px]` que el barrido de
identidad del ADR 0003 aplicó a los botones de acción: ese barrido no se
revierte.

### Afirmaciones del ADR 0003 que dejan de valer

De la sección "Salto a Mercado Libre por dispositivo" de la Decisión del
ADR 0003:

1. «En móvil, una barra fija inferior (`BarraMercadoLibre.astro`,
   `md:hidden`, montada en `BaseLayout`)»: el componente ya no existe en el
   repo y `BaseLayout` no monta nada equivalente.
2. «en escritorio, la burbuja de siempre, ahora `hidden md:flex`»: la
   burbuja no está restringida a escritorio; su clase es `flex` en todos los
   viewports.

De la sección "Consecuencias" del ADR 0003:

3. «el home mantiene enlaces salientes a la tienda […] en la burbuja o la
   barra según el dispositivo»: la enumeración de superficies salientes del
   home sigue siendo correcta salvo por esa disyunción; hoy es la burbuja,
   en todos los dispositivos.

Todo lo demás del ADR 0003 —paleta, tipografía, firma de la baldosa, hero,
glifos de categoría, decisiones del dueño del sitio y la desviación
registrada del glifo del gamepad— sigue vigente. Por eso la anulación es
parcial.

### Decisión del dueño del sitio (2026-08-06)

Pide revertir el reparto por dispositivo del ADR 0003, con el argumento de
que la barra solo llevaba a la tienda general mientras que la burbuja lleva
al permalink de la publicación —y a la variante activa— en las fichas de
producto.

## Consecuencias

- El sitio vuelve a tener una sola superficie flotante de salto a Mercado
  Libre, con un solo destino que resolver: el que le pasa la página. Se va
  la duplicación de CTA que el ADR 0003 había introducido.
- La burbuja se superpone al contenido en móvil, que era el problema que la
  barra evitaba con el padding compensatorio del `body`. Es el
  comportamiento que el sitio tuvo desde `v1.0.0`
  (`git show v1.0.0:src/components/BurbujaMercadoLibre.astro`) y no se
  reporta como defecto.
- Con la barra se va la única superficie del sitio que respetaba el área
  segura inferior: llevaba `pb-[env(safe-area-inset-bottom)]`, y la burbuja
  se posiciona con `bottom-5` a secas
  (`grep -n "bottom-5" src/components/BurbujaMercadoLibre.astro`;
  `grep -rn "safe-area-inset" src/ | wc -l` → `0`). En un iPhone con barra
  de gestos, la burbuja queda a 20 px del borde del viewport, no del área
  segura. Es el estado previo al ADR 0003, se conoce y se acepta; si alguna
  vez molesta, el arreglo es `bottom-[calc(1.25rem+env(safe-area-inset-bottom))]`.
- La burbuja es `z-50` y el header es `sticky top-0 z-40`
  (`grep -n "z-50" src/components/BurbujaMercadoLibre.astro`;
  `grep -n "sticky top-0 z-40" src/components/Header.astro`), así que la
  burbuja queda por encima del header. Tampoco choca con el menú móvil: ese
  menú es un `<details>` cuyo panel cuelga del propio header, anclado arriba
  a la derecha (`grep -n "absolute right-0 top-12" src/components/Header.astro`),
  mientras la burbuja vive abajo a la derecha. Estado conocido, también
  previo al ADR 0003.
- El evento `clic_saliente` no requiere cambios, por la misma razón que no
  los requirió en el ADR 0003: el listener de `Analitica.astro` engancha por
  el `href` del enlace y no por componente
  (`grep -n "clic_saliente\|destinoSaliente" src/components/Analitica.astro`).
- La barra nunca llegó a un release: se introdujo en `a749d42`, posterior a
  `v1.0.0`, y se elimina antes de cortar el siguiente. Las entradas de
  `[Unreleased]` del `CHANGELOG` que la describían se retiran en lugar de
  compensarse con una entrada de reversión, porque el estado neto frente a
  `v1.0.0` es "sin cambios" en esta superficie.
- Los ADR 0001 y 0002 tratan de promociones y no afirman nada sobre el salto
  a Mercado Libre por dispositivo: este cambio no los anula.
