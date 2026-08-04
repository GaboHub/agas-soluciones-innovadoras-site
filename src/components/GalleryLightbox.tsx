import { useEffect, useRef, useState } from 'react';

export interface FotoGaleria {
  thumbSrc: string;
  thumbWidth: number;
  thumbHeight: number;
  fullSrc: string;
  fullWidth: number;
  fullHeight: number;
  alt: string;
}

interface Props {
  fotos: FotoGaleria[];
}

export default function GalleryLightbox({ fotos }: Props) {
  const [indicePrincipal, setIndicePrincipal] = useState(0);
  const [indiceLightbox, setIndiceLightbox] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (indiceLightbox === null) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
  }, [indiceLightbox]);

  const fotoPrincipal = fotos[Math.min(indicePrincipal, fotos.length - 1)];

  function cerrar() {
    setIndiceLightbox(null);
  }

  function siguiente() {
    setIndiceLightbox((actual) => (actual === null ? null : (actual + 1) % fotos.length));
  }

  function anterior() {
    setIndiceLightbox((actual) => (actual === null ? null : (actual - 1 + fotos.length) % fotos.length));
  }

  const fotoAmpliada = indiceLightbox === null ? null : fotos[indiceLightbox];

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setIndiceLightbox(Math.min(indicePrincipal, fotos.length - 1))}
        aria-label={`Ampliar foto: ${fotoPrincipal.alt}`}
        className="aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-lg"
      >
        <img
          src={fotoPrincipal.fullSrc}
          width={fotoPrincipal.fullWidth}
          height={fotoPrincipal.fullHeight}
          alt={fotoPrincipal.alt}
          fetchPriority="high"
          className="h-full w-full object-contain"
        />
      </button>

      {fotos.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {fotos.map((foto, indice) => (
            <button
              key={foto.thumbSrc}
              type="button"
              onClick={() => setIndicePrincipal(indice)}
              aria-label={`Ver como foto principal: ${foto.alt}`}
              aria-pressed={indice === indicePrincipal}
              className={`aspect-square overflow-hidden rounded-xl bg-white transition-shadow ${
                indice === indicePrincipal
                  ? 'ring-2 ring-primario'
                  : 'ring-1 ring-black/5 hover:ring-2 hover:ring-primario/40'
              }`}
            >
              <img
                src={foto.thumbSrc}
                width={foto.thumbWidth}
                height={foto.thumbHeight}
                alt={foto.alt}
                loading="lazy"
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialogRef}
        onClose={cerrar}
        className="max-h-[90vh] max-w-[95vw] rounded-2xl bg-white p-0 backdrop:bg-black/80 md:max-w-3xl"
        aria-label="Foto ampliada"
      >
        {fotoAmpliada && (
          <div className="relative flex flex-col items-center">
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar foto ampliada"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-tinta/70 text-white"
            >
              ✕
            </button>
            <img
              src={fotoAmpliada.fullSrc}
              width={fotoAmpliada.fullWidth}
              height={fotoAmpliada.fullHeight}
              alt={fotoAmpliada.alt}
              className="max-h-[80vh] w-auto rounded-2xl bg-white object-contain"
            />
            <div className="flex w-full items-center justify-between gap-2 p-3">
              <button
                type="button"
                onClick={anterior}
                aria-label="Foto anterior"
                className="rounded-full bg-primario-claro px-4 py-2 font-bold text-tinta"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={siguiente}
                aria-label="Foto siguiente"
                className="rounded-full bg-primario-claro px-4 py-2 font-bold text-tinta"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
