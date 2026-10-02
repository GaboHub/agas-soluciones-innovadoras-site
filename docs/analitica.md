# Analítica: operación

Los eventos, parámetros y reglas de GA4 viven en `openspec/specs/analitica/spec.md`. Este archivo reúne solo los pasos manuales fuera del repo.

## Registrar las dimensiones personalizadas (configuración única en GA4)

GA4 recibe los parámetros `destino`, `pagina`, `termino` y `resultados` pero no los
muestra en ningún informe hasta registrarlos como dimensiones personalizadas. Sin este
paso, el detalle del evento `clic_saliente` muestra "Parameter name" vacío. Se hace una
sola vez, en la consola:

1. **Administrar (engranaje) → Visualización de datos → Definiciones personalizadas →
   Crear dimensión personalizada**.
2. Dimensión 1: nombre `Destino`, alcance **Evento**, parámetro del evento `destino`
   (exactamente así, en minúscula).
3. Dimensión 2: nombre `Pagina`, alcance **Evento**, parámetro `pagina`.

Los eventos `clic_contacto` y `clic_red_social` reutilizan esas dos dimensiones y no
aportan parámetros nuevos: **no hay nada que configurar en GA4 por ellos**, ni en la
consola ni corriendo el script de administración de más abajo.

El evento `busqueda` reutiliza `pagina`, ya registrada (verificable en **Administrar →
Visualización de datos → Definiciones personalizadas**), así que le faltan solo `termino`
y `resultados`. Esas dos no necesitan la consola: las crea por API el script de la skill
`analitica-ga4`, con la cuenta de servicio impersonada. El mail de esa cuenta no se
escribe en este repo: vive como `GA4_ADMIN_SA` en el `.env` privado de la raíz
(gitignoreado), y el comando lo lee de ahí:

```bash
source .env
python3 ~/.claude/skills/analitica-ga4/scripts/crear_dimensiones.py \
  --impersonar "$GA4_ADMIN_SA" \
  G-WRK4VS1HLE=termino,resultados
```

El script resuelve la propiedad por measurement ID, crea cada parámetro con alcance
**Evento** y el nombre capitalizado (`Termino`, `Resultados`) —el mismo resultado que los
pasos manuales de arriba— y es idempotente: los parámetros ya registrados los reporta
como existentes en vez de duplicarlos, así que se puede volver a correr sin miedo.

`resultados` queda como dimensión, no como métrica: sirve para segmentar y filtrar por
valor exacto (por ejemplo, quedarse con los eventos de `resultados` = `0`), no para
promediarlo en un informe.

Advertencias de GA4:

- Tarda 24–48 h en empezar a poblarse en los informes.
- No es retroactivo: los eventos anteriores al registro no muestran sus parámetros en
  los informes. Para verificar en el momento que un parámetro llega bien, usar
  **Administrar → DebugView** o el informe de Tiempo real, que sí muestran parámetros
  sin registro previo.

## Qué leen los crawlers de IA

Los bots de IA no ejecutan JavaScript: GA4 no los ve. Se miran en Cloudflare:
**dashboard de la zona agassoluciones.cl → AI Crawl Control**, en modo observación (sin
bloquear ningún bot: el objetivo GEO del sitio es que las IAs lean el catálogo).

Ahí se ve qué paths lee cada crawler y con qué frecuencia, incluido `llms.txt`. Los bots
relevantes:

- **GPTBot** (OpenAI) y **ClaudeBot** (Anthropic): entrenamiento e indexación.
- **OAI-SearchBot** / **ChatGPT-User** y **Perplexity-User**: navegación en vivo cuando
  un usuario pregunta — la señal más cercana a "un usuario consultó este producto en IA".
- **PerplexityBot**: indexación del buscador de Perplexity.
- **Google-Extended**: uso de contenido para Gemini (no afecta el ranking de búsqueda).

## Cumplimiento

GA4 usa cookies. La ley chilena 21.719 de protección de datos personales rige desde
**diciembre de 2026**: antes de esa fecha hay que revisar si el sitio necesita aviso o
gestión de consentimiento para mantener GA4 tal como está.
