import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import sharp from 'sharp';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(dirname, '..');
const CONTEXT_DIR = path.resolve(
  ROOT_DIR,
  process.env.AGAS_CONTEXT_DIR ?? '../agas-context',
);
const PUBLICACIONES_DIR = path.join(CONTEXT_DIR, 'publicaciones');
const EMPRESA_MD = path.join(CONTEXT_DIR, 'empresa.md');

const PRODUCTOS_CONTENT_DIR = path.join(ROOT_DIR, 'content/productos');
const PRODUCTOS_IMAGES_DIR = path.join(ROOT_DIR, 'src/assets/images/productos');
const GUIAS_CONTENT_DIR = path.join(ROOT_DIR, 'content/guias');
const DATA_DIR = path.join(ROOT_DIR, 'src/data');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const SITE_URL = 'https://agassoluciones.cl';

const LIMITE_IMAGENES_SIMPLE = 7;
const LIMITE_IMAGENES_VARIANTE = 7;
const LIMITE_IMAGENES_MIEMBRO = 7;
const LADO_MAYOR_MAXIMO = 800;
const CALIDAD_WEBP = 80;

const CATEGORIAS = {
  'nintendo-switch': {
    nombre: 'Nintendo Switch',
    emoji: '🎮',
    resumen: 'Láminas, estuches y kits de protección para Nintendo Switch, Switch OLED y Switch 2.',
  },
  'playstation-5': {
    nombre: 'PlayStation',
    emoji: '🕹️',
    resumen: 'Fundas, grips y cargadores para controles de PlayStation 5.',
  },
  audio: {
    nombre: 'Audio',
    emoji: '🎧',
    resumen: 'Audífonos con cable USB-C y Bluetooth TWS inalámbricos para tu celular.',
  },
  otros: {
    nombre: 'Otros accesorios',
    emoji: '🔌',
    resumen: 'Otros productos de nuestra tienda.',
  },
};

const REGLAS_CATEGORIA = [
  { patron: /audifonos|audífonos|manos libres/i, categoria: 'audio' },
  { patron: /ps5|ps4|xbox|joystick|control/i, categoria: 'playstation-5' },
  { patron: /switch|nintendo/i, categoria: 'nintendo-switch' },
];

const SLUG_MAP = [
  { prefijo: 'MLC3560689528', slug: 'lamina-vidrio-nintendo-switch', titulo: 'Lámina Protectora Vidrio Templado Nintendo Switch 1' },
  { prefijo: 'MLC3556230302', slug: 'pack-2-laminas-vidrio-nintendo-switch', titulo: 'Pack 2 Lámina Vidrio Templado Nintendo Switch 1' },
  { prefijo: 'MLC1794079105', slug: 'kit-estuche-vidrio-nintendo-switch', titulo: 'Kit Estuche Goma Rígido + Vidrio Switch 1 Rojo' },
  { prefijo: 'MLC3571625690', slug: 'lamina-vidrio-switch-oled', titulo: 'Lámina Vidrio Templado Switch OLED' },
  { prefijo: 'MLC3572542490', slug: 'pack-2-laminas-vidrio-switch-oled', titulo: 'Pack 2 Lámina Vidrio Templado Switch OLED' },
  { prefijo: 'MLC1794002211', slug: 'kit-estuche-vidrio-switch-oled', titulo: 'Kit Estuche Goma Rígido + Vidrio Switch OLED' },
  { prefijo: 'MLC3535869068', slug: 'lamina-vidrio-nintendo-switch-2', titulo: 'Lámina Vidrio Templado Switch 2' },
  { prefijo: 'MLC3543433272', slug: 'pack-2-laminas-vidrio-switch-2', titulo: 'Pack x2 Lámina Mica Vidrio Switch 2' },
  { prefijo: 'MLC1880083137', slug: 'pack-3-laminas-vidrio-switch-2', titulo: 'Pack x3 Lámina Mica Vidrio Switch 2' },
  { prefijo: 'MLC3412797212', slug: 'set-9en1-nintendo-switch-2', titulo: 'Set Switch 2 Estuche Mica Fundas Grips Carcasa (9 en 1)' },
  { prefijo: 'MLC3384790604', slug: 'estuche-rigido-vidrio-switch-2', titulo: 'Estuche Rígido Switch 2 + Lámina Vidrio Negro' },
  { prefijo: 'MLC1813007563', slug: 'kit-5en1-nintendo-switch-2', titulo: 'Kit 5en1 Switch 2 Estuche Grip Case Vidrio' },
  { prefijo: 'MLC1801369167', slug: 'estuche-goma-rigido-switch-2', titulo: 'Estuche Goma Negro Rígido Switch 2' },
  { prefijo: 'MLC1961379387', slug: 'kit-estuche-eva-switch-2', titulo: 'Kit Estuche EVA Lámina Vidrio Grips Switch 2' },
  { prefijo: 'familia-kit-2-fundas-silicona-disenos-4-grips-pa', slug: 'fundas-silicona-grips-control-ps5', titulo: 'Kit 2 Fundas Silicona Diseños + 4 Grips Control PS5' },
  { prefijo: 'familia-cargador-dual-estacion-base-de-carga-par', slug: 'cargador-dual-controles-ps5', titulo: 'Cargador Dual Estación de Carga Controles PS5' },
  { prefijo: 'MLC3516221982', slug: 'kit-funda-silicona-grips-control-ps5', titulo: 'Kit Funda Control PS5 Silicona + 4 Grips Análogos' },
  { prefijo: 'MLC3464125204', slug: 'pack-4-grips-joystick', titulo: 'Pack 4 Grips Goma Joystick PS5 / PS4 / Xbox' },
  { prefijo: 'MLC3559025366', slug: 'estuche-rigido-control-ps5', titulo: 'Estuche Rígido Control PS5 Goma Anti Golpes' },
  { prefijo: 'MLC1859283513', slug: 'kit-estuche-funda-acrilica-control-ps5', titulo: 'Kit Estuche Rígido Funda Acrílico Grips PS5' },
  { prefijo: 'MLC1858910757', slug: 'kit-funda-acrilica-grips-control-ps5', titulo: 'Kit Funda Carcasa Acrílica PS5 + 4 Grips Transparente' },
  { prefijo: 'MLC2035097907', slug: 'audifonos-usb-c-blanco', titulo: 'Audífonos USB Tipo C Manos Libres Blanco' },
  { prefijo: 'MLC4160547282', slug: 'audifonos-usb-c-manos-libres', titulo: 'Audífonos Manos Libres Tipo C para Celular' },
  { prefijo: 'familia-audifonos-bluetooth-tws-ultrapods-pro-in', slug: 'audifonos-bluetooth-tws', titulo: 'Audífonos Bluetooth TWS Ultrapods Pro' },
];

const SLUG_FUNDAS_PS5 = 'fundas-silicona-grips-control-ps5';
const COLORES_FUNDAS_PS5 = ['Amarillo', 'Azul', 'Blanco', 'Gris', 'Morado', 'Negro', 'Rojo', 'Rosado', 'Verde'];

function limpiarEspacios(texto) {
  return texto
    .replace(/_{2,}/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ /g, ' ')
    .trim();
}

function parseMonto(texto) {
  return Number(texto.replace(/\./g, '').replace(/,/g, ''));
}

function slugificar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asignarCategoria(titulo) {
  for (const regla of REGLAS_CATEGORIA) {
    if (regla.patron.test(titulo)) return regla.categoria;
  }
  return 'otros';
}

function parseEmpresa() {
  const texto = readFileSync(EMPRESA_MD, 'utf8');
  const nickname = texto.match(/^# (.+)$/m)?.[1]?.trim() ?? '';
  const sellerId = texto.match(/\*\*Seller ID:\*\*\s*(\S+)/)?.[1] ?? '';
  const tiendaUrl = texto.match(/\*\*Tienda:\*\*\s*(\S+)/)?.[1] ?? '';
  const paginaOficialUrl = texto.match(/\*\*Página oficial:\*\*\s*(\S+)/)?.[1] ?? '';
  const nivel = texto.match(/\*\*Nivel:\*\*\s*(\S+)/)?.[1] ?? '';
  const transacciones = Number(texto.match(/\*\*Transacciones totales:\*\*\s*(\d+)/)?.[1] ?? 0);
  const completadas = Number(texto.match(/\*\*Transacciones completadas:\*\*\s*(\d+)/)?.[1] ?? 0);
  const fechaGenerado = texto.match(/_Generado el (\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
  return {
    nickname,
    sellerId,
    tiendaUrl,
    paginaOficialUrl,
    reputacion: { nivel, transacciones, completadas },
    fechaGenerado,
  };
}

function extraerSeccion(texto, encabezado, siguientesEncabezados) {
  const inicioRegex = new RegExp(`(^|\\n)###\\s*${encabezado}\\s*\\n`);
  const inicioMatch = texto.match(inicioRegex);
  if (!inicioMatch) return '';
  const inicio = inicioMatch.index + inicioMatch[0].length;
  let fin = texto.length;
  for (const siguiente of siguientesEncabezados) {
    const regex = new RegExp(`\\n###\\s*${siguiente}\\s*\\n`);
    const match = texto.slice(inicio).match(regex);
    if (match) {
      fin = Math.min(fin, inicio + match.index);
    }
  }
  const finGenerico = texto.slice(inicio).match(/\n##\s/);
  if (finGenerico) fin = Math.min(fin, inicio + finGenerico.index);
  return texto.slice(inicio, fin).trim();
}

function limpiarBullet(linea) {
  return linea.replace(/^[\t ]*[•*][\t ]*/, '').replace(/^[\t ]*-[\t ]+/, '').trim();
}

function esLineaBullet(linea) {
  return /^[\t ]*[•*-][\t ]+\S/.test(linea);
}

function extraerFaqs(bloqueFaqRaw) {
  if (!bloqueFaqRaw) return [];
  const normalizado = bloqueFaqRaw
    .split('\n')
    .map((linea) => (esLineaBullet(linea) ? limpiarBullet(linea) : linea))
    .join('\n');

  if (/(^|\n)\s*P:\s/.test(normalizado)) {
    const faqs = [];
    const regex = /P:\s*([\s\S]*?)\s*R:\s*([\s\S]*?)(?=(?:\n\s*P:\s)|$)/g;
    for (const match of normalizado.matchAll(regex)) {
      const pregunta = limpiarEspacios(match[1].replace(/\n/g, ' '));
      const respuesta = limpiarEspacios(match[2].replace(/\n/g, ' '));
      if (pregunta && respuesta) faqs.push({ pregunta, respuesta });
    }
    return faqs;
  }

  const posiciones = [...normalizado.matchAll(/¿[^?]*\?/g)];
  if (posiciones.length > 0) {
    const faqs = [];
    for (let i = 0; i < posiciones.length; i += 1) {
      const actual = posiciones[i];
      const siguiente = posiciones[i + 1];
      const pregunta = limpiarEspacios(actual[0].replace(/\n/g, ' '));
      const finRespuesta = siguiente ? siguiente.index : normalizado.length;
      const respuestaCruda = normalizado.slice(actual.index + actual[0].length, finRespuesta);
      const respuesta = limpiarEspacios(respuestaCruda.replace(/\n/g, ' '));
      if (pregunta && respuesta) faqs.push({ pregunta, respuesta });
    }
    return faqs;
  }

  return extraerFaqsPorLineas(normalizado);
}

function extraerFaqsPorLineas(normalizado) {
  const lineas = normalizado.split('\n');
  const faqs = [];
  let actual = null;
  for (const lineaOriginal of lineas) {
    const linea = lineaOriginal.trim();
    if (linea === '') continue;
    if (/\?\s*$/.test(linea) && linea.length < 200) {
      if (actual) faqs.push(actual);
      actual = { pregunta: linea, respuestaPartes: [] };
    } else if (actual) {
      actual.respuestaPartes.push(linea);
    }
  }
  if (actual) faqs.push(actual);

  return faqs
    .map((faq) => ({
      pregunta: limpiarEspacios(faq.pregunta),
      respuesta: limpiarEspacios(faq.respuestaPartes.join(' ')),
    }))
    .filter((faq) => faq.pregunta && faq.respuesta);
}

const PARRAFOS_BOILERPLATE = [
  /^¡?bienvenid/i,
  /^somos una tienda online/i,
  /^aquí tienes la redacción/i,
  /^-{3,}$/,
];

function esParrafoBoilerplate(parrafo) {
  return PARRAFOS_BOILERPLATE.some((patron) => patron.test(parrafo));
}

const LINEAS_ETIQUETA = [
  /^descripci[oó]n del producto$/i,
  /^caracter[ií]sticas principales y especificaciones$/i,
];

function quitarLineasEtiqueta(texto) {
  return texto
    .split('\n')
    .filter((linea) => !LINEAS_ETIQUETA.some((patron) => patron.test(linea.trim())))
    .join('\n');
}

function normalizarIndentadosABullets(texto) {
  return texto.replace(/^(?: {4,}|\t+)(?=\S)/gm, '- ');
}

function extraerCuerpoYFaqs(descripcionRaw) {
  const parrafos = normalizarIndentadosABullets(quitarLineasEtiqueta(descripcionRaw))
    .split(/\n{2,}/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean)
    .filter((parrafo) => !esParrafoBoilerplate(parrafo));
  let cuerpoCompleto = parrafos.join('\n\n');

  const matchCondiciones = cuerpoCompleto.match(/(^|\n)[-•*\t ]*condiciones de venta:?/i);
  if (matchCondiciones) {
    cuerpoCompleto = cuerpoCompleto.slice(0, matchCondiciones.index).trim();
  }

  const matchFaq = cuerpoCompleto.match(/(^|\n)[-•*\t ]*preguntas\s+frecuentes:?\s*/i);
  if (!matchFaq) {
    return { cuerpo: cuerpoCompleto, faqs: [] };
  }
  const cuerpo = cuerpoCompleto.slice(0, matchFaq.index).trim();
  const faqRaw = cuerpoCompleto.slice(matchFaq.index + matchFaq[0].length).trim();
  return { cuerpo, faqs: extraerFaqs(faqRaw) };
}

const ENCABEZADO_INCLUYE = /^¿?\s*(?:qu[eé] incluye[^?:\n]{0,40}|contenido del paquete)[?:]+\s*(.*)$/i;
const INICIO_INCLUYE = /^(?:(?:el|este|cada)\s+(?:set|kit|pack|combo|compra)\s+incluye|incluye|recibir[aá]s|consiste en|vienen)\b:?\s*(?:adem[aá]s[,:]?\s+)?/i;
const FRASE_INCLUYE = /(?:el|este|cada)\s+(?:set|kit|pack|combo|compra)\s+incluye\s+(?:adem[aá]s\s+)?([^.!?\n]+)/gi;
const CLAUSULA_FINAL = /,\s*(?:lo que\b|ideal(?:es)?\b|dise[ñn]ad[oa]s?\b|pensad[oa]s?\b|[a-záéíóúñ]*(?:ando|endo|ándo|éndo)[a-záéíóúñ]*)\b.*$/i;

function dividirEnumeracion(texto) {
  const items = [];
  let actual = '';
  let profundidad = 0;
  let indice = 0;
  while (indice < texto.length) {
    const caracter = texto[indice];
    if (caracter === '(') profundidad += 1;
    if (caracter === ')') profundidad = Math.max(0, profundidad - 1);
    if (profundidad === 0) {
      const separador = texto.slice(indice).match(/^(?:,\s+|\s+y\s+)(?=\d)/);
      if (separador && actual.trim()) {
        items.push(actual.trim());
        actual = '';
        indice += separador[0].length;
        continue;
      }
    }
    actual += caracter;
    indice += 1;
  }
  if (actual.trim()) items.push(actual.trim());
  return items;
}

function extraerItemsDeContenido(contenido) {
  let texto = limpiarEspacios(contenido).replace(/[.;:\s]+$/, '');
  const enumeracionTrasColon = texto.match(/:\s*(\d.*)$/);
  if (enumeracionTrasColon) texto = enumeracionTrasColon[1];
  texto = texto.replace(CLAUSULA_FINAL, '');
  return dividirEnumeracion(texto)
    .map(limpiarEspacios)
    .filter((item) => item.length > 2);
}

function extraerContenidoIncluye(linea) {
  const directo = linea.match(INICIO_INCLUYE);
  if (directo) return linea.slice(directo[0].length);
  const conEtiqueta = linea.match(/^[^:]{3,60}:\s*(.*)$/);
  if (!conEtiqueta) return null;
  const resto = conEtiqueta[1];
  const trasEtiqueta = resto.match(INICIO_INCLUYE);
  return trasEtiqueta ? resto.slice(trasEtiqueta[0].length) : null;
}

function deduplicarItems(items) {
  const vistos = new Set();
  const resultado = [];
  for (const item of items) {
    const clave = item.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    resultado.push(item);
  }
  return resultado;
}

function extraerIncluyeFallback(lineas, cuerpo) {
  const items = [];
  const indicesUsados = new Set();
  lineas.forEach((linea, indice) => {
    const texto = limpiarBullet(linea);
    if (!texto) return;
    const contenido = extraerContenidoIncluye(texto);
    if (contenido === null) return;
    const extraidos = extraerItemsDeContenido(contenido);
    if (extraidos.length === 0) return;
    items.push(...extraidos);
    indicesUsados.add(indice);
  });
  for (const match of cuerpo.matchAll(FRASE_INCLUYE)) {
    items.push(...extraerItemsDeContenido(match[1]));
  }
  return { items: deduplicarItems(items), indicesUsados };
}

function extraerCaracteristicasEIncluye(cuerpo) {
  const lineas = cuerpo.split('\n');
  const indiceIncluye = lineas.findIndex((linea) => ENCABEZADO_INCLUYE.test(limpiarBullet(linea)));

  let lineasCaracteristicas = lineas;
  let lineasIncluye = [];
  let inlineIncluye = '';
  if (indiceIncluye !== -1) {
    inlineIncluye = limpiarBullet(lineas[indiceIncluye]).match(ENCABEZADO_INCLUYE)[1].trim();
    if (esLineaBullet(lineas[indiceIncluye]) && inlineIncluye) {
      lineasCaracteristicas = lineas.filter((_, indice) => indice !== indiceIncluye);
    } else {
      lineasCaracteristicas = lineas.slice(0, indiceIncluye);
      lineasIncluye = lineas.slice(indiceIncluye + 1);
    }
  }

  const incluye = lineasIncluye
    .filter(esLineaBullet)
    .map(limpiarBullet)
    .map(limpiarEspacios)
    .filter(Boolean);

  if (inlineIncluye) {
    incluye.unshift(
      ...inlineIncluye
        .replace(/\.\s*$/, '')
        .split(/\s\+\s/)
        .map(limpiarEspacios)
        .filter(Boolean),
    );
  }

  if (incluye.length === 0) {
    const fallback = extraerIncluyeFallback(lineasCaracteristicas, cuerpo);
    incluye.push(...fallback.items);
    lineasCaracteristicas = lineasCaracteristicas.filter((_, indice) => !fallback.indicesUsados.has(indice));
  }

  const caracteristicas = lineasCaracteristicas
    .filter(esLineaBullet)
    .map(limpiarBullet)
    .map(limpiarEspacios)
    .filter(Boolean);

  return { caracteristicas, incluye };
}

function extraerResumen(cuerpo) {
  const primerParrafo = cuerpo.split(/\n{2,}/).map((p) => p.trim()).find((p) => p && !esLineaBullet(p) && !/:$/.test(p));
  if (!primerParrafo) return '';
  const textoPlano = limpiarEspacios(primerParrafo.replace(/\n/g, ' '));
  const oraciones = textoPlano.match(/[^.!?]+[.!?]+/g) ?? [textoPlano];
  return oraciones.slice(0, 2).join(' ').trim();
}

function markdownizarCuerpo(cuerpo) {
  const lineas = cuerpo.split('\n');
  const resultado = [];
  for (const lineaOriginal of lineas) {
    const linea = lineaOriginal.trim();
    if (/^_{5,}$/.test(linea)) continue;
    if (esLineaBullet(linea)) {
      resultado.push(`- ${limpiarEspacios(limpiarBullet(linea))}`);
    } else if (linea === '') {
      resultado.push('');
    } else if (/^[^a-záéíóúñ]{0,3}[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ \d]{6,}:?$/.test(linea) || (/:$/.test(linea) && linea.length < 70 && !/[.!?]/.test(linea))) {
      resultado.push(`**${limpiarEspacios(linea.replace(/:$/, ''))}:**`);
    } else {
      resultado.push(limpiarEspacios(linea));
    }
  }
  return resultado
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(- .+)\n\n(?=- )/g, '$1\n')
    .trim();
}

function parseReviews(bloqueReviewsRaw) {
  const bloque = bloqueReviewsRaw.trim();
  if (!bloque || /^Sin reviews aún/i.test(bloque)) return null;

  const avgMatch = bloque.match(/([\d.]+)★\s*—\s*(\d+)\s*reviews/);
  const promedio = avgMatch ? Number(avgMatch[1]) : null;
  const cantidad = avgMatch ? Number(avgMatch[2]) : 0;

  const distribucion = {};
  for (const match of bloque.matchAll(/^-\s*(\d)★:\s*(\d+)\s*$/gm)) {
    distribucion[match[1]] = Number(match[2]);
  }

  const lineas = bloque.split('\n');
  const bloques = [];
  let actual = null;
  for (const linea of lineas) {
    if (/^-\s*★/.test(linea.trim())) {
      if (actual !== null) bloques.push(actual);
      actual = linea.trim();
    } else if (actual !== null && linea.trim() !== '') {
      actual += `\n${linea.trim()}`;
    }
  }
  if (actual !== null) bloques.push(actual);

  const comentarios = bloques
    .map((texto) => {
      const encabezado = texto.match(/^-\s*(★+)\s*«([^»]*)»\s*—\s*([\s\S]*)$/);
      if (!encabezado) return null;
      const [, estrellasStr, titulo, resto] = encabezado;
      const fechaMatch = resto.match(/\((\d{4}-\d{2}-\d{2})\)/);
      const textoLimpio = resto
        .replace(/\s*\[\d+\s*likes?\]\s*$/i, '')
        .replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*(\[\d+\s*likes?\])?\s*$/i, '')
        .replace(/\n+/g, ' ')
        .trim();
      return {
        estrellas: estrellasStr.length,
        titulo: limpiarEspacios(titulo),
        texto: limpiarEspacios(textoLimpio),
        fecha: fechaMatch ? fechaMatch[1] : '',
      };
    })
    .filter(Boolean);

  return { promedio, cantidad, distribucion, comentarios };
}

function parseImagenes(bloqueImagenesRaw) {
  if (!bloqueImagenesRaw) return [];
  return bloqueImagenesRaw
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.startsWith('- '))
    .map((linea) => linea.slice(2).trim());
}

function parseVariantesTabla(bloqueVariantesRaw) {
  if (!bloqueVariantesRaw) return [];
  const filas = [];
  for (const linea of bloqueVariantesRaw.split('\n')) {
    const match = linea.match(/^\|\s*(.+?)\s*\|\s*\$?([\d.,]+)\s*\|\s*(\d+)\s*\|\s*([^|]*)\|\s*([^|]+?)\s*\|$/);
    if (!match) continue;
    const [, atributosRaw, precio, , , carpetaImagenes] = match;
    if (/^Atributos$/i.test(atributosRaw) || /^---/.test(atributosRaw)) continue;
    const variationId = carpetaImagenes.trim().match(/-(\d+)\/imagenes\/?$/)?.[1] ?? '';
    filas.push({ atributosRaw: atributosRaw.trim(), precio: parseMonto(precio), variationId });
  }
  return filas;
}

function parseImagenesPorVariante(bloqueRaw) {
  const mapa = new Map();
  if (!bloqueRaw) return mapa;
  const regex = /\*\*(.+?)\*\*\n\n((?:- .+\n?)+)/g;
  for (const match of bloqueRaw.matchAll(regex)) {
    const etiqueta = match[1].trim();
    const imagenes = match[2]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- '))
      .map((l) => l.slice(2).trim());
    mapa.set(etiqueta, imagenes);
  }
  return mapa;
}

function parseCamposComunes(bloque) {
  const itemId = bloque.match(/\*\*ML Item ID:\*\*\s*(\S+)/)?.[1] ?? '';
  const link = bloque.match(/\*\*Link:\*\*\s*(\S+)/)?.[1] ?? '';
  const precioMatch = bloque.match(/\*\*Precio:\*\*\s*\$([\d.,]+)(?:\s*\(precio original \$([\d.,]+)\))?/);
  const precio = precioMatch ? parseMonto(precioMatch[2] ?? precioMatch[1]) : 0;
  return { itemId, link, precio };
}

function parsePublicacionIndividual(bloqueTexto) {
  const { itemId, link, precio } = parseCamposComunes(bloqueTexto);
  const descripcionRaw = extraerSeccion(bloqueTexto, 'Descripción', ['Promociones y cupones', 'Reviews', 'Variantes', 'Imágenes']);
  const { cuerpo, faqs } = extraerCuerpoYFaqs(descripcionRaw);
  const { caracteristicas, incluye } = extraerCaracteristicasEIncluye(cuerpo);
  const resumen = extraerResumen(cuerpo);
  const cuerpoMarkdown = markdownizarCuerpo(cuerpo);

  const reviewsRaw = extraerSeccion(bloqueTexto, 'Reviews', ['Variantes', 'Imágenes por variante', 'Imágenes sin variante asignada', 'Imágenes']);
  const reviews = parseReviews(reviewsRaw);

  const variantesTablaRaw = extraerSeccion(bloqueTexto, 'Variantes', ['Imágenes por variante', 'Imágenes sin variante asignada', 'Imágenes']);
  const imagenesPorVarianteRaw = extraerSeccion(bloqueTexto, 'Imágenes por variante', ['Imágenes sin variante asignada', 'Imágenes']);
  const imagenesSimpleRaw = extraerSeccion(bloqueTexto, 'Imágenes', []);

  return {
    itemId,
    link,
    precio,
    cuerpoMarkdown,
    resumen,
    caracteristicas,
    incluye,
    faqs,
    reviews,
    variantesFilas: parseVariantesTabla(variantesTablaRaw),
    imagenesPorVariante: parseImagenesPorVariante(imagenesPorVarianteRaw),
    imagenesSimple: parseImagenes(imagenesSimpleRaw),
  };
}

function leerCarpetaPublicacion(nombreCarpeta) {
  const rutaCarpeta = path.join(PUBLICACIONES_DIR, nombreCarpeta);
  const rutaMd = path.join(rutaCarpeta, 'publicacion.md');
  const texto = readFileSync(rutaMd, 'utf8');
  return { rutaCarpeta, texto };
}

function parseMetaCatalogo(texto) {
  return {
    esFamilia: /^# Familia:/.test(texto),
    esCatalogo: /\*\*Catálogo:\*\*\s*S[ií]/.test(texto),
    userProductId: texto.match(/\(user_product_id\s+(\S+?)\)/)?.[1] ?? '',
  };
}

function detectarCarpetasDuplicadas(carpetas) {
  const porUserProductId = new Map();
  for (const carpeta of carpetas) {
    const { texto } = leerCarpetaPublicacion(carpeta);
    const meta = parseMetaCatalogo(texto);
    if (meta.esFamilia || !meta.userProductId) continue;
    if (!porUserProductId.has(meta.userProductId)) porUserProductId.set(meta.userProductId, []);
    porUserProductId.get(meta.userProductId).push({ carpeta, esCatalogo: meta.esCatalogo });
  }
  const excluidas = new Set();
  for (const [userProductId, grupo] of porUserProductId) {
    if (grupo.length < 2 || !grupo.some((publicacion) => publicacion.esCatalogo)) continue;
    for (const publicacion of grupo) {
      if (publicacion.esCatalogo) continue;
      excluidas.add(publicacion.carpeta);
      console.warn(`⚠ ${publicacion.carpeta}: duplicada de una publicación de catálogo (${userProductId}), se descarta`);
    }
  }
  return excluidas;
}

function dividirMiembrosFamilia(texto) {
  const indices = [...texto.matchAll(/\n## (.+)\n/g)];
  const miembros = [];
  for (let i = 0; i < indices.length; i += 1) {
    const inicio = indices[i].index + indices[i][0].length;
    const fin = i + 1 < indices.length ? indices[i + 1].index : texto.length;
    miembros.push({ titulo: indices[i][1].trim(), bloque: texto.slice(inicio, fin) });
  }
  return miembros;
}

function detectarColorYDiseno(tituloMiembro, prefijoBase) {
  let sufijo = tituloMiembro;
  if (sufijo.startsWith(prefijoBase)) {
    sufijo = sufijo.slice(prefijoBase.length).trim();
  }
  const palabras = sufijo.split(/\s+/).filter(Boolean);
  const ultima = palabras[palabras.length - 1];
  if (palabras.length === 1 && COLORES_FUNDAS_PS5.includes(ultima)) {
    return { color: ultima, diseno: ultima };
  }
  if (COLORES_FUNDAS_PS5.includes(ultima)) {
    return { color: ultima, diseno: palabras.slice(0, -1).join(' ') };
  }
  return { color: ultima ?? '', diseno: palabras.slice(0, -1).join(' ') };
}

async function procesarImagen(rutaOrigen, rutaDestino) {
  mkdirSync(path.dirname(rutaDestino), { recursive: true });
  await sharp(rutaOrigen)
    .resize({ width: LADO_MAYOR_MAXIMO, height: LADO_MAYOR_MAXIMO, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: CALIDAD_WEBP })
    .toFile(rutaDestino);
}

async function copiarImagenes(rutasRelativas, carpetaOrigenBase, slugProducto, subcarpeta, limite) {
  const seleccionadas = rutasRelativas.slice(0, limite);
  const rutasFinales = [];
  let contador = 1;
  for (const relativa of seleccionadas) {
    const origen = path.join(carpetaOrigenBase, relativa);
    if (!existsSync(origen)) {
      console.warn(`  ⚠ Imagen no encontrada, se omite: ${origen}`);
      continue;
    }
    const nombreArchivo = `${String(contador).padStart(2, '0')}.webp`;
    const destinoRelativo = subcarpeta
      ? path.join('productos', slugProducto, subcarpeta, nombreArchivo)
      : path.join('productos', slugProducto, nombreArchivo);
    const destinoAbsoluto = path.join(ROOT_DIR, 'src/assets/images', destinoRelativo);
    await procesarImagen(origen, destinoAbsoluto);
    rutasFinales.push(destinoRelativo.split(path.sep).join('/'));
    contador += 1;
  }
  return rutasFinales;
}

async function construirProductoSimpleOVariantes(config, texto, carpetaOrigen) {
  const datos = parsePublicacionIndividual(texto);
  const categoria = asignarCategoria(config.titulo);
  const tipo = datos.variantesFilas.length > 0 ? 'variantes' : 'simple';
  const { esCatalogo } = parseMetaCatalogo(texto);

  const base = {
    titulo: config.titulo,
    slug: config.slug,
    categoria,
    tipo,
    emoji: CATEGORIAS[categoria].emoji,
    permalink: datos.link,
    precioReferencial: datos.precio,
    resumen: datos.resumen,
    caracteristicas: datos.caracteristicas,
    incluye: datos.incluye,
    faqs: datos.faqs,
    reviews: datos.reviews,
    reviewsEsCatalogo: esCatalogo,
    cuerpoMarkdown: datos.cuerpoMarkdown,
  };

  if (tipo === 'simple') {
    const imagenes = await copiarImagenes(datos.imagenesSimple, carpetaOrigen, config.slug, null, LIMITE_IMAGENES_SIMPLE);
    return { ...base, imagenes, variantes: undefined, atributosBusqueda: [] };
  }

  const variantes = [];
  const atributosBusqueda = new Set();
  for (const fila of datos.variantesFilas) {
    const pares = fila.atributosRaw
      .split('·')
      .map((parte) => {
        const [clave, ...resto] = parte.split(':');
        return { clave: clave.trim(), valor: resto.join(':').trim() };
      })
      .filter((par) => par.clave && par.valor);
    const nombre = pares.map((par) => par.valor).join(' / ') || fila.atributosRaw;
    const atributo = pares.map((par) => par.clave).join(' / ');
    const imagenesRelativas = datos.imagenesPorVariante.get(fila.atributosRaw) ?? [];
    const slugVariante = slugificar(nombre);
    const imagenes = await copiarImagenes(imagenesRelativas, carpetaOrigen, config.slug, slugVariante, LIMITE_IMAGENES_VARIANTE);
    const link = fila.variationId ? `${datos.link}?variation=${fila.variationId}` : datos.link;
    variantes.push({ nombre, atributo, link, imagenes });
    for (const par of pares) {
      atributosBusqueda.add(par.valor);
    }
  }

  const imagenesProducto = variantes.flatMap((v) => v.imagenes);
  return { ...base, imagenes: imagenesProducto, variantes, atributosBusqueda: [...atributosBusqueda] };
}

async function construirProductoFundasPs5(config, texto, carpetaOrigen) {
  const miembros = dividirMiembrosFamilia(texto);
  const prefijoBase = config.titulo.replace(/\s+\+\s+/, ' + ');
  const tituloCrudoBase = texto.match(/^# Familia:\s*(.+)$/m)?.[1]?.trim() ?? config.titulo;

  const gruposMapa = new Map();
  let primerLink = '';
  const atributosBusqueda = new Set();

  for (const miembro of miembros) {
    const datos = parseCamposComunes(miembro.bloque);
    if (!primerLink) primerLink = datos.link;
    const { color, diseno } = detectarColorYDiseno(miembro.titulo, tituloCrudoBase);
    atributosBusqueda.add(color);
    atributosBusqueda.add(diseno);

    const imagenesRaw = parseImagenes(extraerSeccion(miembro.bloque, 'Imágenes', []));
    const slugMiembro = datos.itemId;
    const imagenes = await copiarImagenes(imagenesRaw, carpetaOrigen, config.slug, slugMiembro, LIMITE_IMAGENES_MIEMBRO);

    if (!gruposMapa.has(diseno)) gruposMapa.set(diseno, []);
    gruposMapa.get(diseno).push({ color, link: datos.link, imagenes });
  }

  const grupos = [...gruposMapa.entries()].map(([diseno, colores]) => ({ diseno, colores }));
  const categoria = asignarCategoria(config.titulo);
  const primerMiembro = miembros[0];
  const primerBloqueDatos = parsePublicacionIndividual(primerMiembro.bloque);

  return {
    titulo: config.titulo,
    slug: config.slug,
    categoria,
    tipo: 'familia',
    emoji: CATEGORIAS[categoria].emoji,
    permalink: primerLink,
    precioReferencial: parseCamposComunes(primerMiembro.bloque).precio,
    resumen: primerBloqueDatos.resumen,
    caracteristicas: primerBloqueDatos.caracteristicas,
    incluye: primerBloqueDatos.incluye,
    faqs: primerBloqueDatos.faqs,
    reviews: null,
    cuerpoMarkdown: primerBloqueDatos.cuerpoMarkdown,
    imagenes: [...(grupos[0]?.colores[0]?.imagenes ?? [])],
    grupos,
    atributosBusqueda: [...atributosBusqueda].filter(Boolean),
  };
}

async function construirProductoFamiliaGenerica(config, texto, carpetaOrigen) {
  const miembros = dividirMiembrosFamilia(texto);
  const tituloCrudoBase = texto.match(/^# Familia:\s*(.+)$/m)?.[1]?.trim() ?? config.titulo;
  const categoria = asignarCategoria(config.titulo);

  const miembrosProcesados = [];
  const atributosBusqueda = new Set();
  let primerLink = '';

  for (const miembro of miembros) {
    const datos = parseCamposComunes(miembro.bloque);
    if (!primerLink) primerLink = datos.link;
    const { color, diseno } = detectarColorYDiseno(miembro.titulo, tituloCrudoBase);
    const atributos = {};
    if (color) atributos.color = color;
    if (diseno) atributos.diseno = diseno;
    atributosBusqueda.add(color);

    const imagenesRaw = parseImagenes(extraerSeccion(miembro.bloque, 'Imágenes', []));
    const imagenes = await copiarImagenes(imagenesRaw, carpetaOrigen, config.slug, datos.itemId, LIMITE_IMAGENES_MIEMBRO);

    miembrosProcesados.push({
      titulo: miembro.titulo,
      link: datos.link,
      precio: datos.precio,
      imagenes,
      atributos,
    });
  }

  const primerMiembro = miembros[0];
  const primerBloqueDatos = parsePublicacionIndividual(primerMiembro.bloque);

  return {
    titulo: config.titulo,
    slug: config.slug,
    categoria,
    tipo: 'familia',
    emoji: CATEGORIAS[categoria].emoji,
    permalink: primerLink,
    precioReferencial: miembrosProcesados[0]?.precio ?? 0,
    resumen: primerBloqueDatos.resumen,
    caracteristicas: primerBloqueDatos.caracteristicas,
    incluye: primerBloqueDatos.incluye,
    faqs: primerBloqueDatos.faqs,
    reviews: null,
    cuerpoMarkdown: primerBloqueDatos.cuerpoMarkdown,
    imagenes: [...(miembrosProcesados[0]?.imagenes ?? [])],
    miembros: miembrosProcesados,
    atributosBusqueda: [...atributosBusqueda].filter(Boolean),
  };
}

function escribirMarkdownProducto(producto, fechaPrecio) {
  const frontmatter = {
    titulo: producto.titulo,
    slug: producto.slug,
    categoria: producto.categoria,
    tipo: producto.tipo,
    emoji: producto.emoji,
    permalink: producto.permalink,
    precioReferencial: producto.precioReferencial,
    fechaPrecio,
    resumen: producto.resumen,
    imagenes: producto.imagenes,
  };

  if (producto.caracteristicas?.length) frontmatter.caracteristicas = producto.caracteristicas;
  if (producto.incluye?.length) frontmatter.incluye = producto.incluye;
  if (producto.faqs?.length) frontmatter.faqs = producto.faqs;
  if (producto.reviews) frontmatter.reviews = producto.reviews;
  if (producto.variantes?.length) frontmatter.variantes = producto.variantes;
  if (producto.miembros?.length) frontmatter.miembros = producto.miembros;
  if (producto.grupos?.length) frontmatter.grupos = producto.grupos;

  const archivo = matter.stringify(`\n${producto.cuerpoMarkdown}\n`, frontmatter);
  writeFileSync(path.join(PRODUCTOS_CONTENT_DIR, `${producto.slug}.md`), archivo, 'utf8');
}

function limpiarSalidas() {
  rmSync(PRODUCTOS_CONTENT_DIR, { recursive: true, force: true });
  rmSync(PRODUCTOS_IMAGES_DIR, { recursive: true, force: true });
  mkdirSync(PRODUCTOS_CONTENT_DIR, { recursive: true });
  mkdirSync(PRODUCTOS_IMAGES_DIR, { recursive: true });
}

function construirCatalogoJson(productos, empresa, fechaPrecio) {
  return {
    generadoEl: new Date().toISOString(),
    empresa: {
      nickname: empresa.nickname,
      sellerId: empresa.sellerId,
      tiendaUrl: empresa.tiendaUrl,
      paginaOficialUrl: empresa.paginaOficialUrl,
      reputacion: empresa.reputacion,
    },
    categorias: Object.entries(CATEGORIAS)
      .filter(([slug]) => slug !== 'otros')
      .map(([slug, datos]) => ({ slug, nombre: datos.nombre, emoji: datos.emoji, resumen: datos.resumen })),
    productos: productos.map((producto) => ({
      slug: producto.slug,
      titulo: producto.titulo,
      categoria: producto.categoria,
      tipo: producto.tipo,
      emoji: producto.emoji,
      permalink: producto.permalink,
      precioReferencial: producto.precioReferencial,
      fechaPrecio,
      resumen: producto.resumen,
      reviews: producto.reviews ? { promedio: producto.reviews.promedio, cantidad: producto.reviews.cantidad } : null,
      atributosBusqueda: producto.atributosBusqueda ?? [],
      imagen: producto.imagenes[0] ?? '',
    })),
  };
}

function construirResenasJson(productos, empresa) {
  const todasConComentarios = [];
  for (const producto of productos) {
    if (producto.reviewsEsCatalogo) continue;
    if (!producto.reviews?.comentarios?.length) continue;
    for (const comentario of producto.reviews.comentarios) {
      if (comentario.estrellas >= 4) {
        todasConComentarios.push({
          productoSlug: producto.slug,
          productoTitulo: producto.titulo,
          estrellas: comentario.estrellas,
          titulo: comentario.titulo,
          texto: comentario.texto,
          fecha: comentario.fecha,
        });
      }
    }
  }

  todasConComentarios.sort((a, b) => b.texto.length - a.texto.length);

  const destacadas = [];
  const productosUsados = new Set();
  for (const comentario of todasConComentarios) {
    if (productosUsados.has(comentario.productoSlug)) continue;
    destacadas.push(comentario);
    productosUsados.add(comentario.productoSlug);
    if (destacadas.length >= 8) break;
  }

  const conReviews = productos.filter((producto) => producto.reviews && !producto.reviewsEsCatalogo);
  const totalReviews = conReviews.reduce((suma, producto) => suma + producto.reviews.cantidad, 0);
  const sumaPonderada = conReviews.reduce((suma, producto) => suma + producto.reviews.promedio * producto.reviews.cantidad, 0);
  const promedioGeneral = totalReviews > 0 ? Number((sumaPonderada / totalReviews).toFixed(2)) : 0;

  return {
    mercadolibre: {
      nivel: empresa.reputacion.nivel,
      transacciones: empresa.reputacion.transacciones,
      url: empresa.paginaOficialUrl,
    },
    promedioGeneral,
    totalReviews,
    destacadas,
  };
}

function leerGuias() {
  if (!existsSync(GUIAS_CONTENT_DIR)) return [];
  const archivos = readdirSync(GUIAS_CONTENT_DIR).filter((nombre) => nombre.endsWith('.md'));
  return archivos
    .map((archivo) => {
      const texto = readFileSync(path.join(GUIAS_CONTENT_DIR, archivo), 'utf8');
      const { data } = matter(texto);
      return { titulo: data.titulo, slug: data.slug };
    })
    .sort((a, b) => a.titulo.localeCompare(b.titulo));
}

function leerPromociones() {
  const promocionesPath = path.join(DATA_DIR, 'promociones.json');
  if (!existsSync(promocionesPath)) return null;
  return JSON.parse(readFileSync(promocionesPath, 'utf8'));
}

function construirSeccionPromociones(promociones) {
  if (!promociones) return [];
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
  const cuponesVigentes = (promociones.cupones ?? []).filter((cupon) => cupon.hasta >= hoy);
  const campanasVigentes = (promociones.campanas ?? []).filter((campana) => campana.hasta >= hoy);

  const lineas = [];
  lineas.push('## Promociones');
  lineas.push('');
  lineas.push(`Cupones y campañas vigentes en la tienda: ${SITE_URL}/promociones/`);
  lineas.push('');
  for (const cupon of cuponesVigentes) {
    lineas.push(`- Cupón: ${cupon.nombre} — ${cupon.porcentaje}% (vigente del ${cupon.desde} al ${cupon.hasta})`);
  }
  for (const campana of campanasVigentes) {
    lineas.push(`- Campaña: ${campana.nombre} (vigente del ${campana.desde} al ${campana.hasta})`);
  }
  lineas.push('');
  return lineas;
}

function construirLlmsTxt(productos, empresa, fechaPrecio, guias, promociones) {
  const lineas = [];
  lineas.push('# AGAS Soluciones Innovadoras');
  lineas.push('');
  lineas.push(
    'Tienda chilena que elige con criterio productos para tu día a día —hoy gaming y audio— y vende por Mercado Libre, con reputación verde y despacho a todo Chile.',
  );
  lineas.push('');
  lineas.push(`Tienda en Mercado Libre: ${empresa.tiendaUrl}`);
  lineas.push(`Página oficial en Mercado Libre: ${empresa.paginaOficialUrl}`);
  lineas.push('');
  lineas.push('## Catálogo');
  lineas.push('');
  for (const producto of productos) {
    const urlSitio = `${SITE_URL}/productos/${producto.slug}/`;
    lineas.push(
      `- ${producto.titulo} — ${CATEGORIAS[producto.categoria].nombre} — precio referencial $${producto.precioReferencial.toLocaleString('es-CL')} (al ${fechaPrecio}) — ${urlSitio} — ML: ${producto.permalink}`,
    );
  }
  lineas.push('');
  if (guias.length > 0) {
    lineas.push('## Guías');
    lineas.push('');
    for (const guia of guias) {
      const urlGuia = `${SITE_URL}/guias/${guia.slug}/`;
      lineas.push(`- ${guia.titulo} — ${urlGuia}`);
    }
    lineas.push('');
  }
  lineas.push(...construirSeccionPromociones(promociones));
  return lineas.join('\n');
}

async function main() {
  console.log(`Leyendo contexto desde: ${CONTEXT_DIR}`);
  if (!existsSync(PUBLICACIONES_DIR)) {
    throw new Error(`No se encontró el directorio de publicaciones: ${PUBLICACIONES_DIR}`);
  }

  const empresa = parseEmpresa();
  const fechaPrecio = empresa.fechaGenerado;

  limpiarSalidas();

  const carpetas = readdirSync(PUBLICACIONES_DIR).filter((nombre) =>
    statSync(path.join(PUBLICACIONES_DIR, nombre)).isDirectory(),
  );
  const excluidas = detectarCarpetasDuplicadas(carpetas);

  const usadas = new Set();
  const productos = [];

  async function procesarCarpeta(config, carpeta) {
    usadas.add(carpeta);
    console.log(`Procesando ${config.slug} (${carpeta})...`);
    const { rutaCarpeta, texto } = leerCarpetaPublicacion(carpeta);

    let producto;
    if (config.slug === SLUG_FUNDAS_PS5) {
      producto = await construirProductoFundasPs5(config, texto, rutaCarpeta);
    } else if (/^# Familia:/.test(texto)) {
      producto = await construirProductoFamiliaGenerica(config, texto, rutaCarpeta);
    } else {
      producto = await construirProductoSimpleOVariantes(config, texto, rutaCarpeta);
    }

    if (producto.categoria === 'otros') {
      console.warn(`⚠ ${config.slug}: no matcheó ninguna regla de categoría, quedó en "otros"`);
    }

    escribirMarkdownProducto(producto, fechaPrecio);
    productos.push(producto);
  }

  for (const config of SLUG_MAP) {
    const carpeta = carpetas.find((nombre) => nombre.startsWith(config.prefijo));
    if (!carpeta) {
      console.warn(`⚠ No se encontró carpeta para el prefijo ${config.prefijo}, se omite ${config.slug}`);
      continue;
    }
    if (excluidas.has(carpeta)) {
      usadas.add(carpeta);
      continue;
    }
    await procesarCarpeta(config, carpeta);
  }

  const slugsUsados = new Set(productos.map((producto) => producto.slug));
  for (const carpeta of carpetas) {
    if (usadas.has(carpeta) || excluidas.has(carpeta)) continue;
    const { texto } = leerCarpetaPublicacion(carpeta);
    const tituloCrudo = texto.match(/^# (?:Familia:\s*)?(.+)$/m)?.[1]?.trim() ?? carpeta;
    let slugAuto = slugificar(tituloCrudo);
    while (slugsUsados.has(slugAuto)) {
      slugAuto = `${slugAuto}-2`;
    }
    slugsUsados.add(slugAuto);
    console.warn(`⚠ Carpeta sin mapeo explícito: ${carpeta} → slug auto-generado "${slugAuto}"`);
    await procesarCarpeta({ prefijo: carpeta, slug: slugAuto, titulo: tituloCrudo }, carpeta);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(path.join(DATA_DIR, 'catalogo.json'), `${JSON.stringify(construirCatalogoJson(productos, empresa, fechaPrecio), null, 2)}\n`, 'utf8');
  writeFileSync(path.join(DATA_DIR, 'resenas.json'), `${JSON.stringify(construirResenasJson(productos, empresa), null, 2)}\n`, 'utf8');

  mkdirSync(PUBLIC_DIR, { recursive: true });
  const guias = leerGuias();
  const promociones = leerPromociones();
  writeFileSync(
    path.join(PUBLIC_DIR, 'llms.txt'),
    construirLlmsTxt(productos, empresa, fechaPrecio, guias, promociones),
    'utf8',
  );

  console.log(`\nListo: ${productos.length} productos generados.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
