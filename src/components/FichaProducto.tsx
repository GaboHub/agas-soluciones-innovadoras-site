import { useEffect, useId, useState } from 'react';
import GalleryLightbox, { type FotoGaleria } from './GalleryLightbox';

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
  textoCtaSecundario: string;
  linkCtaSecundario: string;
}

const UMBRAL_SELECT = 10;

function Selector({
  etiqueta,
  nombres,
  indiceActivo,
  onElegir,
}: {
  etiqueta: string;
  nombres: string[];
  indiceActivo: number;
  onElegir: (indice: number) => void;
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
          className="mt-2 w-full rounded-xl border-2 border-primario-claro bg-white px-3 py-2.5 font-texto text-sm text-tinta focus:border-primario focus:outline-none"
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
            className={`rounded-full px-4 py-1.5 font-texto text-sm font-bold transition-colors active:translate-y-[2px] ${
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
  }, [opcionActiva.link]);

  function elegirGrupo(indice: number) {
    setIndiceGrupo(indice);
    setIndiceOpcion(0);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 md:items-start">
      <GalleryLightbox key={`${indiceGrupo}-${indiceOpcionActiva}`} fotos={opcionActiva.fotos} />

      <div className="flex flex-col gap-5">
        {grupos.length > 1 && (
          <Selector
            etiqueta={etiquetaGrupo}
            nombres={grupos.map((grupo) => grupo.nombre)}
            indiceActivo={indiceGrupo}
            onElegir={elegirGrupo}
          />
        )}

        {grupoActivo.opciones.length > 1 && (
          <Selector
            etiqueta={etiquetaOpcion}
            nombres={grupoActivo.opciones.map((opcion) => opcion.nombre)}
            indiceActivo={indiceOpcionActiva}
            onElegir={setIndiceOpcion}
          />
        )}

        <div>
          <p className="font-titulos text-3xl font-bold text-primario md:text-4xl">{opcionActiva.precioTexto}</p>
          <p className="mt-1 font-texto text-sm text-tinta/70">{leyenda}</p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={opcionActiva.link}
            target="_blank"
            rel="noopener"
            data-cta="ver-en-mercado-libre"
            className="inline-flex items-center justify-center rounded-xl bg-primario px-8 py-3.5 text-center font-texto text-base font-bold text-white shadow-md transition-transform hover:scale-105 hover:bg-primario-oscuro active:translate-y-[2px]"
          >
            Ver en Mercado Libre
          </a>
          <a
            href={linkCtaSecundario}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center rounded-xl border-2 border-primario px-8 py-3 text-center font-texto text-base font-bold text-primario transition-colors hover:bg-primario-claro active:translate-y-[2px]"
          >
            {textoCtaSecundario}
          </a>
        </div>

        <p
          data-testid="badge-envio"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-destacado/15 px-4 py-1.5 font-texto text-sm font-bold text-tinta"
        >
          <span aria-hidden="true">🚚</span>
          {envio}
        </p>

        <p className="font-texto text-sm text-tinta/70">{resumen}</p>
      </div>
    </div>
  );
}
