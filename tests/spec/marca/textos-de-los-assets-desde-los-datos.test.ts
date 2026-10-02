import { beforeAll, describe, expect, it } from 'vitest';
import { configurarFuentes, escaparXml } from '../../../scripts/marca-comun.mjs';
import { svgBannerEscritorio, svgBannerMovil } from '../../../scripts/generar-marca-ml.mjs';
import { detectarFamiliaBold, svgCarrusel } from '../../../scripts/generar-marca-redes.mjs';
import site from '../../../src/data/site.json' with { type: 'json' };

const conChip = (chip: string) => ({ ...site, hero: { ...site.hero, chip } });
const conProductos = (cantidad: number) => ({
  ...site,
  categorias: site.categorias.map((categoria, indice) =>
    indice === 0 ? { ...categoria, productos: Array.from({ length: cantidad }, (_, numero) => `producto-${numero}`) } : categoria,
  ),
});

describe('[marca] Textos de los assets desde los datos', () => {
  let fuenteBold: Awaited<ReturnType<typeof detectarFamiliaBold>>;

  beforeAll(async () => {
    configurarFuentes();
    fuenteBold = await detectarFamiliaBold();
  });

  it('Copy cambiado', async () => {
    const nuevo = 'Chip de prueba unico';
    const original = escaparXml(site.hero.chip);

    for (const svgBanner of [svgBannerEscritorio, svgBannerMovil]) {
      expect(await svgBanner(site), svgBanner.name).toContain(original);
      expect(await svgBanner(site), svgBanner.name).not.toContain(nuevo);
      expect(await svgBanner(conChip(nuevo)), svgBanner.name).toContain(nuevo);
      expect(await svgBanner(conChip(nuevo)), svgBanner.name).not.toContain(original);
    }

    const carrusel = await svgCarrusel(site, fuenteBold);
    expect(carrusel).toContain(original);
    expect(carrusel).not.toContain(nuevo);
    expect(await svgCarrusel(conChip(nuevo), fuenteBold)).toContain(nuevo);
  });

  it('el envío de los banners y la frase de presentación del carrusel salen de site.json', async () => {
    const envio = 'Envío de prueba unico';
    for (const svgBanner of [svgBannerEscritorio, svgBannerMovil]) {
      expect(await svgBanner(site), svgBanner.name).toContain(escaparXml(site.envio));
      expect(await svgBanner({ ...site, envio }), svgBanner.name).toContain(envio);
    }

    const frase = 'Frase de prueba';
    expect(await svgCarrusel(site, fuenteBold)).toContain(escaparXml(site.presentacionRedes));
    expect(await svgCarrusel(site, fuenteBold)).not.toContain(frase);
    expect(await svgCarrusel({ ...site, presentacionRedes: frase }, fuenteBold)).toContain(frase);
  });

  it('Conteo por categoría', async () => {
    expect(await svgCarrusel(site, fuenteBold)).not.toContain('>987</text>');
    expect(await svgCarrusel(conProductos(987), fuenteBold)).toContain('>987</text>');
    expect(await svgCarrusel(site, fuenteBold)).toContain(`>${site.categorias[0].productos.length}</text>`);
  });
});
