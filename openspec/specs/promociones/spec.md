# promociones Specification

## Purpose
Publicar cupones y campañas curados en `src/data/promociones.json`, filtrados por vigencia en el build.

## Requirements

### Requirement: Fuente única curada
Toda promoción publicada (página `/promociones/`, bloque de la ficha, JSON-LD y `llms.txt`) SHALL salir solo de `src/data/promociones.json`; ningún script MUST escribir ese archivo ni derivar promociones del barrido.

#### Scenario: Scripts no lo tocan
- **WHEN** corren `npm run generar` o `npm run barrido`
- **THEN** `src/data/promociones.json` no cambia

#### Scenario: Promoción solo en el barrido
- **WHEN** el barrido lista una campaña que `promociones.json` no tiene
- **THEN** ninguna superficie del sitio la publica

Rationale: el estado de un ítem en una campaña de Mercado Libre no prueba que el descuento esté aplicado.

### Requirement: Esquema del archivo curado
`src/data/promociones.json` SHALL cumplir este contrato; `desde` y `hasta` son inclusivos.

| Campo | Tipo y regla |
| --- | --- |
| `aclaracion` | string no vacío |
| `cupones[]` | `{id único, nombre no vacío, porcentaje entero 1..99, condicion no vacía, desde, hasta}` |
| `campanas[]` | `{id único, nombre no vacío, descripcion no vacía, desde, hasta}` |
| `desde`, `hasta` | `AAAA-MM-DD`, `hasta ≥ desde` |
| `faqs[]` | `{pregunta, respuesta}` no vacíos, al menos 3 |

#### Scenario: Id repetido
- **WHEN** dos cupones comparten `id`
- **THEN** la suite falla

#### Scenario: Ventana invertida
- **WHEN** una promoción tiene `hasta` anterior a `desde`
- **THEN** la suite falla

#### Scenario: Porcentaje inválido
- **WHEN** un cupón tiene `porcentaje` 0 o no entero
- **THEN** la suite falla

### Requirement: Vigencia inclusiva en fecha de Chile
Cada promoción SHALL clasificarse contra una fecha calendario `AAAA-MM-DD`: `proxima` si la fecha es anterior a `desde`, `expirada` si es posterior a `hasta` y `vigente` en otro caso.

#### Scenario: Primer día
- **WHEN** la fecha es igual a `desde`
- **THEN** la promoción es `vigente`

#### Scenario: Último día
- **WHEN** la fecha es igual a `hasta`
- **THEN** la promoción es `vigente`

#### Scenario: Día siguiente al cierre
- **WHEN** la fecha es el día posterior a `hasta`
- **THEN** la promoción es `expirada`

#### Scenario: Día anterior al inicio
- **WHEN** la fecha es el día anterior a `desde`
- **THEN** la promoción es `proxima`

Rationale: Mercado Libre cierra sus campañas al terminar el día en Chile, así que `hasta` se cura como el día anterior al `finish_date` en UTC.

### Requirement: Publicables y orden
Las superficies del sitio SHALL publicar los cupones y las campañas no expirados, primero los vigentes y luego los próximos, cada grupo ordenado por `desde` ascendente.

#### Scenario: Todo vencido
- **WHEN** la fecha es posterior a todas las ventanas
- **THEN** no hay cupones ni campañas publicables

#### Scenario: Vigente antes que próxima
- **WHEN** hay una campaña vigente y una próxima con `desde` anterior
- **THEN** la vigente va primero

### Requirement: Vigencia evaluada al construir
La vigencia SHALL evaluarse al construir el sitio con la fecha calendario de `America/Santiago` del momento del build, o con `AGAS_FECHA_BUILD` (`AAAA-MM-DD`) si está definida; el HTML MUST NOT llevar lógica de vigencia en el cliente.

#### Scenario: Build posterior al cierre
- **WHEN** se construye con `AGAS_FECHA_BUILD` igual al día posterior a `hasta` de una campaña
- **THEN** ninguna página ni `llms.txt` contiene esa campaña

#### Scenario: Sin script de vigencia
- **WHEN** se inspecciona `/promociones/` construida
- **THEN** ningún script del documento evalúa fechas de promociones

Rationale: los crawlers de IA no ejecutan JavaScript; lo que publica el HTML es lo que leen.

### Requirement: Página de promociones
`/promociones/` SHALL mostrar la aclaración; la sección `#cupones` solo si hay cupones publicables y `#campanas` solo si hay campañas publicables, con una tarjeta `[data-promo]` por promoción que muestra nombre, insignia «Vigente» o «Próximamente» y fechas `DD-MM-AAAA – DD-MM-AAAA`; un cupón SHALL mostrar su porcentaje y un enlace a la página oficial de Mercado Libre y una campaña su descripción y un enlace a la tienda; sin publicables SHALL mostrar `#promo-fallback` con enlace a la tienda y sin las secciones; al final, las preguntas frecuentes de promociones.

#### Scenario: Cupón vigente
- **WHEN** la fecha de build está dentro de la ventana de un cupón
- **THEN** su tarjeta dice «Vigente» y muestra `N%`

#### Scenario: Campaña próxima
- **WHEN** la fecha de build es anterior a `desde` de una campaña
- **THEN** su tarjeta dice «Próximamente»

#### Scenario: Nada publicable
- **WHEN** ninguna promoción es publicable
- **THEN** `#promo-fallback` es visible y `#cupones` y `#campanas` no existen

### Requirement: Bloque de promociones en la ficha
Cada ficha SHALL mostrar `#promociones-resumen` solo si hay promociones publicables, con la aclaración, cada cupón como «nombre — N%», cada campaña con sus fechas, la insignia de estado y un enlace a `/promociones/`; el bloque MUST NOT contener precios.

#### Scenario: Sin publicables
- **WHEN** ninguna promoción es publicable
- **THEN** la ficha no tiene `#promociones-resumen`

#### Scenario: Sin precios
- **WHEN** hay promociones publicables
- **THEN** el texto del bloque no calza `\$\d{1,3}(\.\d{3})*`

### Requirement: Sin descuentos derivados
El sitio MUST NOT publicar porcentajes ni precios promocionales distintos de `cupones[].porcentaje`; el precio publicado de un producto es siempre su precio referencial.

#### Scenario: Ficha con campaña vigente
- **WHEN** una campaña está vigente
- **THEN** el precio de cada ficha sigue siendo su `precioReferencial` y ningún texto muestra un precio rebajado
