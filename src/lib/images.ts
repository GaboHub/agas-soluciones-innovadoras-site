import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { siteUrl } from './site';

const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/**/*.{jpg,jpeg,png,webp,svg}',
  { eager: true },
);

const imagenPorRuta: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(files).map(([ruta, mod]) => [
    ruta.replace('/src/assets/images/', ''),
    mod.default,
  ]),
);

export function resolveImagen(ruta: string): ImageMetadata {
  const imagen = imagenPorRuta[ruta];
  if (!imagen) {
    throw new Error(`Imagen no encontrada: ${ruta}`);
  }
  return imagen;
}

export function resolveLogo(): ImageMetadata {
  return resolveImagen('logo.png');
}

export function ogFormat(image: ImageMetadata): 'png' | 'jpg' {
  return image.format === 'png' ? 'png' : 'jpg';
}

export async function optimizedAbsoluteUrl(image: ImageMetadata, width = 630): Promise<string> {
  const optimizada = await getImage({ src: image, width, format: ogFormat(image), quality: 65 });
  return new URL(optimizada.src, siteUrl).toString();
}
