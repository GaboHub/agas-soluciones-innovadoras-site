type Categoria = { slug: string; productos: string[] };
type Ficha = { slug: string; categoria: string };

export function verificarConsistencia(site: { categorias: Categoria[] }, fichas: Ficha[]): string[] {
  const errores: string[] = [];
  const declaraciones = site.categorias.flatMap((categoria) =>
    categoria.productos.map((slug) => ({ slug, categoria: categoria.slug })),
  );
  for (const { slug } of declaraciones) {
    if (!fichas.some((ficha) => ficha.slug === slug)) errores.push(`slug declarado sin ficha: ${slug}`);
  }
  for (const ficha of fichas) {
    const propias = declaraciones.filter((declaracion) => declaracion.slug === ficha.slug);
    if (propias.length === 0) errores.push(`ficha sin declarar en site.json: ${ficha.slug}`);
    if (propias.length > 1) errores.push(`ficha declarada ${propias.length} veces: ${ficha.slug}`);
    if (propias.length === 1 && propias[0].categoria !== ficha.categoria) {
      errores.push(`categoría discordante en ${ficha.slug}: ficha ${ficha.categoria}, site.json ${propias[0].categoria}`);
    }
  }
  return errores;
}
