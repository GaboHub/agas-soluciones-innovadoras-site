export function formatearPrecioCLP(valor: number): string {
  return `$${valor.toLocaleString('es-CL')}`;
}

export function formatearFecha(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-');
  return `${dia}-${mes}-${anio}`;
}

export function leyendaPrecio(fechaIso: string): string {
  return `Precio referencial al ${formatearFecha(fechaIso)} — ver precio vigente en Mercado Libre`;
}
