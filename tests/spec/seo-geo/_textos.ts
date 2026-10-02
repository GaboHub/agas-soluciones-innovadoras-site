export interface TextoProducto {
  descripcion: string;
  metaDescription: string;
}

export interface FichaConResenas {
  slug: string;
  reviews?: { promedio: number; cantidad: number };
}

export const fichasSinTexto = (fichas: FichaConResenas[], textos: Record<string, TextoProducto>): string[] =>
  fichas.map((ficha) => ficha.slug).filter((slug) => !(slug in textos));

export const textosSinFicha = (fichas: FichaConResenas[], textos: Record<string, TextoProducto>): string[] => {
  const slugs = new Set(fichas.map((ficha) => ficha.slug));
  return Object.keys(textos).filter((slug) => !slugs.has(slug));
};

export const citasInventadas = (fichas: FichaConResenas[], textos: Record<string, TextoProducto>): string[] => {
  const problemas: string[] = [];
  for (const ficha of fichas) {
    const texto = textos[ficha.slug];
    if (!texto) continue;
    for (const campo of [texto.descripcion, texto.metaDescription]) {
      for (const [, promedio] of campo.matchAll(/(\d+(?:[.,]\d+)?)\s*★/g)) {
        if (ficha.reviews?.promedio !== Number(promedio.replace(',', '.'))) {
          problemas.push(`${ficha.slug}: cita ${promedio}★ y la ficha tiene ${ficha.reviews?.promedio ?? 'sin reseñas'}`);
        }
      }
      for (const [, cantidad] of campo.matchAll(/(\d{1,3}(?:[.,]\d{3})+|\d+)\s+reseñas?/gi)) {
        if (ficha.reviews?.cantidad !== Number(cantidad.replace(/[.,]/g, ''))) {
          problemas.push(`${ficha.slug}: cita ${cantidad} reseñas y la ficha tiene ${ficha.reviews?.cantidad ?? 'sin reseñas'}`);
        }
      }
    }
  }
  return problemas;
};
