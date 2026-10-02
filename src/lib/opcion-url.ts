interface GrupoUbicable {
  nombre: string;
  opciones: { nombre: string }[];
}

export interface PosicionDeOpcion {
  indiceGrupo: number;
  indiceOpcion: number;
}

export function slugOpcion(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function claveOpcion(grupo: string, opcion: string, conGrupo: boolean): string {
  return conGrupo ? `${slugOpcion(grupo)}-${slugOpcion(opcion)}` : slugOpcion(opcion);
}

export function ubicarOpcion(grupos: GrupoUbicable[], clave: string | null): PosicionDeOpcion | null {
  if (!clave) return null;
  const conGrupo = grupos.length > 1;
  for (const [indiceGrupo, grupo] of grupos.entries()) {
    const indiceOpcion = grupo.opciones.findIndex(
      (opcion) => claveOpcion(grupo.nombre, opcion.nombre, conGrupo) === clave,
    );
    if (indiceOpcion >= 0) return { indiceGrupo, indiceOpcion };
  }
  return null;
}
