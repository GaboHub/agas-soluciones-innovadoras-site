import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  configurarFuentes,
  leerNombresDeFuente,
  LIMITE_DE_PESO,
  validarYEscribir,
  verificarRenderNoVacio,
  verificarSoraAplicada,
} from '../../../scripts/marca-comun.mjs';
import {
  detectarFamiliaBold,
  extraerPrimeraOracion,
  partirEnLineas,
  svgCarrusel,
  verificarBloquesEnLaCaja,
} from '../../../scripts/generar-marca-redes.mjs';
import {
  correrMain,
  directorioTemporal,
  FUENTES_ML,
  FUENTES_REDES,
  fuentesConArchivosVacios,
  fuenteDelRepo,
  fuentesConNombres,
  fuentesDelRepoCon,
  fuentesSinSora,
  fuentesVacias,
  SCRIPT_ML,
  SCRIPT_REDES,
  ttfConNombres,
} from './_generadores';
import { raiz } from './_marca';
import site from '../../../src/data/site.json' with { type: 'json' };

const FONDO_TRANSPARENTE = [0, 0, 0, 0];
const ACERO = { r: 36, g: 69, b: 92, alpha: 1 };

const lienzo = (ancho: number, alto: number, fondo: { r: number; g: number; b: number; alpha: number } = { r: 0, g: 0, b: 0, alpha: 0 }) =>
  sharp({ create: { width: ancho, height: alto, channels: 4, background: fondo } });

const pngConUnPixelDistinto = async (ancho = 8, alto = 8) => {
  const { data, info } = await lienzo(ancho, alto).raw().toBuffer({ resolveWithObject: true });
  data[(3 * info.width + 5) * 4 + 1] = 1;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const pngDeRuido = (lado: number): Promise<Buffer> =>
  sharp(randomBytes(lado * lado * 4), { raw: { width: lado, height: lado, channels: 4 } }).png().toBuffer();

const pngsEn = (directorio: string): string[] =>
  existsSync(directorio) ? readdirSync(directorio, { recursive: true, encoding: 'utf-8' }).filter((ruta) => ruta.endsWith('.png')) : [];

const palabras = (palabra: string, cantidad: number): string => Array.from({ length: cantidad }, () => palabra).join(' ');

const sitioCon = (cambios: Record<string, unknown>) => ({ ...site, ...cambios });

const terminaConCodigo1SinRasters = (script: string, opciones: Parameters<typeof correrMain>[2], mensaje: RegExp) => {
  const salida = directorioTemporal('salida');
  const resultado = correrMain(script, salida, opciones);
  expect(resultado.stderr, script).toMatch(mensaje);
  expect(resultado.status, script).toBe(1);
  expect(pngsEn(salida), script).toEqual([]);
};

describe('[marca] Guardas de los generadores de marca', () => {
  beforeAll(() => {
    configurarFuentes();
  });

  it('Render vacío', async () => {
    expect(await lienzo(8, 8).png().toBuffer()).toBeInstanceOf(Buffer);
    await expect(verificarRenderNoVacio(await lienzo(8, 8).png().toBuffer(), FONDO_TRANSPARENTE)).rejects.toThrow(/vacío/);
    await expect(verificarRenderNoVacio(await lienzo(8, 8, ACERO).png().toBuffer(), [36, 69, 92, 255])).rejects.toThrow(/vacío/);
    await expect(verificarRenderNoVacio(await pngConUnPixelDistinto(), FONDO_TRANSPARENTE)).resolves.toBeUndefined();
    await expect(verificarRenderNoVacio(await lienzo(8, 8, ACERO).png().toBuffer(), FONDO_TRANSPARENTE)).resolves.toBeUndefined();
  });

  it('el render de muestra de Sora vacío se rechaza aunque difiera del de serif', async () => {
    const vacioDeSora = await lienzo(8, 8).png().toBuffer();
    const conTexto = await pngConUnPixelDistinto();
    await expect(verificarSoraAplicada(async (familia: string) => (familia === 'serif' ? conTexto : vacioDeSora))).rejects.toThrow(/vacío/);
    await expect(verificarSoraAplicada(async (familia: string) => (familia === 'serif' ? vacioDeSora : conTexto))).resolves.toBeUndefined();
    await expect(verificarSoraAplicada(async () => conTexto)).rejects.toThrow(/no se aplicó/);
  });

  it('Fuente ausente', () => {
    const casos = [
      { script: SCRIPT_ML, fuentes: FUENTES_ML },
      { script: SCRIPT_REDES, fuentes: FUENTES_REDES },
    ];
    for (const { script, fuentes } of casos) {
      terminaConCodigo1SinRasters(script, { dirFuentes: fuentesVacias() }, /Falta la fuente/);
      terminaConCodigo1SinRasters(script, { dirFuentes: fuentesSinSora(fuentes) }, /Sora/);
    }
  }, 120000);

  it('Fuente inválida', () => {
    for (const [script, fuentes] of [
      [SCRIPT_ML, FUENTES_ML],
      [SCRIPT_REDES, FUENTES_REDES],
    ] as const) {
      terminaConCodigo1SinRasters(script, { dirFuentes: fuentesConArchivosVacios([...fuentes]) }, /Sora/);
    }
    const semiBold = fuenteDelRepo('Sora-SemiBold.ttf');
    const bold = fuenteDelRepo('Sora-Bold.ttf');
    terminaConCodigo1SinRasters(SCRIPT_REDES, { dirFuentes: fuentesDelRepoCon({ 'Sora-Bold.ttf': semiBold }) }, /Sora-Bold\.ttf declara la familia "Sora SemiBold"/);
    const familiaAjena = ttfConNombres([{ plataforma: 3, id: 1, texto: 'Sora Foo' }, { plataforma: 3, id: 2, texto: 'Bold' }]);
    terminaConCodigo1SinRasters(SCRIPT_REDES, { dirFuentes: fuentesDelRepoCon({ 'Sora-Bold.ttf': familiaAjena }) }, /Sora-Bold\.ttf declara la familia "Sora Foo"/);
    for (const script of [SCRIPT_ML, SCRIPT_REDES]) {
      terminaConCodigo1SinRasters(script, { dirFuentes: fuentesDelRepoCon({ 'Sora-SemiBold.ttf': bold }) }, /Sora-SemiBold\.ttf declara el estilo "Sora Bold"/);
    }
  }, 120000);

  it('los procesos hijos con las fuentes y los datos del repo terminan con código 0 y escriben todos los rasters', () => {
    const esperados = {
      [SCRIPT_ML]: [
        'marca/mercadolibre/banner-escritorio.png',
        'marca/mercadolibre/banner-movil.png',
        'marca/mercadolibre/logo.png',
        'public/apple-touch-icon.png',
        'public/logo.png',
        'src/assets/images/logo.png',
      ],
      [SCRIPT_REDES]: [
        'marca/redes/avatar.png',
        ...[1, 2, 3, 4, 5, 6].map((numero) => `marca/redes/carrusel-presentacion-${numero}.png`),
      ],
    };
    for (const [script, rutas] of Object.entries(esperados)) {
      const salida = directorioTemporal('salida');
      const resultado = correrMain(script, salida);
      expect(resultado.stderr, script).toBe('');
      expect(resultado.status, script).toBe(0);
      expect(pngsEn(salida).sort(), script).toEqual(rutas);
    }
  }, 120000);

  it('el generador de redes termina con código 1 y sin rasters ante cuatro categorías', () => {
    terminaConCodigo1SinRasters(
      SCRIPT_REDES,
      { site: sitioCon({ categorias: [...site.categorias, site.categorias[0]] }) },
      /3 categorías/,
    );
  }, 120000);

  it('primera oración no extraíble', () => {
    expect(extraerPrimeraOracion('Primera oración. Segunda.', 'hero.bajada')).toBe('Primera oración.');
    expect(() => extraerPrimeraOracion('Sin punto final', 'hero.bajada')).toThrow(/no contiene un punto/);
    expect(() => extraerPrimeraOracion('Dr. Fulano atiende.', 'hero.bajada')).toThrow(/una sola palabra/);
    terminaConCodigo1SinRasters(
      SCRIPT_REDES,
      { site: sitioCon({ hero: { ...site.hero, bajada: 'Una bajada sin punto final' } }) },
      /no contiene un punto/,
    );
  }, 120000);

  it('texto que excede su caja', async () => {
    const opciones = { fuente: 'Inter', fontSize: 42, maxWidth: 888 };
    expect(await partirEnLineas('Texto corto que cabe', opciones)).toEqual(['Texto corto que cabe']);
    await expect(partirEnLineas('Anticonstitucionalissimamente'.repeat(4), opciones)).rejects.toThrow(/supera el ancho máximo/);
  });

  it('texto que excede su caja en vertical', () => {
    expect(() => verificarBloquesEnLaCaja('lámina de prueba', [{ top: 96, bottom: 200 }, { top: 300, bottom: 1254 }])).not.toThrow();
    expect(() => verificarBloquesEnLaCaja('lámina de prueba', [{ top: 95, bottom: 200 }])).toThrow(/fuera de la caja/);
    expect(() => verificarBloquesEnLaCaja('lámina de prueba', [{ top: 300, bottom: 1255 }])).toThrow(/fuera de la caja/);
    terminaConCodigo1SinRasters(
      SCRIPT_REDES,
      { site: sitioCon({ hero: { ...site.hero, titulo: palabras('Innovadoras', 90) } }) },
      /fuera de la caja/,
    );
  }, 120000);

  it('categorías distintas de 3', async () => {
    const fuenteBold = await detectarFamiliaBold();
    await expect(svgCarrusel({ ...site, categorias: site.categorias.slice(0, 2) }, fuenteBold)).rejects.toThrow(/3 categorías/);
    await expect(svgCarrusel({ ...site, categorias: [...site.categorias, site.categorias[0]] }, fuenteBold)).rejects.toThrow(/3 categorías/);
    expect(await svgCarrusel(site, fuenteBold)).toContain('<svg');
  });

  it('Sora Bold igual a SemiBold', async () => {
    const semiBold = await lienzo(8, 8).png().toBuffer();
    const serif = await pngConUnPixelDistinto();
    const distinto = await pngConUnPixelDistinto(9, 9);
    await expect(detectarFamiliaBold(async () => semiBold)).rejects.toThrow(/Sora Bold/);
    await expect(detectarFamiliaBold(async (familia: unknown) => (familia === 'serif' ? serif : semiBold))).rejects.toThrow(/Sora Bold/);
    await expect(
      detectarFamiliaBold(async (familia: unknown) =>
        familia === 'serif' ? serif : familia === 'Sora SemiBold' ? semiBold : distinto,
      ),
    ).resolves.toEqual({ family: 'Sora Bold' });
  });

  it('tabla name de las fuentes', () => {
    const repo = (archivo: string) => readFileSync(path.join(raiz, 'marca/fuentes', archivo));
    expect(leerNombresDeFuente(repo('Sora-SemiBold.ttf'))).toEqual({ familia: 'Sora SemiBold', subfamilia: 'Regular' });
    expect(leerNombresDeFuente(repo('Sora-Bold.ttf'))).toEqual({ familia: 'Sora', subfamilia: 'Bold' });
    expect(leerNombresDeFuente(ttfConNombres([{ plataforma: 3, id: 1, texto: 'Sora SemiBold' }, { plataforma: 3, id: 2, texto: 'Regular' }, { plataforma: 3, id: 16, texto: 'Sora' }, { plataforma: 3, id: 17, texto: 'SemiBold' }]))).toEqual({ familia: 'Sora', subfamilia: 'SemiBold' });
    expect(leerNombresDeFuente(ttfConNombres([{ plataforma: 1, id: 1, texto: 'Sora' }, { plataforma: 1, id: 2, texto: 'Bold' }]))).toEqual({ familia: 'Sora', subfamilia: 'Bold' });
    expect(() => leerNombresDeFuente(Buffer.alloc(0))).toThrow(/tabla name/);
    expect(() => leerNombresDeFuente(Buffer.alloc(40))).toThrow(/tabla name/);
    expect(() => leerNombresDeFuente(ttfConNombres([{ plataforma: 3, id: 3, texto: 'x' }]))).toThrow(/familia/);
    expect(() => leerNombresDeFuente(ttfConNombres([{ plataforma: 3, id: 1, texto: 'Sora' }]).subarray(0, 40))).toThrow(/tabla name/);
  });

  it('la configuración de fuentes exige familia y estilo de Sora en la tabla name', () => {
    const requeridas = [{ archivo: 'Sora-Bold.ttf', familia: 'Sora', estilo: 'Bold' }];
    const fuente = (familia: string, subfamilia: string) =>
      fuentesConNombres({
        'Sora-Bold.ttf': ttfConNombres([{ plataforma: 3, id: 1, texto: familia }, { plataforma: 3, id: 2, texto: subfamilia }]),
      });
    expect(() => configurarFuentes(fuente('Otra', 'Bold'), requeridas)).toThrow(/Sora-Bold\.ttf.*familia/);
    expect(() => configurarFuentes(fuente('Sorapro', 'Bold'), requeridas)).toThrow(/familia/);
    expect(() => configurarFuentes(fuente('Sora', 'Regular'), requeridas)).toThrow(/estilo/);
    expect(() => configurarFuentes(fuente('Sora SemiBold', 'Regular'), requeridas)).toThrow(/familia/);
    expect(() => configurarFuentes(fuente('Sora Foo', 'Bold'), requeridas)).toThrow(/familia/);
    expect(() => configurarFuentes(fuentesConArchivosVacios(['Sora-Bold.ttf']), requeridas)).toThrow(/Sora-Bold\.ttf/);
    expect(existsSync(configurarFuentes(fuente('Sora', 'Bold'), requeridas))).toBe(true);
    expect(existsSync(configurarFuentes(fuente('Sora Bold', 'Regular'), requeridas))).toBe(true);
  });

  describe('validarYEscribir', () => {
    const bueno = async (ruta: string) => ({ ruta, buffer: await pngConUnPixelDistinto(), fondo: FONDO_TRANSPARENTE, ancho: 8, alto: 8 });

    it('escribe todos los rasters de una lista válida', async () => {
      const salida = directorioTemporal('validar');
      await validarYEscribir([await bueno('uno/a.png'), await bueno('dos/b.png')], salida);
      expect(pngsEn(salida).sort()).toEqual(['dos/b.png', 'uno/a.png']);
    });

    it('un raster vacío contra su fondo, uniforme o de otro tamaño que su fondo no deja escribir ninguno', async () => {
      const salida = directorioTemporal('validar');
      const uniforme = await lienzo(8, 8, ACERO).png().toBuffer();
      const conFondoDePng = { ruta: 'dos/c.png', buffer: await pngConUnPixelDistinto(), fondo: await pngConUnPixelDistinto(), ancho: 8, alto: 8 };
      await expect(
        validarYEscribir([await bueno('uno/a.png'), { ruta: 'dos/b.png', buffer: uniforme, fondo: [36, 69, 92, 255], ancho: 8, alto: 8 }], salida),
      ).rejects.toThrow(/dos\/b\.png.*vacío/);
      await expect(
        validarYEscribir([await bueno('uno/a.png'), { ruta: 'dos/b.png', buffer: uniforme, fondo: FONDO_TRANSPARENTE, ancho: 8, alto: 8 }], salida),
      ).rejects.toThrow(/vacío/);
      await expect(validarYEscribir([await bueno('uno/a.png'), conFondoDePng], salida)).rejects.toThrow(/vacío/);
      expect(pngsEn(salida)).toEqual([]);
    });

    it('un raster con otras dimensiones no deja escribir ninguno', async () => {
      const salida = directorioTemporal('validar');
      const ancho = { ruta: 'dos/b.png', buffer: await pngConUnPixelDistinto(9, 8), fondo: FONDO_TRANSPARENTE, ancho: 8, alto: 8 };
      const alto = { ruta: 'dos/b.png', buffer: await pngConUnPixelDistinto(8, 7), fondo: FONDO_TRANSPARENTE, ancho: 8, alto: 8 };
      await expect(validarYEscribir([await bueno('uno/a.png'), ancho], salida)).rejects.toThrow(/dimensiones 9x8, se esperaba 8x8/);
      await expect(validarYEscribir([await bueno('uno/a.png'), alto], salida)).rejects.toThrow(/dimensiones 8x7/);
      expect(pngsEn(salida)).toEqual([]);
    });

    it('un raster de 10 MB o más no deja escribir ninguno', async () => {
      const salida = directorioTemporal('validar');
      const pesado = { ruta: 'dos/b.png', buffer: await pngDeRuido(2000), fondo: FONDO_TRANSPARENTE, ancho: 2000, alto: 2000 };
      expect(pesado.buffer.length).toBeGreaterThanOrEqual(LIMITE_DE_PESO);
      await expect(validarYEscribir([await bueno('uno/a.png'), pesado], salida)).rejects.toThrow(/pesa/);
      expect(pngsEn(salida)).toEqual([]);
      expect(LIMITE_DE_PESO).toBe(10 * 1024 * 1024);
    });

    it('un raster de exactamente 10 MB se rechaza por peso y no deja escribir ninguno', async () => {
      const salida = directorioTemporal('validar');
      const justoEnElLimite = { ruta: 'dos/b.png', buffer: Buffer.alloc(LIMITE_DE_PESO), fondo: FONDO_TRANSPARENTE, ancho: 8, alto: 8 };
      await expect(validarYEscribir([await bueno('uno/a.png'), justoEnElLimite], salida)).rejects.toThrow(/dos\/b\.png pesa 10\.00 MB/);
      expect(pngsEn(salida)).toEqual([]);
    });
  });
});
