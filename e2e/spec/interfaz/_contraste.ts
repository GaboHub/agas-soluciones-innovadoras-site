import type { Page } from '@playwright/test';

export type Rgba = [number, number, number, number];

export interface CapaDeFondo {
  tipo: 'linear' | 'radial';
  stops: Rgba[];
}

export interface MedidaSobreDegradado {
  texto: Rgba;
  tamano: number;
  peso: number;
  capas: CapaDeFondo[];
}

export interface MedidaDePlaceholder {
  color: Rgba;
  opacidad: number;
  fondos: Rgba[];
}

const codificarSrgb = (lineal: number): number => {
  const acotado = Math.min(1, Math.max(0, lineal));
  return 255 * (acotado <= 0.0031308 ? 12.92 * acotado : 1.055 * acotado ** (1 / 2.4) - 0.055);
};

const desdeOklab = (luz: number, a: number, b: number, alfa: number): Rgba => {
  const l = (luz + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (luz - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (luz - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    codificarSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    codificarSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    codificarSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    alfa,
  ];
};

export const parsearColor = (valor: string): Rgba => {
  const coincidencia = valor.trim().match(/^(rgba?|color|oklab)\((?:srgb\s+)?([^)]+)\)$/);
  if (!coincidencia) throw new Error(`Formato de color no soportado: ${valor}`);
  const numeros = coincidencia[2].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (coincidencia[1] === 'oklab') return desdeOklab(numeros[0], numeros[1], numeros[2], numeros[3] ?? 1);
  const escala = coincidencia[1] === 'color' ? 255 : 1;
  return [numeros[0] * escala, numeros[1] * escala, numeros[2] * escala, numeros[3] ?? 1];
};

export const componer = (encima: Rgba, debajo: Rgba): Rgba => {
  const alfa = encima[3] + debajo[3] * (1 - encima[3]);
  if (alfa === 0) return [0, 0, 0, 0];
  const canal = (indice: number) =>
    (encima[indice] * encima[3] + debajo[indice] * debajo[3] * (1 - encima[3])) / alfa;
  return [canal(0), canal(1), canal(2), alfa];
};

const luminancia = ([r, g, b]: Rgba): number => {
  const lineal = (canal: number) => {
    const valor = canal / 255;
    return valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
};

export const razonDeContraste = (texto: Rgba, fondoOpaco: Rgba): number => {
  const sobre = componer(texto, fondoOpaco);
  const [claro, oscuro] = [luminancia(sobre), luminancia(fondoOpaco)].sort((a, b) => b - a);
  return (claro + 0.05) / (oscuro + 0.05);
};

export const minimoRequerido = (tamano: number, peso: number): number =>
  tamano >= 24 || (tamano >= 18.66 && peso >= 700) ? 3 : 4.5;

export const razonMinimaSobreDegradado = ({ texto, capas }: MedidaSobreDegradado): number => {
  const bases = capas.filter((capa) => capa.tipo === 'linear').flatMap((capa) => capa.stops);
  if (bases.length === 0) throw new Error('El degradado no tiene una capa lineal opaca de base');
  const velos = capas.filter((capa) => capa.tipo === 'radial').flatMap((capa) => capa.stops);
  const fondos = bases.flatMap((base) => [base, ...velos.filter((velo) => velo[3] > 0).map((velo) => componer(velo, base))]);
  return Math.min(...fondos.map((fondo) => razonDeContraste(texto, fondo)));
};

export const razonDePlaceholder = ({ color, opacidad, fondos }: MedidaDePlaceholder): number => {
  const fondo = fondos.reduce<Rgba>((acumulado, capa) => componer(capa, acumulado), [255, 255, 255, 1]);
  return razonDeContraste([color[0], color[1], color[2], color[3] * opacidad], fondo);
};

export const medirSobreDegradado = (page: Page, selector: string) =>
  page.evaluate((objetivo) => {
    const elemento = document.querySelector(objetivo)!;
    const conGradiente = (inicio: Element) => {
      for (let actual: Element | null = inicio; actual; actual = actual.parentElement) {
        if (getComputedStyle(actual).backgroundImage.includes('gradient')) return actual;
      }
      return null;
    };
    const pintor = conGradiente(elemento);
    const estilo = getComputedStyle(elemento);
    const imagen = pintor ? getComputedStyle(pintor).backgroundImage : '';
    const capas: { tipo: string; texto: string }[] = [];
    let profundidad = 0;
    let inicioCapa = 0;
    for (let indice = 0; indice <= imagen.length; indice++) {
      const caracter = imagen[indice];
      if (caracter === '(') profundidad++;
      if (caracter === ')') profundidad--;
      if ((caracter === ',' && profundidad === 0) || indice === imagen.length) {
        const texto = imagen.slice(inicioCapa, indice).trim();
        capas.push({ tipo: texto.startsWith('linear') ? 'linear' : 'radial', texto });
        inicioCapa = indice + 1;
      }
    }
    return {
      existe: pintor !== null,
      texto: estilo.color,
      tamano: parseFloat(estilo.fontSize),
      peso: Number(estilo.fontWeight),
      capas: capas.filter((capa) => capa.texto).map((capa) => ({
        tipo: capa.tipo,
        stops: capa.texto.match(/rgba?\([^)]*\)|color\([^)]*\)|oklab\([^)]*\)/g) ?? [],
      })),
    };
  }, selector);

export const medirPlaceholder = (page: Page, selector: string) =>
  page.evaluate((objetivo) => {
    const elemento = document.querySelector(objetivo)!;
    const pseudo = getComputedStyle(elemento, '::placeholder');
    const fondos: string[] = [];
    for (let actual: Element | null = elemento; actual; actual = actual.parentElement) {
      fondos.unshift(getComputedStyle(actual).backgroundColor);
    }
    return { color: pseudo.color, opacidad: Number(pseudo.opacity), fondos };
  }, selector);

export const aMedidaSobreDegradado = (crudo: Awaited<ReturnType<typeof medirSobreDegradado>>): MedidaSobreDegradado => ({
  texto: parsearColor(crudo.texto),
  tamano: crudo.tamano,
  peso: crudo.peso,
  capas: crudo.capas.map((capa) => ({ tipo: capa.tipo as 'linear' | 'radial', stops: capa.stops.map(parsearColor) })),
});

export const aMedidaDePlaceholder = (crudo: Awaited<ReturnType<typeof medirPlaceholder>>): MedidaDePlaceholder => ({
  color: parsearColor(crudo.color),
  opacidad: crudo.opacidad,
  fondos: crudo.fondos.map(parsearColor),
});
