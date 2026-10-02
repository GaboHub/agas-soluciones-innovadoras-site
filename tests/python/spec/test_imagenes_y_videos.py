import pytest

from arnes_barrido import Respuesta, fila_listing

pytestmark = [pytest.mark.spec("barrido", "Imágenes y videos")]

URL = "https://img.test/p1.jpg"
CARPETA = "publicaciones/MLA1-titulo-mla1"


def con_imagen(esc, **item):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder(
        "/items/MLA1",
        Respuesta(200, {"id": "MLA1", "pictures": [{"id": "P1", "secure_url": URL}], **item}),
    )
    esc.responder(URL, Respuesta(200))


def imagen(esc):
    return esc.salida / CARPETA / "imagenes" / "01-P1.jpg"


def previa(esc, contenido="previa"):
    imagen(esc).parent.mkdir(parents=True)
    imagen(esc).write_text(contenido, encoding="utf-8")


def test_imagen_existente(esc, capsys):
    con_imagen(esc)
    previa(esc)

    esc.correr(imagenes=True)

    assert URL not in esc.rutas_pedidas()
    assert imagen(esc).read_text(encoding="utf-8") == "previa"
    resumen = capsys.readouterr().out
    assert "Imágenes saltadas (ya existían): 1" in resumen
    assert "Imágenes descargadas: 0" in resumen


def test_imagen_nueva_se_descarga_con_reemplazo_atomico(esc, capsys, monkeypatch):
    con_imagen(esc)
    reemplazos = []
    original = type(imagen(esc)).replace

    def espiar(origen, destino):
        reemplazos.append((origen.name, destino.name))
        return original(origen, destino)

    monkeypatch.setattr(type(imagen(esc)), "replace", espiar)

    esc.correr(imagenes=True)

    assert imagen(esc).read_bytes() == b"x"
    assert len(reemplazos) == 1
    temporal, destino = reemplazos[0]
    assert destino == "01-P1.jpg" and temporal.startswith("01-P1.jpg.") and temporal.endswith(".tmp")
    assert [p.name for p in imagen(esc).parent.iterdir()] == ["01-P1.jpg"]
    assert "Imágenes descargadas: 1" in capsys.readouterr().out


def test_force_images_vuelve_a_descargar(esc, capsys):
    con_imagen(esc)
    previa(esc)

    esc.correr("--force-images", imagenes=True)

    assert URL in esc.rutas_pedidas()
    assert imagen(esc).read_bytes() == b"x"
    assert "Imágenes descargadas: 1" in capsys.readouterr().out


def test_skip_images_no_descarga_ninguna(esc, capsys):
    con_imagen(esc)

    esc.correr()

    assert URL not in esc.rutas_pedidas()
    assert not imagen(esc).exists()
    resumen = capsys.readouterr().out
    assert "Imágenes descargadas: 0" in resumen and "Imágenes saltadas (ya existían): 0" in resumen


def test_flags_excluyentes(esc):
    con_imagen(esc)

    with pytest.raises(SystemExit) as salida:
        esc.correr("--force-images")

    assert "mutually exclusive" in str(salida.value)


def test_video_se_exporta_como_referencia(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder("/items/MLA1", Respuesta(200, {"id": "MLA1", "video_id": "VID123"}))

    esc.correr()

    assert "### Videos\n\n- Referencia externa (video_id): VID123\n" in esc.publicacion("MLA1-titulo-mla1")
    resumen = capsys.readouterr().out
    assert "Videos encontrados: 1" in resumen
    assert "Videos exportados como referencia: 1" in resumen


def test_skip_videos_no_exporta_la_referencia(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder("/items/MLA1", Respuesta(200, {"id": "MLA1", "video_id": "VID123"}))

    esc.correr("--skip-videos")

    assert "### Videos\n\n_Sin videos._" in esc.publicacion("MLA1-titulo-mla1")
    resumen = capsys.readouterr().out
    assert "Videos encontrados: 1" in resumen
    assert "Videos exportados como referencia: 0" in resumen
