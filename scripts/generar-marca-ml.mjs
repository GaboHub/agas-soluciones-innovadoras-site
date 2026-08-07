#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(dirname, '..');
const FUENTES_DIR = path.join(ROOT_DIR, 'marca/fuentes');
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules/.cache/fontconfig-marca-ml');
const FONTS_CONF_PATH = path.join(CACHE_DIR, 'fonts.conf');

const RUTAS_FUENTES = {
  soraSemiBold: path.join(FUENTES_DIR, 'Sora-SemiBold.ttf'),
  interRegular: path.join(FUENTES_DIR, 'Inter-Regular.ttf'),
};

for (const ruta of Object.values(RUTAS_FUENTES)) {
  if (!existsSync(ruta)) {
    console.error(`Falta la fuente convertida en ${ruta}.`);
    console.error('Convierte los .woff de node_modules/@fontsource/{sora,inter}/files/ a .ttf con fontTools y guárdalos en marca/fuentes/ antes de correr este script.');
    process.exit(1);
  }
}

mkdirSync(CACHE_DIR, { recursive: true });
writeFileSync(
  FONTS_CONF_PATH,
  `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${FUENTES_DIR}</dir>
  <cachedir>${CACHE_DIR}</cachedir>
</fontconfig>
`,
);

process.env.FONTCONFIG_FILE = FONTS_CONF_PATH;
process.env.FONTCONFIG_PATH = '';

const sharp = (await import('sharp')).default;

const PALETA = {
  primario: '#24455C',
  primarioOscuro: '#16303F',
  acento: '#9E5220',
  cobreClaro: '#C8813F',
  blanco: '#FFFFFF',
  arenaTexto: '#B9C9CF',
};

const FUENTE_SORA_SEMIBOLD = 'Sora SemiBold';
const FUENTE_INTER = 'Inter';

const RUTAS_ML = {
  logo: path.join(ROOT_DIR, 'marca/mercadolibre/logo.png'),
  bannerEscritorio: path.join(ROOT_DIR, 'marca/mercadolibre/banner-escritorio.png'),
  bannerMovil: path.join(ROOT_DIR, 'marca/mercadolibre/banner-movil.png'),
};

const RASTERS_SITIO = [
  path.join(ROOT_DIR, 'public/apple-touch-icon.png'),
  path.join(ROOT_DIR, 'public/logo.png'),
  path.join(ROOT_DIR, 'src/assets/images/logo.png'),
];

function escaparXml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function verificarCargaDeFuentes() {
  const render = (fontFamily) =>
    sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120"><text x="10" y="90" font-family="${fontFamily}" font-size="72" fill="#000000">AGAS</text></svg>`,
      ),
    )
      .png()
      .toBuffer();

  const [conSora, conFallback] = await Promise.all([render(FUENTE_SORA_SEMIBOLD), render('serif')]);

  if (conSora.equals(conFallback)) {
    console.error('La fuente Sora no se aplicó: el render con "Sora SemiBold" es idéntico al de "serif".');
    console.error('Revisa que marca/fuentes/*.ttf existan y que fonts.conf apunte a esa carpeta.');
    process.exit(1);
  }

  const recorte = await sharp(conSora).trim().metadata();
  if (!recorte.width || recorte.width === 0) {
    console.error('El motor de texto no dibujó nada: el recorte de "AGAS" en Sora tiene ancho cero.');
    console.error('No hay un fallback razonable: revisa la instalación de librsvg/pango incluida con sharp.');
    process.exit(1);
  }
}

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
  <text x="122" y="100" font-family="${FUENTE_INTER}" font-size="16" letter-spacing="3" fill="${PALETA.arenaTexto}">SOLUCIONES INNOVADORAS</text>`;
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
  return JSON.parse(readFileSync(path.join(ROOT_DIR, 'src/data/site.json'), 'utf-8'));
}

async function generarLogoMercadoLibre() {
  const svg = svgIconoStandalone(1000);
  await sharp(Buffer.from(svg)).png().toFile(RUTAS_ML.logo);
}

async function generarBannerEscritorio(site) {
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

  await sharp(Buffer.from(svg)).png().toFile(RUTAS_ML.bannerEscritorio);
}

async function generarBannerMovil(site) {
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

  await sharp(Buffer.from(svg)).png().toFile(RUTAS_ML.bannerMovil);
}

async function regenerarRastersSitio() {
  for (const ruta of RASTERS_SITIO) {
    if (!existsSync(ruta)) {
      console.error(`No existe el raster a regenerar: ${ruta}`);
      process.exit(1);
    }
    const { width, height } = await sharp(ruta).metadata();
    if (!width || !height || width !== height) {
      console.error(`Dimensiones inesperadas en ${ruta}: ${width}x${height} (se esperaba un cuadrado).`);
      process.exit(1);
    }
    const svg = svgIconoStandalone(width);
    await sharp(Buffer.from(svg)).png().toFile(ruta);
  }
}

function verificarPeso(ruta) {
  const { size } = statSync(ruta);
  const limite = 10 * 1024 * 1024;
  if (size >= limite) {
    console.error(`${ruta} pesa ${(size / 1024 / 1024).toFixed(2)} MB, supera el límite de 10 MB.`);
    process.exit(1);
  }
}

async function main() {
  mkdirSync(path.dirname(RUTAS_ML.logo), { recursive: true });

  await verificarCargaDeFuentes();

  const site = leerSiteJson();

  await generarLogoMercadoLibre();
  await generarBannerEscritorio(site);
  await generarBannerMovil(site);
  await regenerarRastersSitio();

  const generados = [RUTAS_ML.logo, RUTAS_ML.bannerEscritorio, RUTAS_ML.bannerMovil, ...RASTERS_SITIO];
  for (const ruta of generados) {
    verificarPeso(ruta);
    const { width, height } = await sharp(ruta).metadata();
    console.log(`${path.relative(ROOT_DIR, ruta)}: ${width}x${height}`);
  }
}

await main();
