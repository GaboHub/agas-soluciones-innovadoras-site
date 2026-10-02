# analitica Specification

## Purpose
Eventos de GA4 y su carga condicionada a `PUBLIC_GA4_ID`.

## Requirements

### Requirement: GA4 solo en producción con ID
El sitio SHALL cargar GA4 (un `preconnect` a `https://www.googletagmanager.com` inmediatamente después de `<meta charset>`, que sigue siendo el primer elemento del `<head>`, `gtag.js` y `gtag('config', <id>)`) solo en builds de producción con `PUBLIC_GA4_ID`; sin la variable MUST NOT emitir ninguna referencia a `googletagmanager`, y el script de eventos SHALL incluir de `site.json` solo el objeto `analitica`.

#### Scenario: Build sin ID
- **WHEN** se construye sin `PUBLIC_GA4_ID`
- **THEN** ninguna página contiene `googletagmanager`

#### Scenario: Build con ID
- **WHEN** se construye con `PUBLIC_GA4_ID=G-TEST`
- **THEN** el `<head>` empieza con `<meta charset>` seguido del `preconnect`, carga `gtag/js?id=G-TEST`, y el script de eventos no contiene datos de `site.json` ajenos a `analitica`

### Requirement: Eventos y parámetros
El sitio SHALL emitir estos eventos de GA4, con exactamente estos parámetros.

| Evento | Disparo | Parámetros |
| --- | --- | --- |
| `page_view` | automático de `gtag('config')` | — |
| `clic_saliente` | click en un enlace a un dominio de `analitica.dominiosSalientes` | `destino` (URL absoluta), `pagina` (`location.pathname`) |
| `clic_red_social` | click en un enlace a un dominio de `analitica.dominiosRedes` | `destino`, `pagina` |
| `clic_contacto` | click en un enlace `mailto:` con correo | `destino` (correo sin query), `pagina` |
| `busqueda` | 1500 ms después del último cambio en el buscador | `termino` (normalizado), `resultados` (número), `pagina` |

#### Scenario: Click a una publicación
- **WHEN** con GA4 activo se hace click en un enlace a `https://articulo.mercadolibre.cl/MLC-1`
- **THEN** se emite un solo `clic_saliente` con `destino` igual a esa URL y `pagina` igual a la ruta actual

### Requirement: Clic saliente hacia el marketplace
Un enlace SHALL contar como saliente cuando su hostname es igual a un dominio de `dominiosSalientes` o termina en `.<dominio>`; un host con el mismo sufijo sin punto, una URL relativa o una URL malformada MUST NOT contar.

#### Scenario: Subdominio
- **WHEN** el enlace es `https://articulo.mercadolibre.cl/MLC-1`
- **THEN** cuenta como saliente

#### Scenario: Sufijo sin punto
- **WHEN** el enlace es `https://nomercadolibre.cl/x`
- **THEN** no cuenta

### Requirement: Clic a redes sociales
Un click hacia un dominio de `dominiosRedes` SHALL emitir `clic_red_social` y MUST NOT emitir `clic_saliente`.

#### Scenario: Instagram
- **WHEN** se hace click en un enlace a `https://www.instagram.com/<cuenta>/`
- **THEN** se emite un solo `clic_red_social`

### Requirement: Clic de contacto
Un click en un enlace `mailto:` con correo SHALL emitir `clic_contacto` con el correo sin query como `destino`; un `mailto:` vacío, un enlace `http(s):`, uno `tel:` o uno malformado MUST NOT emitirlo.

#### Scenario: Correo con asunto
- **WHEN** el enlace es `mailto:a@b.cl?subject=Hola`
- **THEN** `destino` es `a@b.cl`

#### Scenario: mailto vacío
- **WHEN** el enlace es `mailto:`
- **THEN** no se emite evento

### Requirement: Un evento por click y listas disjuntas
Cada click SHALL evaluarse en orden `dominiosSalientes`, `dominiosRedes`, `mailto:` y emitir a lo más un evento; `dominiosSalientes` y `dominiosRedes` MUST ser disjuntas y `dominiosSalientes` MUST contener solo dominios de marketplace.

#### Scenario: Dominio en ambas listas
- **WHEN** un dominio aparece en las dos listas de `site.json`
- **THEN** la suite falla

Rationale: `clic_saliente` es el numerador de la conversión del sitio hacia Mercado Libre.

### Requirement: Búsqueda con espera y sin repetición
El buscador SHALL emitir `busqueda` 1500 ms después del último cambio, con `termino` en minúsculas, sin tildes y con espacios colapsados; MUST NOT emitir si el término normalizado es vacío o igual al último emitido, ni si no hay `gtag`; desmontar el buscador o reprogramar la espera SHALL cancelar el disparo pendiente.

#### Scenario: Escritura continua
- **WHEN** se escribe «fun» y a los 1000 ms «funda»
- **THEN** se emite un solo evento con `termino: funda` a los 2500 ms

#### Scenario: Mismo término normalizado
- **WHEN** se busca «Funda» y luego «funda »
- **THEN** se emite un solo evento

#### Scenario: Término que vuelve
- **WHEN** se busca «Funda», luego «otro» y luego «funda»
- **THEN** se emiten tres eventos

#### Scenario: Sin resultados
- **WHEN** la búsqueda no encuentra fichas
- **THEN** el evento trae `resultados: 0`
