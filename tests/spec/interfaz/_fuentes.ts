import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '../../..');
const extensiones = ['.astro', '.tsx', '.ts', '.css'];

export interface Fuente {
  ruta: string;
  texto: string;
}

export const fuentesDeSrc = (): Fuente[] =>
  readdirSync(path.join(raiz, 'src'), { recursive: true, encoding: 'utf-8' })
    .filter((relativo) => extensiones.includes(path.extname(relativo)))
    .map((relativo) => path.join('src', relativo))
    .filter((ruta) => statSync(path.join(raiz, ruta)).isFile())
    .map((ruta) => ({ ruta, texto: readFileSync(path.join(raiz, ruta), 'utf-8') }));

export const coincidenciasEn = (fuentes: Fuente[], patron: RegExp): string[] =>
  fuentes.flatMap(({ ruta, texto }) => [...texto.matchAll(patron)].map((coincidencia) => `${ruta}: ${coincidencia[0]}`));
