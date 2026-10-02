const FECHA = /^\d{4}-\d{2}-\d{2}$/;

type Texto = unknown;
type Cupon = { id: Texto; nombre: Texto; porcentaje: Texto; condicion: Texto; desde: Texto; hasta: Texto };
type Campana = { id: Texto; nombre: Texto; descripcion: Texto; desde: Texto; hasta: Texto };
type Faq = { pregunta: Texto; respuesta: Texto };
export type DatosPromociones = { aclaracion: Texto; cupones: Cupon[]; campanas: Campana[]; faqs: Faq[] };

const noVacio = (valor: Texto) => typeof valor === 'string' && valor.trim().length > 0;

const validarVentana = (promo: { desde: Texto; hasta: Texto }, etiqueta: string): string[] => {
  const errores: string[] = [];
  for (const campo of ['desde', 'hasta'] as const) {
    if (typeof promo[campo] !== 'string' || !FECHA.test(promo[campo])) errores.push(`${etiqueta}: ${campo} debe ser AAAA-MM-DD`);
  }
  if (errores.length === 0 && (promo.hasta as string) < (promo.desde as string)) errores.push(`${etiqueta}: hasta anterior a desde`);
  return errores;
};

const idsRepetidos = (coleccion: string, items: { id: Texto }[]): string[] =>
  items
    .map((item) => item.id)
    .filter((id, indice, todos) => todos.indexOf(id) !== indice)
    .map((id) => `${coleccion}: id repetido "${id}"`);

export function validarPromociones(datos: DatosPromociones): string[] {
  const errores: string[] = [];
  if (!noVacio(datos.aclaracion)) errores.push('aclaracion vacía');

  datos.cupones.forEach((cupon, indice) => {
    const etiqueta = `cupones[${indice}]`;
    for (const campo of ['id', 'nombre', 'condicion'] as const) {
      if (!noVacio(cupon[campo])) errores.push(`${etiqueta}: ${campo} vacío`);
    }
    if (!Number.isInteger(cupon.porcentaje) || (cupon.porcentaje as number) < 1 || (cupon.porcentaje as number) > 99) {
      errores.push(`${etiqueta}: porcentaje debe ser un entero entre 1 y 99`);
    }
    errores.push(...validarVentana(cupon, etiqueta));
  });

  datos.campanas.forEach((campana, indice) => {
    const etiqueta = `campanas[${indice}]`;
    for (const campo of ['id', 'nombre', 'descripcion'] as const) {
      if (!noVacio(campana[campo])) errores.push(`${etiqueta}: ${campo} vacío`);
    }
    errores.push(...validarVentana(campana, etiqueta));
  });

  errores.push(...idsRepetidos('cupones', datos.cupones), ...idsRepetidos('campanas', datos.campanas));

  if (datos.faqs.length < 3) errores.push('faqs: se requieren al menos 3');
  datos.faqs.forEach((faq, indice) => {
    for (const campo of ['pregunta', 'respuesta'] as const) {
      if (!noVacio(faq[campo])) errores.push(`faqs[${indice}]: ${campo} vacío`);
    }
  });

  return errores;
}
