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
  { archivo: 'Inter-Regular.ttf', familia: 'Inter', estilo: 'Regular' },
];

const PALETA = {
  primario: '#24455C',
  primarioOscuro: '#16303F',
  acento: '#9E5220',
  cobreClaro: '#C8813F',
  blanco: '#FFFFFF',
  bajadaClara: '#DCE6ED',
};

const FUENTE_SORA_SEMIBOLD = 'Sora SemiBold';
const FUENTE_INTER = 'Inter';

export const RASTERS_ML = [
  { ruta: 'marca/mercadolibre/logo.png', ancho: 1000, alto: 1000 },
  { ruta: 'marca/mercadolibre/banner-escritorio.png', ancho: 3840, alto: 200 },
  { ruta: 'marca/mercadolibre/banner-movil.png', ancho: 1440, alto: 320 },
  { ruta: 'public/apple-touch-icon.png', ancho: 180, alto: 180 },
  { ruta: 'public/logo.png', ancho: 512, alto: 512 },
  { ruta: 'src/assets/images/logo.png', ancho: 512, alto: 512 },
];

const renderMuestra = (fontFamily) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120"><text x="10" y="90" font-family="${fontFamily}" font-size="72" fill="#000000">AGAS</text></svg>`,
    ),
  )
    .png()
    .toBuffer();

async function medirAnchoTexto(texto, { fontFamily, fontSize, letterSpacing }) {
  const lienzoAncho = fontSize * texto.length + fontSize * 4;
  const lienzoAlto = fontSize * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lienzoAncho}" height="${lienzoAlto}"><text x="0" y="${
    fontSize * 1.4
  }" font-family="${fontFamily}" font-size="${fontSize}"${
    letterSpacing ? ` letter-spacing="${letterSpacing}"` : ''
  } fill="#000000">${escaparXml(texto)}</text></svg>`;
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const recorte = await sharp(buffer).trim().metadata();
  return recorte.width ?? 0;
}

function svgIconoStandalone(size) {
  const escala = size / 96;
  const radio = size * 0.26;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${radio}" fill="${PALETA.primario}"/>
    <g transform="scale(${escala})" fill="none" stroke-linecap="butt" stroke-linejoin="bevel">
      <path d="M26 74 L46 26 L66 74" stroke="${PALETA.blanco}" stroke-width="11"/>
      <path d="M37 59 L55 59" stroke="${PALETA.cobreClaro}" stroke-width="11"/>
    </g>
  </svg>`;
}

function svgBaldosaLockup({ tileFill, aStroke, crossStroke }) {
  return `<rect x="4" y="4" width="88" height="88" rx="22.88" fill="${tileFill}"/>
    <path d="M26 74 L46 26 L66 74" stroke="${aStroke}" stroke-width="11" fill="none" stroke-linecap="butt" stroke-linejoin="bevel"/>
    <path d="M37 59 L55 59" stroke="${crossStroke}" stroke-width="11" fill="none" stroke-linecap="butt"/>`;
}

function svgWordmark({ mainStroke, crossStroke }) {
  return `<g transform="translate(122 12)" fill="none" stroke-width="12" stroke-linecap="butt" stroke-linejoin="bevel">
    <path d="M2 66 L24 6 L46 66" stroke="${mainStroke}"/>
    <path d="M12 47 L36 47" stroke="${crossStroke}"/>
    <path d="M104 14 L96 6 H68 L60 14 V58 L68 66 H96 L104 58 V38 H84" stroke="${mainStroke}"/>
    <path d="M122 66 L144 6 L166 66" stroke="${mainStroke}"/>
    <path d="M132 47 L156 47" stroke="${crossStroke}"/>
    <path d="M224 13 L217 6 H188 L180 14 V27 L188 35 H216 L224 43 V58 L216 66 H187 L180 59" stroke="${mainStroke}"/>
  </g>`;
}

function svgLockupCompletoFondoOscuro() {
  return `<g transform="translate(0 8)">${svgBaldosaLockup({
    tileFill: PALETA.blanco,
    aStroke: PALETA.primario,
    crossStroke: PALETA.acento,
  })}</g>
  ${svgWordmark({ mainStroke: PALETA.blanco, crossStroke: PALETA.cobreClaro })}
  <text x="122" y="100" font-family="${FUENTE_INTER}" font-size="16" letter-spacing="3" fill="${PALETA.bajadaClara}">SOLUCIONES INNOVADORAS</text>`;
}

function svgFondoDegradado(ancho, alto) {
  const angulo = (170 * Math.PI) / 180;
  const dx = Math.sin(angulo);
  const dy = -Math.cos(angulo);
  const x1 = ((0.5 - dx / 2) * 100).toFixed(2);
  const y1 = ((0.5 - dy / 2) * 100).toFixed(2);
  const x2 = ((0.5 + dx / 2) * 100).toFixed(2);
  const y2 = ((0.5 + dy / 2) * 100).toFixed(2);
  return `<defs>
    <linearGradient id="fondo" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0%" stop-color="${PALETA.primario}"/>
      <stop offset="100%" stop-color="${PALETA.primarioOscuro}"/>
    </linearGradient>
    <radialGradient id="resplandor" cx="88%" cy="8%" r="65%">
      <stop offset="0%" stop-color="${PALETA.acento}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${PALETA.acento}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${ancho}" height="${alto}" fill="url(#fondo)"/>
  <rect x="0" y="0" width="${ancho}" height="${alto}" fill="url(#resplandor)"/>`;
}

function extensionRombo(ladoTile, gap) {
  return 1.5 * ladoTile + gap;
}

function ajustarRomboAlAlto({ ladoTileDeseado, gapProporcion, alto, margenMinimo }) {
  let ladoTile = ladoTileDeseado;
  let gap = Math.round(ladoTile * gapProporcion);
  while (extensionRombo(ladoTile, gap) > alto / 2 - margenMinimo && ladoTile > 8) {
    ladoTile -= 1;
    gap = Math.round(ladoTile * gapProporcion);
  }
  return { ladoTile, gap };
}

function svgRomboDecorativo({ x, y, ladoTile, gap }) {
  const posiciones = [
    { dx: 0, dy: -(ladoTile + gap) },
    { dx: -(ladoTile + gap), dy: 0 },
    { dx: ladoTile + gap, dy: 0 },
    { dx: 0, dy: ladoTile + gap },
  ];
  const radio = ladoTile * 0.26;
  return posiciones
    .map(({ dx, dy }, indice) => {
      const cx = x + dx - ladoTile / 2;
      const cy = y + dy - ladoTile / 2;
      if (indice === 0) {
        const escala = ladoTile / 96;
        return `<g transform="translate(${cx} ${cy})">
          <rect width="${ladoTile}" height="${ladoTile}" rx="${radio}" fill="${PALETA.blanco}"/>
          <g transform="scale(${escala})" fill="none" stroke-linecap="butt" stroke-linejoin="bevel">
            <path d="M26 74 L46 26 L66 74" stroke="${PALETA.primario}" stroke-width="11"/>
            <path d="M37 59 L55 59" stroke="${PALETA.acento}" stroke-width="11"/>
          </g>
        </g>`;
      }
      return `<rect x="${cx}" y="${cy}" width="${ladoTile}" height="${ladoTile}" rx="${radio}" fill="${PALETA.blanco}" fill-opacity="0.08" stroke="${PALETA.blanco}" stroke-opacity="0.16" stroke-width="2"/>`;
    })
    .join('\n');
}

function leerSiteJson() {
  return JSON.parse(readFileSync(path.join(RAIZ, 'src/data/site.json'), 'utf-8'));
}

export async function svgBannerEscritorio(site) {
  const ancho = 3840;
  const alto = 200;
  const margen = 80;
  const alturaLockup = 140;
  const escalaLockup = alturaLockup / 112;
  const anchoLockup = 420 * escalaLockup;
  const yLockup = (alto - alturaLockup) / 2;

  const { ladoTile, gap: gapTile } = ajustarRomboAlAlto({
    ladoTileDeseado: 56,
    gapProporcion: 0.25,
    alto,
    margenMinimo: 24,
  });
  const extension = extensionRombo(ladoTile, gapTile);
  const xCentroRombo = ancho - margen - extension;
  const yCentroRombo = alto / 2;

  const texto = `${site.hero.chip} · ${site.envio}`;
  const fontSizeObjetivo = 64;
  const xTexto = margen + anchoLockup + 60;
  const anchoDisponibleTexto = xCentroRombo - extension - 60 - xTexto;

  const anchoMedido = await medirAnchoTexto(texto, {
    fontFamily: FUENTE_SORA_SEMIBOLD,
    fontSize: fontSizeObjetivo,
  });
  const escalaTexto = Math.min(1, anchoDisponibleTexto / anchoMedido);
  const fontSizeFinal = fontSizeObjetivo * escalaTexto;
  const yTexto = alto / 2 + fontSizeFinal * 0.32;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
    ${svgFondoDegradado(ancho, alto)}
    <g transform="translate(${margen} ${yLockup}) scale(${escalaLockup})">${svgLockupCompletoFondoOscuro()}</g>
    <text x="${xTexto}" y="${yTexto}" font-family="${FUENTE_SORA_SEMIBOLD}" font-size="${fontSizeFinal.toFixed(
      2,
    )}" fill="${PALETA.blanco}">${escaparXml(texto)}</text>
    ${svgRomboDecorativo({ x: xCentroRombo, y: yCentroRombo, ladoTile, gap: gapTile })}
  </svg>`;

  return svg;
}

export async function svgBannerMovil(site) {
  const ancho = 1440;
  const alto = 320;
  const margen = 64;
  const alturaLockup = 110;
  const escalaLockup = alturaLockup / 112;
  const anchoLockup = 420 * escalaLockup;
  const yLockup = 40;

  const fontSizeChip = 56;
  const fontSizeEnvio = 44;
  const espacioEntreLineas = 20;
  const yChip = yLockup + alturaLockup + 70;
  const yEnvio = yChip + fontSizeChip * 0.4 + espacioEntreLineas + fontSizeEnvio * 0.8;

  const anchoDisponibleTexto = ancho - margen * 2;
  const [anchoChipMedido, anchoEnvioMedido] = await Promise.all([
    medirAnchoTexto(site.hero.chip, { fontFamily: FUENTE_SORA_SEMIBOLD, fontSize: fontSizeChip }),
    medirAnchoTexto(site.envio, { fontFamily: FUENTE_INTER, fontSize: fontSizeEnvio }),
  ]);
  const escalaChip = Math.min(1, anchoDisponibleTexto / anchoChipMedido);
  const escalaEnvio = Math.min(1, anchoDisponibleTexto / anchoEnvioMedido);
  const fontSizeChipFinal = fontSizeChip * escalaChip;
  const fontSizeEnvioFinal = fontSizeEnvio * escalaEnvio;

  const ladoTile = 32;
  const gapTile = 8;
  const extension = extensionRombo(ladoTile, gapTile);
  const margenRomboDerecho = 48;
  const xCentroRombo = ancho - margenRomboDerecho - extension;
  const yCentroRombo = alto - 70;
  const anchoOcupadoTexto = Math.max(anchoChipMedido * escalaChip, anchoEnvioMedido * escalaEnvio);
  const espacioLibreDerecha = ancho - margen - anchoOcupadoTexto - margenRomboDerecho - extension * 2;
  const incluirRombo =
    espacioLibreDerecha > 60 &&
    yCentroRombo - extension > yEnvio + 20 &&
    yCentroRombo + extension < alto - 12;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
    ${svgFondoDegradado(ancho, alto)}
    <g transform="translate(${margen} ${yLockup}) scale(${escalaLockup})">${svgLockupCompletoFondoOscuro()}</g>
    <text x="${margen}" y="${yChip}" font-family="${FUENTE_SORA_SEMIBOLD}" font-size="${fontSizeChipFinal.toFixed(
      2,
    )}" fill="${PALETA.blanco}">${escaparXml(site.hero.chip)}</text>
    <text x="${margen}" y="${yEnvio}" font-family="${FUENTE_INTER}" font-size="${fontSizeEnvioFinal.toFixed(
      2,
    )}" fill="${PALETA.blanco}" fill-opacity="0.85">${escaparXml(site.envio)}</text>
    ${incluirRombo ? svgRomboDecorativo({ x: xCentroRombo, y: yCentroRombo, ladoTile, gap: gapTile }) : ''}
  </svg>`;

  return svg;
}

const renderizar = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

const TRANSPARENTE = [0, 0, 0, 0];

const svgSoloFondo = (ancho, alto) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">${svgFondoDegradado(ancho, alto)}</svg>`;

async function renderizarRasters(site) {
  const svgs = {
    'marca/mercadolibre/banner-escritorio.png': await svgBannerEscritorio(site),
    'marca/mercadolibre/banner-movil.png': await svgBannerMovil(site),
  };
  return Promise.all(
    RASTERS_ML.map(async ({ ruta, ancho, alto }) => {
      const esBanner = ruta in svgs;
      return {
        ruta,
        ancho,
        alto,
        buffer: await renderizar(esBanner ? svgs[ruta] : svgIconoStandalone(ancho)),
        fondo: esBanner ? await renderizar(svgSoloFondo(ancho, alto)) : TRANSPARENTE,
      };
    }),
  );
}

async function generar({ salida, dirFuentes, site }) {
  const cache = configurarFuentes(dirFuentes, FUENTES_REQUERIDAS);
  try {
    await verificarSoraAplicada(renderMuestra);
    await validarYEscribir(await renderizarRasters(site), salida);
    for (const { ruta, ancho, alto } of RASTERS_ML) console.log(`${ruta}: ${ancho}x${alto}`);
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
