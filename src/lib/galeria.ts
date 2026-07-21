import { getImage } from 'astro:assets';
import { resolveImagen } from './images';
import type { FotoGaleria } from '../components/GalleryLightbox';

export async function fotosDesdeRutas(rutas: string[], altBase: string): Promise<FotoGaleria[]> {
  return Promise.all(
    rutas.map(async (ruta, indice) => {
      const origen = resolveImagen(ruta);
      const thumb = await getImage({ src: origen, width: 480 });
      const full = await getImage({ src: origen, width: 800 });
      return {
        thumbSrc: thumb.src,
        thumbWidth: thumb.attributes.width as number,
        thumbHeight: thumb.attributes.height as number,
        fullSrc: full.src,
        fullWidth: full.attributes.width as number,
        fullHeight: full.attributes.height as number,
        alt: `Foto ${indice + 1} de ${altBase}`,
      };
    }),
  );
}
