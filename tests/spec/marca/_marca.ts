import { readFileSync } from 'node:fs';
import path from 'node:path';

export const raiz = path.resolve(import.meta.dirname, '../../..');

export const leer = (ruta: string): string => readFileSync(path.join(raiz, ruta), 'utf-8');

export const normalizarHex = (hex: string): string => {
  const minusculas = hex.toLowerCase();
  return minusculas.length === 4 ? `#${[...minusculas.slice(1)].map((digito) => digito + digito).join('')}` : minusculas;
};

export const tokensDeTema = (css: string): Record<string, string> => {
  const bloque = css.match(/@theme\s*\{([^}]*)\}/)?.[1] ?? '';
  return Object.fromEntries(
    [...bloque.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map(([, nombre, valor]) => [nombre, normalizarHex(valor)]),
  );
};

export const tokens = (): Record<string, string> => tokensDeTema(leer('src/styles/global.css'));

export const hexDe = (texto: string): string[] =>
  [...texto.matchAll(/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g)].map(([hex]) =>
    normalizarHex(hex),
  );

export const ASSETS_SVG = ['public/favicon.svg', 'src/assets/images/agas-lockup.svg', 'src/assets/images/agas-lockup-blanco.svg'];
export const SCRIPTS_DE_MARCA = ['scripts/generar-marca-ml.mjs', 'scripts/generar-marca-redes.mjs'];
