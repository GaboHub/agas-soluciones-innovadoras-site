import { useEffect, useId, useState } from 'react';
import GalleryLightbox, { type FotoGaleria } from './GalleryLightbox';
import Icono from './Icono';
import { indiceAlCambiarDeGrupo } from '../lib/ficha';
import { claveOpcion, ubicarOpcion } from '../lib/opcion-url';

export interface OpcionFicha {
  nombre: string;
  link: string;
  precioTexto: string;
  fotos: FotoGaleria[];
}

export interface GrupoFicha {
  nombre: string;
  opciones: OpcionFicha[];
}

interface Props {
  grupos: GrupoFicha[];
  etiquetaGrupo: string;
  etiquetaOpcion: string;
  leyenda: string;
  resumen: string;
  envio: string;
  textoCtaPrincipal: string;
  textoCtaSecundario: string;
  linkCtaSecundario: string;
}

const UMBRAL_SELECT = 10;

function Selector({
  etiqueta,
  nombres,
  indiceActivo,
  onElegir,
  segmentado = false,
}: {
  etiqueta: string;
  nombres: string[];
  indiceActivo: number;
  onElegir: (indice: number) => void;
  segmentado?: boolean;
}) {
  const selectId = useId();

  if (nombres.length > UMBRAL_SELECT) {
    return (
      <div>
        <label htmlFor={selectId} className="font-texto text-sm font-bold text-tinta">
          {etiqueta}: <span className="font-normal text-tinta/70">{nombres[indiceActivo]}</span>
        </label>
        <select
          id={selectId}
          value={indiceActivo}
          onChange={(evento) => onElegir(Number(evento.target.value))}
          className="mt-2 w-full rounded-xl border-2 border-primario-claro bg-white px-3 py-2.5 font-texto text-base text-tinta focus:border-primario"
        >
          {nombres.map((nombre, indice) => (
            <option key={`${nombre}-${indice}`} value={indice}>
              {nombre}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (segmentado) {
    return (
      <div>
        <p id={selectId} className="font-texto text-sm font-bold text-tinta">
          {etiqueta}: <span className="font-normal text-tinta/70">{nombres[indiceActivo]}</span>
        </p>
        <div
          role="group"
          aria-labelledby={selectId}
          className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-2"
        >
          {nombres.map((nombre, indice) => (
            <button
              key={`${nombre}-${indice}`}
              type="button"
              onClick={() => onElegir(indice)}
              aria-pressed={indice === indiceActivo}
              className={`min-h-12 rounded-xl border-2 px-3 font-texto text-sm font-bold transition-colors active:translate-y-[2px] ${
                indice === indiceActivo
                  ? 'border-primario bg-primario text-white'
                  : 'border-primario/60 bg-white text-primario-oscuro hover:bg-primario-claro'
              }`}
            >
              {nombre}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="font-texto text-sm font-bold text-tinta">
        {etiqueta}: <span className="font-normal text-tinta/70">{nombres[indiceActivo]}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {nombres.map((nombre, indice) => (
          <button
            key={`${nombre}-${indice}`}
            type="button"
            onClick={() => onElegir(indice)}
            aria-pressed={indice === indiceActivo}
            className={`min-h-11 rounded-full px-3 font-texto text-sm font-bold transition-colors active:translate-y-[2px] ${
              indice === indiceActivo
                ? 'bg-primario text-white'
                : 'bg-primario-claro text-primario-oscuro hover:bg-primario/20'
            }`}
          >
            {nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FichaProducto({
  grupos,
  etiquetaGrupo,
  etiquetaOpcion,
  leyenda,
  resumen,
  envio,
  textoCtaPrincipal,
  textoCtaSecundario,
  linkCtaSecundario,
}: Props) {
  const [indiceGrupo, setIndiceGrupo] = useState(0);
  const [indiceOpcion, setIndiceOpcion] = useState(0);

  const grupoActivo = grupos[indiceGrupo];
  const indiceOpcionActiva = Math.min(indiceOpcion, grupoActivo.opciones.length - 1);
  const opcionActiva = grupoActivo.opciones[indiceOpcionActiva];

  useEffect(() => {
    document.getElementById('burbuja-mercadolibre')?.setAttribute('href', opcionActiva.link);
    const precioDeLaBarra = document.getElementById('barra-compra-precio');
    if (precioDeLaBarra) precioDeLaBarra.textContent = opcionActiva.precioTexto;
  }, [opcionActiva.link, opcionActiva.precioTexto]);

  useEffect(() => {
    const posicion = ubicarOpcion(grupos, new URLSearchParams(location.search).get('opcion'));
    if (!posicion) return;
    setIndiceGrupo(posicion.indiceGrupo);
    setIndiceOpcion(posicion.indiceOpcion);
  }, [grupos]);

  function escribirOpcion(indiceDeGrupo: number, indiceDeOpcion: number) {
    const grupo = grupos[indiceDeGrupo];
    const url = new URL(location.href);
    url.searchParams.set('opcion', claveOpcion(grupo.nombre, grupo.opciones[indiceDeOpcion].nombre, grupos.length > 1));
    history.replaceState(history.state, '', url);
  }

  function elegirGrupo(indice: number) {
    const indiceDeOpcion = indiceAlCambiarDeGrupo(grupos[indice].opciones, opcionActiva.nombre);
    setIndiceGrupo(indice);
    setIndiceOpcion(indiceDeOpcion);
    escribirOpcion(indice, indiceDeOpcion);
  }

  function elegirOpcion(indice: number) {
    setIndiceOpcion(indice);
    escribirOpcion(indiceGrupo, indice);
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
      <GalleryLightbox key={`${indiceGrupo}-${indiceOpcionActiva}`} fotos={opcionActiva.fotos} />

      <div className="flex flex-col gap-5">
        {grupos.length > 1 && (
          <Selector
            etiqueta={etiquetaGrupo}
            nombres={grupos.map((grupo) => grupo.nombre)}
            indiceActivo={indiceGrupo}
            onElegir={elegirGrupo}
            segmentado
          />
        )}

        {grupoActivo.opciones.length > 1 && (
          <Selector
            etiqueta={etiquetaOpcion}
            nombres={grupoActivo.opciones.map((opcion) => opcion.nombre)}
            indiceActivo={indiceOpcionActiva}
            onElegir={elegirOpcion}
          />
        )}

        <div aria-live="polite">
          <p className="sr-only">{opcionActiva.nombre}</p>
          <p className="font-titulos text-3xl font-bold text-primario md:text-4xl">{opcionActiva.precioTexto}</p>
          <p className="mt-1 font-texto text-sm text-tinta/70">{leyenda}</p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={opcionActiva.link}
            target="_blank"
            rel="noopener"
            data-cta="ver-en-mercado-libre"
            className="inline-flex items-center justify-center rounded-xl bg-primario px-8 py-3.5 text-center font-texto text-base font-bold text-white shadow-md motion-safe:transition-transform motion-safe:hover:scale-105 hover:bg-primario-oscuro active:translate-y-[2px]"
          >
            {textoCtaPrincipal}
          </a>
          <a
            href={linkCtaSecundario}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center gap-1.5 self-start font-texto font-bold text-acento-oscuro hover:underline"
          >
            {textoCtaSecundario}
            <Icono nombre="flecha-derecha" className="h-4 w-4" />
          </a>
        </div>

        <p
          data-testid="badge-envio"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-destacado/15 px-4 py-1.5 font-texto text-sm font-bold text-tinta"
        >
          <Icono nombre="camion" className="h-4 w-4" />
          {envio}
        </p>

        <p className="font-texto text-base text-tinta/70">{resumen}</p>
      </div>
    </div>
  );
}
