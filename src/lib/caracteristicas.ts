const MAXIMO_DE_PALABRAS = 8;

export interface ItemConRotulo {
  rotulo: string;
  resto: string;
}

export function separarRotulo(item: string): ItemConRotulo | null {
  const corte = item.indexOf(': ');
  if (corte <= 0) return null;
  const prefijo = item.slice(0, corte);
  const resto = item.slice(corte + 1);
  if (/\.(\s|$)/.test(prefijo) || resto.trim() === '') return null;
  if (prefijo.trim().split(/\s+/).length > MAXIMO_DE_PALABRAS) return null;
  return { rotulo: `${prefijo}:`, resto };
}
