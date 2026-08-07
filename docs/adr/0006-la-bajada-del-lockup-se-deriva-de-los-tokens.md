# 0006. La bajada del lockup se deriva de los tokens

## Estado

Aceptada, 2026-08-06. Anula parcialmente al
[ADR 0005](0005-paleta-acero-y-cobre-y-assets-de-marca-reproducibles.md).

## Contexto

El ADR 0005 recoloreó la marca a «Acero y cobre» y dejó una desviación
registrada: la bajada "SOLUCIONES INNOVADORAS" de los lockups no entró en ese
recoloreo y conservó tres grises azulverdosos de la etapa petróleo, uno
distinto por asset para el mismo elemento (`#4E5E63` en el lockup sobre claro,
`#9BB6BC` en el lockup sobre oscuro, `#B9C9CF` en la constante `arenaTexto`
del script de assets). Los tres cumplían AA, así que no era un problema de
accesibilidad sino de identidad: ninguno se derivaba de la paleta vigente, y
el nombre de la constante decía "arena" sobre un valor gris frío.

Ese mismo ADR dejó la vía de arreglo abierta con dos preguntas: unificar los
tres en un valor derivado de la paleta, y decidir si el elemento merece token
propio. Este ADR las responde.

La desviación nunca llegó a un release: se introdujo en `b274eb5`, posterior a
`v1.0.0` (`git tag --list` → solo `v1.0.0`), y se cierra antes de cortar el
siguiente.

## Decisión

**La bajada no tiene color propio: se deriva de los tokens**, con un solo
criterio por tipo de superficie.

| Superficie | Token | Valor | Dónde |
| :--- | :--- | :--- | :--- |
| Claras | `primario` | `#24455C` | `src/assets/images/agas-lockup.svg` |
| Oscuras | `primario-claro` | `#DCE6ED` | `src/assets/images/agas-lockup-blanco.svg` y `bajadaClara` en `scripts/generar-marca-ml.mjs` |

Los tres puntos donde se dibuja la bajada, con
`grep -n "SOLUCIONES INNOVADORAS" src/assets/images/agas-lockup.svg src/assets/images/agas-lockup-blanco.svg scripts/generar-marca-ml.mjs`.
Los grises que reemplaza ya no existen en el código:
`grep -rn "4E5E63\|9BB6BC\|B9C9CF\|arenaTexto" src/ scripts/ | wc -l` → `0`.

La constante del script cambia de nombre además de valor: `arenaTexto` →
`bajadaClara`. El nombre viejo describía un color que el valor no tenía.

**Sin token nuevo**, que es la segunda mitad de la pregunta que dejó abierta el
ADR 0005. La bajada no necesita token porque no es un color propio: reusa los
valores de `primario` y `primario-claro`. En los SVG y en el script esos
valores van escritos literales, como el resto de los assets de marca, porque
ni un SVG ni un script que corre fuera de Astro pueden leer los tokens de
Tailwind. Es la misma duplicación deliberada que el ADR 0005 registró para la
constante `PALETA`, ahora extendida a dos call sites más, y con el mismo punto
a vigilar: un cambio futuro de `primario` o `primario-claro` tiene que
replicarse a mano en los dos SVG y en `PALETA`.

**Contraste.** El cambio sube las tres cifras que el ADR 0005 había medido
para la desviación:

| Superficie | ADR 0005 | Ahora | Medida contra |
| :--- | :--- | :--- | :--- |
| Lockup sobre claro (header) | `#4E5E63`, 6.11:1 | `#24455C`, 9.11:1 | `fondo` |
| Lockup sobre oscuro (footer) | `#9BB6BC`, 6.42:1 | `#DCE6ED`, 10.85:1 | `primario-oscuro` |
| Bajada de los banners de ML | `#B9C9CF`, 5.92:1 | `#DCE6ED`, 7.97:1 | `primario`, extremo claro del degradado |

Cada par se reproduce con el mismo helper del ADR 0005:

```sh
python3 -c "
import sys
def l(h):
    c=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c]
    return .2126*c[0]+.7152*c[1]+.0722*c[2]
a,b=sorted(map(l,sys.argv[1:]),reverse=True)
print(round((a+.05)/(b+.05),2))
" '#24455c' '#f5f3f0'
```

**Las dos superficies que no son un color sólido.** El header es
`bg-fondo/95` con `backdrop-blur`
(`grep -n "bg-fondo/95" src/components/Header.astro`), así que el fondo real
es `fondo` compuesto sobre lo que pase por debajo; el 9.11:1 de la tabla es
contra `fondo` opaco, comparable con el 6.11:1 del ADR 0005, que se midió
igual. Y la bajada de los banners cae sobre un degradado de `primario` a
`primario-oscuro`
(`grep -n "linearGradient" -A 3 scripts/generar-marca-ml.mjs`), no sobre un
sólido. Barriendo las dos cosas —el header compuesto sobre cada token de
`@theme` y sobre blanco, y el degradado muestreado de punta a punta—:

```sh
python3 -c "
import re
def l(h):
    c=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c]
    return .2126*c[0]+.7152*c[1]+.0722*c[2]
def cr(x,y):
    a,b=sorted([l(x),l(y)],reverse=True); return round((a+.05)/(b+.05),2)
def mezcla(fg,bg,alfa):
    return '#%02x%02x%02x' % tuple(round(alfa*int(fg[i:i+2],16)+(1-alfa)*int(bg[i:i+2],16)) for i in (1,3,5))
tokens=re.findall(r'--color-([a-z-]+): (#[0-9a-f]{6})', open('src/styles/global.css').read())
fondos=[v for k,v in tokens if k!='meli-tinta']+['#ffffff']
header=[cr('#24455c', mezcla('#f5f3f0',f,0.95)) for f in fondos]
print('header:', min(header), max(header))
print('banners:', [cr('#dce6ed', mezcla('#16303f','#24455c',t/4)) for t in range(5)])
"
```

→ `header: 8.31 9.19` y `banners: [7.97, 8.61, 9.38, 10.1, 10.85]`. El peor
caso del header es con `tinta` pasando por debajo (8.31:1) y el de los
banners es el extremo `primario` del degradado (7.97:1); ninguna mezcla
intermedia queda fuera de esos rangos. El resplandor de acento de los banners
no interviene: es un `radialGradient` centrado en `cx="88%" cy="8%"` con
`r="65%"`, y el lockup se dibuja contra el margen izquierdo, fuera de su
alcance.

**Qué assets cambian.** Solo los dos banners con bajada. Los otros cuatro
rasters que produce el script (`marca/mercadolibre/logo.png`,
`public/logo.png`, `public/apple-touch-icon.png`,
`src/assets/images/logo.png`) no dibujan la bajada y quedaron byte a byte
iguales al regenerarlos:
`git diff --stat 961271c v1.1.0 -- marca/ public/ src/assets/images/`.

### Decisiones del dueño del sitio (2026-08-06)

1. Aprueba unificar la bajada derivándola de los tokens —`primario` sobre
   superficies claras, `primario-claro` sobre oscuras— en vez de conservar
   los grises heredados de la etapa petróleo.
2. La regla que queda: la bajada se pinta con tokens de la paleta vigente y
   no lleva colores propios.

### Afirmaciones del ADR 0005 que dejan de valer

1. De la sección **Contraste**: «Dentro de los assets de marca, la bajada
   "SOLUCIONES INNOVADORAS" del lockup del header queda en 6.11:1 y se trata
   en la desviación registrada de más abajo». Hoy queda en 9.11:1 sobre
   `fondo` y no hay desviación que tratar.
2. De la sección **Travesaños "todo cobre" en la marca**: «la bajada
   "SOLUCIONES INNOVADORAS" de los dos lockups es la excepción y queda como
   desviación registrada». Deja de ser la excepción del recoloreo de marca.
3. La sección entera **Desviación registrada, pendiente de revisión**, con su
   tabla de tres hex y sus tres cifras de contraste. En particular, su
   «`grep -rn "4E5E63\|9BB6BC\|B9C9CF" src/ scripts/` los lista los tres»:
   ese comando devuelve hoy cero líneas. La constante `arenaTexto` que la
   sección cita tampoco existe.
4. De las **Consecuencias**: «Los grises de la bajada del lockup (`#4E5E63`,
   `#9BB6BC`, `#B9C9CF`) también están fuera de `@theme`, pero eso **no** es
   una decisión: es la desviación registrada más arriba». Ya no hay grises, y
   lo que queda fuera de `@theme` —los valores de `primario` y
   `primario-claro` copiados en los assets— sí es una decisión, tomada aquí.

Sigue vigente todo lo demás del ADR 0005: la paleta «Acero y cobre» y su tabla
token a token, los travesaños todo cobre con el `#C8813F` y su 3.20:1 aceptado
por ser elemento gráfico, la generación de los seis rasters por script con su
guarda de fuente y sus salidas deterministas, el hero sin colores literales,
la constelación con su margen y su spec e2e, las utilidades con opacidad bajo
AA desde `v1.0.0` y la lección de barrido de color. Por eso la anulación es
parcial.

## Consecuencias

- La lección de barrido del ADR 0005 se aplicó a sí misma y valió la pena: el
  grep por los tres hex encontraba dos lugares del ADR 0005, pero la
  desviación estaba afirmada en cuatro; los otros dos la nombran en prosa, sin
  hex. Al anular un ADR, el barrido va por el concepto además de por el valor
  (`grep -n "bajada\|SOLUCIONES" docs/adr/*.md`).
- La bajada de los banners es texto sobre un degradado, no sobre un sólido:
  la cifra que vale es la del peor extremo, y queda arriba el comando que la
  mide en vez de un solo par de colores.
- Ningún test observa el color de la bajada —las suites no inspeccionan
  `fill` de los assets (`grep -rn "fill=" e2e/ tests/ | wc -l` → `0`)—, así
  que una regresión de este tipo no la atrapa la suite: la atrapa el barrido
  de literales de color contra los valores de `@theme`.
- Con esto se cierra la única desviación de identidad que el ADR 0005 había
  dejado pendiente de revisión. Siguen en pie, porque son decisiones
  aceptadas y no pendientes, el `#C8813F` del travesaño en 3.20:1 y la
  desviación del glifo del gamepad que viene del ADR 0003.
- Los ADR 0001, 0002 y 0004 no afirman nada sobre color de marca y este
  cambio no los toca.
