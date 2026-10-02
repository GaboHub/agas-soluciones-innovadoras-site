#!/usr/bin/env node
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  configurarFuentes,
  DIR_FUENTES,
  escaparXml,
  esModuloDeEntrada,
  RAIZ,
  validarYEscribir,
  verificarSoraAplicada,
} from './marca-comun.mjs';

const FUENTES_REQUERIDAS = [
  { archivo: 'Sora-SemiBold.ttf', familia: 'Sora', estilo: 'SemiBold' },
  { archivo: 'Sora-Bold.ttf', familia: 'Sora', estilo: 'Bold' },
  { archivo: 'Inter-Regular.ttf', familia: 'Inter', estilo: 'Regular' },
];

const PALETA = {
  primario: '#24455C',
  primarioOscuro: '#16303F',
  acento: '#9E5220',
  cobreClaro: '#C8813F',
  blanco: '#FFFFFF',
  bajadaClara: '#DCE6ED',
  destacado: '#E9C49A',
};

const FUENTE_SORA_SEMIBOLD = 'Sora SemiBold';
const FUENTE_INTER = 'Inter';

const ANCHO_LAMINA = 1080;
const ALTO_LAMINA = 1350;
const NUMERO_LAMINAS = 6;
const ANCHO_TIRA = ANCHO_LAMINA * NUMERO_LAMINAS;
const MARGEN = 96;
const BORDE_INFERIOR_CONTENIDO = ALTO_LAMINA - MARGEN;
const GAP_DEFAULT = 36;
const GAP_ANTES_PIE = 66;
const GAP_SELLOS_A_CTA = 48;
const GAP_ENTRE_SELLOS = 36;
const ANCHO_MAXIMO_TEXTO = 888;

export const RASTERS_REDES = [
  { ruta: 'marca/redes/avatar.png', ancho: 1080, alto: 1080 },
  ...Array.from({ length: NUMERO_LAMINAS }, (_, indice) => ({
    ruta: `marca/redes/carrusel-presentacion-${indice + 1}.png`,
    ancho: ANCHO_LAMINA,
    alto: ALTO_LAMINA,
  })),
];

function atributosFuente(fuente) {
  if (typeof fuente === 'string') {
    return `font-family="${fuente}"`;
  }
  return `font-family="${fuente.family}"${fuente.weight ? ` font-weight="${fuente.weight}"` : ''}`;
}

function aperturaTexto({ x, y, fuente, fontSize, fill, letterSpacing, textAnchor, fillOpacity }) {
  return `<text x="${x}" y="${y}" ${atributosFuente(fuente)} font-size="${fontSize}"${
    letterSpacing !== undefined ? ` letter-spacing="${letterSpacing}"` : ''
  }${textAnchor ? ` text-anchor="${textAnchor}"` : ''} fill="${fill}"${
    fillOpacity !== undefined ? ` fill-opacity="${fillOpacity}"` : ''
  }>`;
}

function svgTexto(opts, texto) {
  return `${aperturaTexto(opts)}${escaparXml(texto)}</text>`;
}

async function renderMuestra(fuente) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120">${svgTexto(
    { x: 10, y: 90, fuente, fontSize: 72, fill: '#000000' },
    'AGAS',
  )}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function detectarFamiliaBold(render = renderMuestra) {
  const candidatas = [{ family: 'Sora Bold' }, { family: 'Sora', weight: '700' }];
  const [renderSerif, renderSemiBold] = await Promise.all([render('serif'), render(FUENTE_SORA_SEMIBOLD)]);

  for (const candidata of candidatas) {
    const buffer = await render(candidata);
    if (!buffer.equals(renderSerif) && !buffer.equals(renderSemiBold)) {
      return candidata;
    }
  }

  throw new Error(
    'No se pudo cargar Sora Bold: ni "Sora Bold" ni "Sora" con font-weight 700 producen un render distinto de "serif" o de "Sora SemiBold".\nRevisa que marca/fuentes/Sora-Bold.ttf exista y esté correctamente convertida.',
  );
}

async function anchoVisible(bufferPng) {
  const { data, info } = await sharp(bufferPng).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let maxX = -1;
  for (let indice = 0; indice < width * height; indice++) {
    if (data[indice * channels + 3] > 10) {
      const x = indice % width;
      if (x > maxX) {
        maxX = x;
      }
    }
  }
  return maxX + 1;
}

async function medirAnchoTexto(texto, { fuente, fontSize, letterSpacing }) {
  const lienzoAncho = fontSize * texto.length + fontSize * 4;
  const lienzoAlto = fontSize * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lienzoAncho}" height="${lienzoAlto}">${svgTexto(
    { x: 0, y: fontSize * 1.4, fuente, fontSize, fill: '#000000', letterSpacing },
    texto,
  )}</svg>`;
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return anchoVisible(buffer);
}

export async function partirEnLineas(texto, opts) {
  const palabras = texto.split(' ');
  const anchoPalabras = await Promise.all(palabras.map((palabra) => medirAnchoTexto(palabra, opts)));
  const indicePalabraExcedida = anchoPalabras.findIndex((ancho) => ancho > opts.maxWidth);
  if (indicePalabraExcedida !== -1) {
    throw new Error(
      `La palabra "${palabras[indicePalabraExcedida]}" mide ${anchoPalabras[indicePalabraExcedida]}px y por sí sola supera el ancho máximo de ${opts.maxWidth}px permitido para este texto.`,
    );
  }

  const lineas = [];
  let actual = '';
  for (const palabra of palabras) {
    const candidato = actual ? `${actual} ${palabra}` : palabra;
    const ancho = await medirAnchoTexto(candidato, opts);
    if (ancho > opts.maxWidth && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = candidato;
    }
  }
  if (actual) {
    lineas.push(actual);
  }
  return lineas;
}

function verificarPildoraEnContenido(nombre, ancho) {
  if (MARGEN + ancho > ANCHO_LAMINA - MARGEN) {
    throw new Error(
      `La pastilla "${nombre}" mide ${ancho}px y, sumada al margen de ${MARGEN}px, supera el borde de contenido en ${
        ANCHO_LAMINA - MARGEN
      }px (caja de contenido de ${ANCHO_MAXIMO_TEXTO}px).`,
    );
  }
}

export function verificarBloquesEnLaCaja(nombre, bloques) {
  const limiteInferior = ALTO_LAMINA - MARGEN;
  const fuera = bloques.find(({ top, bottom }) => top < MARGEN || bottom > limiteInferior);
  if (fuera) {
    throw new Error(
      `El texto de ${nombre} queda fuera de la caja de contenido (${MARGEN}px a ${limiteInferior}px): un bloque ocupa de ${fuera.top}px a ${fuera.bottom}px.`,
    );
  }
}

function paddingPildora(anchoTexto, paddingObjetivo) {
  return Math.max(0, Math.min(paddingObjetivo, Math.floor((ANCHO_MAXIMO_TEXTO - anchoTexto) / 2)));
}

export function extraerPrimeraOracion(texto, campo) {
  const indicePunto = texto.indexOf('.');
  if (indicePunto === -1) {
    throw new Error(`${campo} no contiene un punto para extraer la primera oración: "${texto}".`);
  }
  const oracion = texto.slice(0, indicePunto + 1).trim();
  if (!oracion) {
    throw new Error(`${campo} produce una primera oración vacía al cortar en el primer punto.`);
  }
  if (!oracion.includes(' ')) {
    throw new Error(
      `${campo}: la primera oración extraída ("${oracion}") es una sola palabra antes del punto, probablemente una abreviatura y no el cierre de una oración; revisa el texto en site.json.`,
    );
  }
  return oracion;
}

function leerSiteJson() {
  return JSON.parse(readFileSync(path.join(RAIZ, 'src/data/site.json'), 'utf-8'));
}

function svgDefsFondoRedes() {
  const angulo = (170 * Math.PI) / 180;
  const dx = Math.sin(angulo);
  const dy = -Math.cos(angulo);
  const x1 = ((0.5 - dx / 2) * 100).toFixed(2);
  const y1 = ((0.5 - dy / 2) * 100).toFixed(2);
  const x2 = ((0.5 + dx / 2) * 100).toFixed(2);
  const y2 = ((0.5 + dy / 2) * 100).toFixed(2);
  return `<linearGradient id="fondo-redes" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
    <stop offset="0%" stop-color="${PALETA.primario}"/>
    <stop offset="100%" stop-color="${PALETA.primarioOscuro}"/>
  </linearGradient>
  <radialGradient id="resplandor-redes" cx="88%" cy="8%" r="65%">
    <stop offset="0%" stop-color="${PALETA.acento}" stop-opacity="0.35"/>
    <stop offset="100%" stop-color="${PALETA.acento}" stop-opacity="0"/>
  </radialGradient>`;
}

function svgClipsLaminas() {
  let salida = '';
  for (let indice = 0; indice < NUMERO_LAMINAS; indice++) {
    const x = indice * ANCHO_LAMINA;
    salida += `<clipPath id="clip-lamina-${indice}"><rect x="${x}" y="0" width="${ANCHO_LAMINA}" height="${ALTO_LAMINA}"/></clipPath>`;
  }
  return salida;
}

function svgFondosLaminas() {
  let salida = '';
  for (let indice = 0; indice < NUMERO_LAMINAS; indice++) {
    const x = indice * ANCHO_LAMINA;
    salida += `<g clip-path="url(#clip-lamina-${indice})">
      <rect x="${x}" y="0" width="${ANCHO_LAMINA}" height="${ALTO_LAMINA}" fill="url(#fondo-redes)"/>
      <rect x="${x}" y="0" width="${ANCHO_LAMINA}" height="${ALTO_LAMINA}" fill="url(#resplandor-redes)"/>
    </g>`;
  }
  return salida;
}

function svgProgreso({ x, y, indiceActual }) {
  let salida = '';
  for (let indice = 0; indice < NUMERO_LAMINAS; indice++) {
    const bx = x + indice * (60 + 18);
    const esActual = indice === indiceActual;
    salida += `<rect x="${bx}" y="${y}" width="60" height="12" fill="${
      esActual ? PALETA.cobreClaro : PALETA.blanco
    }" fill-opacity="${esActual ? 1 : 0.25}"/>`;
  }
  return salida;
}

function svgPie({ offsetX, top, indiceActual, dominio }) {
  const xBarras = offsetX + MARGEN;
  const yBarras = top + (33 - 12) / 2;
  const yDominio = top + 33;
  const xDominio = offsetX + ANCHO_LAMINA - MARGEN;
  return `${svgProgreso({ x: xBarras, y: yBarras, indiceActual })}
  ${svgTexto(
    { x: xDominio, y: yDominio, fuente: FUENTE_INTER, fontSize: 33, fill: PALETA.bajadaClara, textAnchor: 'end' },
    dominio,
  )}`;
}

function svgEyebrow({ offsetX, top, texto }) {
  return svgTexto(
    {
      x: offsetX + MARGEN,
      y: top + 33,
      fuente: FUENTE_SORA_SEMIBOLD,
      fontSize: 33,
      letterSpacing: 5.3,
      fill: PALETA.destacado,
    },
    texto.toLocaleUpperCase('es-CL'),
  );
}

function svgLineasTexto({ offsetX, top, lineas, fuente, fontSize, lineHeight, color }) {
  return lineas
    .map((linea, indice) =>
      svgTexto(
        { x: offsetX + MARGEN, y: top + lineHeight * indice + fontSize, fuente, fontSize, fill: color },
        linea,
      ),
    )
    .join('\n');
}

function svgLineasTituloConAcento({ offsetX, top, lineas, acentuada, fuenteBold }) {
  return lineas
    .map((linea, indice) => {
      const y = top + 113 * indice + 99;
      const contenido = linea
        .split(' ')
        .map((palabra) =>
          palabra === acentuada
            ? `<tspan fill="${PALETA.cobreClaro}">${escaparXml(palabra)}</tspan>`
            : escaparXml(palabra),
        )
        .join(' ');
      return `${aperturaTexto({ x: offsetX + MARGEN, y, fuente: fuenteBold, fontSize: 99, fill: PALETA.blanco })}${contenido}</text>`;
    })
    .join('\n');
}

async function svgLamina1({ offsetX, site, dominio, fuenteBold }) {
  const pieAltura = 33;
  const tituloLineas = await partirEnLineas(site.hero.titulo, {
    fuente: fuenteBold,
    fontSize: 99,
    maxWidth: ANCHO_MAXIMO_TEXTO,
  });
  const tituloAltura = tituloLineas.length * 113;
  const chipAltura = 69;

  const pieTop = BORDE_INFERIOR_CONTENIDO - pieAltura;
  const tituloBottom = pieTop - GAP_ANTES_PIE;
  const tituloTop = tituloBottom - tituloAltura;
  const chipBottom = tituloTop - GAP_DEFAULT;
  const chipTop = chipBottom - chipAltura;

  const anchoChipTexto = await medirAnchoTexto(site.hero.chip, {
    fuente: FUENTE_SORA_SEMIBOLD,
    fontSize: 33,
    letterSpacing: 1.3,
  });
  const paddingChip = paddingPildora(anchoChipTexto, 36);
  const anchoChip = anchoChipTexto + paddingChip * 2;
  verificarPildoraEnContenido('chip', anchoChip);

  const chip = `<rect x="${offsetX + MARGEN}" y="${chipTop}" width="${anchoChip}" height="${chipAltura}" rx="${
    chipAltura / 2
  }" fill="none" stroke="${PALETA.blanco}" stroke-opacity="0.35" stroke-width="3"/>
  ${svgTexto(
    {
      x: offsetX + MARGEN + paddingChip,
      y: chipTop + 18 + 33,
      fuente: FUENTE_SORA_SEMIBOLD,
      fontSize: 33,
      letterSpacing: 1.3,
      fill: PALETA.bajadaClara,
    },
    site.hero.chip,
  )}`;

  const titulo = svgLineasTituloConAcento({
    offsetX,
    top: tituloTop,
    lineas: tituloLineas,
    acentuada: site.hero.acentuada,
    fuenteBold,
  });

  verificarBloquesEnLaCaja('la lámina 1', [
    { top: chipTop, bottom: chipBottom },
    { top: tituloTop, bottom: tituloBottom },
    { top: pieTop, bottom: pieTop + pieAltura },
  ]);

  const pie = svgPie({ offsetX, top: pieTop, indiceActual: 0, dominio });

  return `${chip}\n${titulo}\n${pie}`;
}

async function svgLamina2({ offsetX, site, dominio }) {
  const pieAltura = 33;
  const eyebrowAltura = 33;
  const subLineHeight = 39 * 1.5;

  const primeraOracion = extraerPrimeraOracion(site.hero.bajada, 'site.hero.bajada');
  const statementLineas = await partirEnLineas(primeraOracion, {
    fuente: FUENTE_SORA_SEMIBOLD,
    fontSize: 66,
    maxWidth: ANCHO_MAXIMO_TEXTO,
  });
  const statementAltura = statementLineas.length * 86;
  const sub = `${site.presentacionRedes} · ${site.direccion.localidad} · ${site.sellosConfianza[0]} en Mercado Libre`;
  const subLineas = await partirEnLineas(sub, {
    fuente: FUENTE_INTER,
    fontSize: 39,
    maxWidth: ANCHO_MAXIMO_TEXTO,
  });
  const subAltura = subLineas.length * subLineHeight;

  const pieTop = BORDE_INFERIOR_CONTENIDO - pieAltura;
  const subBottom = pieTop - GAP_ANTES_PIE;
  const subTop = subBottom - subAltura;
  const statementBottom = subTop - GAP_DEFAULT;
  const statementTop = statementBottom - statementAltura;
  const eyebrowBottom = statementTop - GAP_DEFAULT;
  const eyebrowTop = eyebrowBottom - eyebrowAltura;

  verificarBloquesEnLaCaja('la lámina 2', [
    { top: eyebrowTop, bottom: eyebrowBottom },
    { top: statementTop, bottom: statementBottom },
    { top: subTop, bottom: subBottom },
    { top: pieTop, bottom: pieTop + pieAltura },
  ]);

  const eyebrow = svgEyebrow({ offsetX, top: eyebrowTop, texto: 'Quiénes somos' });
  const statement = svgLineasTexto({
    offsetX,
    top: statementTop,
    lineas: statementLineas,
    fuente: FUENTE_SORA_SEMIBOLD,
    fontSize: 66,
    lineHeight: 86,
    color: PALETA.blanco,
  });
  const subTexto = svgLineasTexto({
    offsetX,
    top: subTop,
    lineas: subLineas,
    fuente: FUENTE_INTER,
    fontSize: 39,
    lineHeight: subLineHeight,
    color: PALETA.bajadaClara,
  });
  const pie = svgPie({ offsetX, top: pieTop, indiceActual: 1, dominio });

  return `${eyebrow}\n${statement}\n${subTexto}\n${pie}`;
}

async function svgLaminaCategoria({ offsetX, indiceLamina, categoria, posicionTile, dominio, fuenteBold }) {
  const pieAltura = 33;
  const eyebrowAltura = 33;

  const nombreLineas = await partirEnLineas(categoria.nombre, {
    fuente: fuenteBold,
    fontSize: 90,
    maxWidth: ANCHO_MAXIMO_TEXTO,
  });
  const nombreAltura = nombreLineas.length * 90;

  const resumenLineas = await partirEnLineas(categoria.resumen, {
    fuente: FUENTE_INTER,
    fontSize: 42,
    maxWidth: ANCHO_MAXIMO_TEXTO,
  });
  const resumenAltura = resumenLineas.length * 63;

  const pieTop = BORDE_INFERIOR_CONTENIDO - pieAltura;
  const resumenBottom = pieTop - GAP_ANTES_PIE;
  const resumenTop = resumenBottom - resumenAltura;
  const nombreBottom = resumenTop - GAP_DEFAULT;
  const nombreTop = nombreBottom - nombreAltura;
  const eyebrowBottom = nombreTop - GAP_DEFAULT;
  const eyebrowTop = eyebrowBottom - eyebrowAltura;

  verificarBloquesEnLaCaja(`la lámina ${indiceLamina + 1}`, [
    { top: eyebrowTop, bottom: eyebrowBottom },
    { top: nombreTop, bottom: nombreBottom },
    { top: resumenTop, bottom: resumenBottom },
    { top: pieTop, bottom: pieTop + pieAltura },
  ]);

  const eyebrow = svgEyebrow({ offsetX, top: eyebrowTop, texto: 'Catálogo' });
  const nombre = svgLineasTexto({
    offsetX,
    top: nombreTop,
    lineas: nombreLineas,
    fuente: fuenteBold,
    fontSize: 90,
    lineHeight: 90,
    color: PALETA.blanco,
  });
  const resumen = svgLineasTexto({
    offsetX,
    top: resumenTop,
    lineas: resumenLineas,
    fuente: FUENTE_INTER,
    fontSize: 42,
    lineHeight: 63,
    color: PALETA.bajadaClara,
  });
  const pie = svgPie({ offsetX, top: pieTop, indiceActual: indiceLamina, dominio });

  const anchoTile = 330;
  const tileX = posicionTile === 'izquierda' ? offsetX + MARGEN : offsetX + ANCHO_LAMINA - MARGEN - anchoTile;
  const tileTop = 168;
  const innerAltura = 120 + 6 + 33;
  const innerTop = tileTop + (anchoTile - innerAltura) / 2;
  const centroX = tileX + anchoTile / 2;

  const conteo = categoria.productos.length;
  const tile = `<rect x="${tileX}" y="${tileTop}" width="${anchoTile}" height="${anchoTile}" rx="${
    anchoTile * 0.26
  }" fill="${PALETA.blanco}" fill-opacity="0.08" stroke="${PALETA.blanco}" stroke-opacity="0.16" stroke-width="6"/>
  ${svgTexto(
    {
      x: centroX,
      y: innerTop + 120,
      fuente: fuenteBold,
      fontSize: 120,
      fill: PALETA.blanco,
      textAnchor: 'middle',
    },
    String(conteo),
  )}
  ${svgTexto(
    {
      x: centroX,
      y: innerTop + 120 + 6 + 33,
      fuente: FUENTE_INTER,
      fontSize: 33,
      fill: PALETA.bajadaClara,
      textAnchor: 'middle',
    },
    'productos',
  )}`;

  return `${tile}\n${eyebrow}\n${nombre}\n${resumen}\n${pie}`;
}

async function svgLamina6({ offsetX, site, dominio }) {
  const pieAltura = 33;
  const eyebrowAltura = 33;
  const sellosAltura = site.sellosConfianza.length * 48 + (site.sellosConfianza.length - 1) * GAP_ENTRE_SELLOS;
  const ctaAltura = 108;

  const pieTop = BORDE_INFERIOR_CONTENIDO - pieAltura;
  const ctaBottom = pieTop - GAP_ANTES_PIE;
  const ctaTop = ctaBottom - ctaAltura;
  const sellosBottom = ctaTop - GAP_SELLOS_A_CTA;
  const sellosTop = sellosBottom - sellosAltura;
  const eyebrowBottom = sellosTop - GAP_DEFAULT;
  const eyebrowTop = eyebrowBottom - eyebrowAltura;

  verificarBloquesEnLaCaja('la lámina 6', [
    { top: eyebrowTop, bottom: eyebrowBottom },
    { top: sellosTop, bottom: sellosBottom },
    { top: ctaTop, bottom: ctaBottom },
    { top: pieTop, bottom: pieTop + pieAltura },
  ]);

  const eyebrow = svgEyebrow({ offsetX, top: eyebrowTop, texto: 'Compra segura' });

  const sellos = site.sellosConfianza
    .map((texto, indice) => {
      const filaTop = sellosTop + indice * (48 + GAP_ENTRE_SELLOS);
      const barraY = filaTop + (48 - 15) / 2;
      return `<rect x="${offsetX + MARGEN}" y="${barraY}" width="66" height="15" fill="${PALETA.cobreClaro}"/>
      ${svgTexto(
        {
          x: offsetX + MARGEN + 66 + 36,
          y: filaTop + 48,
          fuente: FUENTE_SORA_SEMIBOLD,
          fontSize: 48,
          fill: PALETA.blanco,
        },
        texto,
      )}`;
    })
    .join('\n');

  const textoCta = 'Catálogo completo en Mercado Libre';
  const anchoCtaTexto = await medirAnchoTexto(textoCta, { fuente: FUENTE_SORA_SEMIBOLD, fontSize: 42 });
  const paddingCta = paddingPildora(anchoCtaTexto, 54);
  const anchoCta = anchoCtaTexto + paddingCta * 2;
  verificarPildoraEnContenido('CTA', anchoCta);
  const cta = `<rect x="${offsetX + MARGEN}" y="${ctaTop}" width="${anchoCta}" height="${ctaAltura}" rx="${
    ctaAltura / 2
  }" fill="${PALETA.blanco}"/>
  ${svgTexto(
    {
      x: offsetX + MARGEN + paddingCta,
      y: ctaTop + 33 + 42,
      fuente: FUENTE_SORA_SEMIBOLD,
      fontSize: 42,
      fill: PALETA.primario,
    },
    textoCta,
  )}`;

  const pie = svgPie({ offsetX, top: pieTop, indiceActual: 5, dominio });

  return `${eyebrow}\n${sellos}\n${cta}\n${pie}`;
}

function svgBaldosaBlanca({ x, y, ladoBase, escala, mainStroke, crossStroke }) {
  const radio = ladoBase * 0.26;
  return `<g transform="translate(${x} ${y})">
    <rect width="${ladoBase}" height="${ladoBase}" rx="${radio}" fill="${PALETA.blanco}"/>
    <g transform="scale(${escala})" fill="none" stroke-linecap="butt" stroke-linejoin="bevel">
      <path d="M26 74 L46 26 L66 74" stroke="${mainStroke}" stroke-width="11"/>
      <path d="M37 59 L55 59" stroke="${crossStroke}" stroke-width="11"/>
    </g>
  </g>`;
}

function svgBaldosaFantasma({ x, y, lado }) {
  const radio = lado * 0.26;
  return `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" rx="${radio}" fill="${PALETA.blanco}" fill-opacity="0.08" stroke="${PALETA.blanco}" stroke-opacity="0.16" stroke-width="6"/>`;
}

function svgConstelacionYcruces() {
  const principal = svgBaldosaBlanca({
    x: 720,
    y: 270,
    ladoBase: 192,
    escala: 2,
    mainStroke: PALETA.primario,
    crossStroke: PALETA.acento,
  });

  const fantasmasConstelacion = [
    { x: 720, y: 30, lado: 192 },
    { x: 480, y: 270, lado: 192 },
    { x: 960, y: 270, lado: 192 },
    { x: 720, y: 510, lado: 192 },
  ]
    .map(svgBaldosaFantasma)
    .join('\n');

  const fantasmasSueltas = [
    { x: 2088, y: 765, lado: 144 },
    { x: 3156, y: 330, lado: 168 },
    { x: 4254, y: 885, lado: 132 },
    { x: 5316, y: 435, lado: 168 },
  ]
    .map(svgBaldosaFantasma)
    .join('\n');

  return `${fantasmasConstelacion}\n${principal}\n${fantasmasSueltas}`;
}

export async function svgCarrusel(site, fuenteBold) {
  if (site.categorias.length !== 3) {
    throw new Error(
      `El layout del carrusel de 6 láminas asume exactamente 3 categorías; site.json tiene ${site.categorias.length}.`,
    );
  }

  const dominio = site.dominio;

  const lamina1 = await svgLamina1({ offsetX: 0, site, dominio, fuenteBold });
  const lamina2 = await svgLamina2({ offsetX: ANCHO_LAMINA, site, dominio });

  const posicionesTile = ['derecha', 'izquierda', 'derecha'];
  const laminasCategoria = [];
  for (let indice = 0; indice < site.categorias.length; indice++) {
    laminasCategoria.push(
      await svgLaminaCategoria({
        offsetX: ANCHO_LAMINA * (2 + indice),
        indiceLamina: 2 + indice,
        categoria: site.categorias[indice],
        posicionTile: posicionesTile[indice],
        dominio,
        fuenteBold,
      }),
    );
  }

  const lamina6 = await svgLamina6({ offsetX: ANCHO_LAMINA * 5, site, dominio });

  const constelacion = svgConstelacionYcruces();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO_TIRA}" height="${ALTO_LAMINA}" viewBox="0 0 ${ANCHO_TIRA} ${ALTO_LAMINA}">
    <defs>${svgDefsFondoRedes()}${svgClipsLaminas()}</defs>
    ${svgFondosLaminas()}
    ${lamina1}
    ${lamina2}
    ${laminasCategoria.join('\n')}
    ${lamina6}
    ${constelacion}
  </svg>`;

  return svg;
}

const recortarLaminas = (tira) =>
  Promise.all(
    Array.from({ length: NUMERO_LAMINAS }, (_, indice) =>
      sharp(tira)
        .extract({ left: indice * ANCHO_LAMINA, top: 0, width: ANCHO_LAMINA, height: ALTO_LAMINA })
        .png()
        .toBuffer(),
    ),
  );

const renderizarSvg = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

const svgSoloFondosDeLaminas = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO_TIRA}" height="${ALTO_LAMINA}" viewBox="0 0 ${ANCHO_TIRA} ${ALTO_LAMINA}"><defs>${svgDefsFondoRedes()}${svgClipsLaminas()}</defs>${svgFondosLaminas()}</svg>`;

function svgAvatar({ conMonograma = true } = {}) {
  const monograma = `<g transform="translate(48 48) scale(1.1) translate(-46 -50)" fill="none" stroke-linecap="butt" stroke-linejoin="bevel"><path d="M26 74 L46 26 L66 74" stroke="${PALETA.blanco}" stroke-width="11"/><path d="M37 59 L55 59" stroke="${PALETA.cobreClaro}" stroke-width="11"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 96 96"><defs><linearGradient id="fa" x1="41.32%" y1="0.76%" x2="58.68%" y2="99.24%"><stop offset="0%" stop-color="${PALETA.primario}"/><stop offset="100%" stop-color="${PALETA.primarioOscuro}"/></linearGradient><radialGradient id="ra" cx="88%" cy="8%" r="65%"><stop offset="0%" stop-color="${PALETA.acento}" stop-opacity="0.35"/><stop offset="100%" stop-color="${PALETA.acento}" stop-opacity="0"/></radialGradient></defs><rect width="96" height="96" fill="url(#fa)"/><rect width="96" height="96" fill="url(#ra)"/>${conMonograma ? monograma : ''}</svg>`;
}

async function renderizarRasters(site, fuenteBold) {
  const [avatar, fondoAvatar, laminas, fondosLaminas] = await Promise.all([
    renderizarSvg(svgAvatar()),
    renderizarSvg(svgAvatar({ conMonograma: false })),
    svgCarrusel(site, fuenteBold).then(renderizarSvg).then(recortarLaminas),
    renderizarSvg(svgSoloFondosDeLaminas()).then(recortarLaminas),
  ]);
  const buffers = [avatar, ...laminas];
  const fondos = [fondoAvatar, ...fondosLaminas];
  return RASTERS_REDES.map(({ ruta, ancho, alto }, indice) => ({
    ruta,
    ancho,
    alto,
    buffer: buffers[indice],
    fondo: fondos[indice],
  }));
}

async function generar({ salida, dirFuentes, site }) {
  const cache = configurarFuentes(dirFuentes, FUENTES_REQUERIDAS);
  try {
    await verificarSoraAplicada(renderMuestra);
    const fuenteBold = await detectarFamiliaBold();
    await validarYEscribir(await renderizarRasters(site, fuenteBold), salida);
    for (const { ruta, ancho, alto } of RASTERS_REDES) console.log(`${ruta}: ${ancho}x${alto}`);
    console.log(`Fuente bold detectada: ${typeof fuenteBold === 'string' ? fuenteBold : JSON.stringify(fuenteBold)}`);
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
}

export async function main({ salida = RAIZ, dirFuentes = DIR_FUENTES, site = leerSiteJson() } = {}) {
  try {
    await generar({ salida, dirFuentes, site });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (esModuloDeEntrada(import.meta.url)) await main();
