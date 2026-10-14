// =======================
// 📂 VARIABLES GLOBALES
// =======================
let categoriaActual = "todos";
let carrito = cargarCarrito();

// Estado compartido
let temporizadorToast = null;      // un solo timer para todos los toasts
let ultimoTotalItems = -1;         // anima el contador solo cuando cambia
let elementoEnfocadoAntes = null;  // devuelve el foco al cerrar el carrito

// =======================
// 🎯 DESTACADOS CON ROTACIÓN AUTOMÁTICA
// =======================
const DESTACADOS_POR_PANTALLA = 4;   // productos visibles en "Destacados"
const PASO_DESTACADOS = 4;           // cuántos cambian en cada rotación
const INTERVALO_DESTACADOS = 6000;   // ms entre un cambio y otro

// Quien pidió menos movimiento arranca con la rotación detenida
const movimientoReducido = typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let indiceDestacados = 0;
let temporizadorDestacados = null;
let busquedaActiva = false;
let interaccionSobreGrid = false;
let rotacionPausadaPorUsuario = movimientoReducido;

// Carga segura: si el localStorage está corrupto o bloqueado,
// el sitio sigue funcionando con un carrito vacío.
function cargarCarrito() {
    try {
        const guardado = JSON.parse(localStorage.getItem("carrito"));
        return Array.isArray(guardado) ? guardado : [];
    } catch (e) {
        return [];
    }
}

// =======================
// ⌨️ CAMPO NOMBRE: SOLO LETRAS
// =======================
// Bloquea números y símbolos mientras se escribe o se pega texto.
// Permite letras con acentos (á, é, í, ó, ú, ñ), espacios,
// apóstrofes, guiones y puntos para nombres como "María José" o "Juan C. Pérez".
function soloLetras(input) {
    const valor = input.value;
    const limpio = valor
        .replace(/[^A-Za-zÁÉÍÓÚÜáéíóúüñÑ'’.\- ]/g, "")  // quita números y símbolos
        .replace(/ {2,}/g, " ");                          // evita espacios dobles

    if (limpio !== valor) {
        const pos = Math.min(input.selectionStart, limpio.length);
        input.value = limpio;
        input.setSelectionRange(pos, pos);                // el cursor no salta al final
    }
}

// =======================
// ✍️ EVENTOS DE LOS CAMPOS DEL PEDIDO
// =======================
// Valida mientras se escribe y guarda el dato para no perderlo
// si el usuario recarga la página.
function alEscribirNombre(input) {
    soloLetras(input);
    guardarDatosPedido();
    if (input.value.trim()) mostrarErrorCampo(input, "");
}

function alCambiarHorario(select) {
    guardarDatosPedido();
    if (select.value) mostrarErrorCampo(select, "");
}

// Muestra u oculta el mensaje de error debajo del campo
function mostrarErrorCampo(campo, mensaje) {
    if (!campo) return;

    const error = document.getElementById(campo.getAttribute("aria-describedby"));

    campo.classList.toggle("campo-invalido", Boolean(mensaje));
    campo.setAttribute("aria-invalid", mensaje ? "true" : "false");

    if (error) error.textContent = mensaje;
}

// =======================
// 💾 NOMBRE Y HORARIO PERSISTENTES
// =======================
function guardarDatosPedido() {
    try {
        const nombre = document.getElementById("nombreCliente");
        const horario = document.getElementById("horario");

        if (nombre) localStorage.setItem("pedidoNombre", nombre.value);
        if (horario) localStorage.setItem("pedidoHorario", horario.value);
    } catch (e) {
        // Almacenamiento bloqueado: el pedido sigue funcionando
    }
}

function restaurarDatosPedido() {
    try {
        const nombre = document.getElementById("nombreCliente");
        const horario = document.getElementById("horario");

        const nombreGuardado = localStorage.getItem("pedidoNombre");
        const horarioGuardado = localStorage.getItem("pedidoHorario");

        if (nombre && nombreGuardado) nombre.value = nombreGuardado;

        // Solo se restaura si la opción sigue existiendo
        if (horario && horarioGuardado &&
            Array.from(horario.options).some(op => op.value === horarioGuardado)) {
            horario.value = horarioGuardado;
        }
    } catch (e) {
        // Ignorado a propósito
    }
}

// =======================
// 🏷️ CATEGORÍAS
// =======================
// Configuración del sitio, no es contenido. Las claves de la
// izquierda son las que admite el campo "categoria" de
// js/productos.json.
//  ⚠️ Si agregas una categoría aquí, agrégala también en
//     admin/config.yml (campo "Categoría") para que aparezca
//     como opción en el panel de administración.
const CATEGORIAS = {
    frutas:       { titulo: "Frutas y Verduras",  carpeta: "frutasyverduras" },
    carniceria:   { titulo: "Carnicería",         carpeta: "carniceria" },
    lacteos:      { titulo: "Lácteos",            carpeta: "lacteos" },
    bebidas:      { titulo: "Bebidas",            carpeta: "bebidas" },
    agua:         { titulo: "Agua y Gas",         carpeta: "aguaygas" },
    abarrotes:    { titulo: "Abarrotes",          carpeta: "abarrotes" },
    pan:          { titulo: "Tortillas",          carpeta: "pan" },
    snacks:       { titulo: "Snacks y Dulces",    carpeta: "snacks" },
    higiene:      { titulo: "Higiene y Limpieza", carpeta: "higiene" },
    medicamentos: { titulo: "Medicamentos",       carpeta: "medicamentos" }
};

// =======================
// 🏷️ NOMBRES DE CATEGORÍAS (con acentos correctos)
// =======================
// "todos" y "promos" son vistas especiales; el resto de los títulos
// vienen de CATEGORIAS, justo arriba.
function construirTitulosCategoria() {
    const titulos = {
        todos:  "Destacados",
        promos: "Promociones"
    };

    if (typeof CATEGORIAS === "object" && CATEGORIAS) {
        Object.keys(CATEGORIAS).forEach(clave => {
            titulos[clave] = CATEGORIAS[clave].titulo || clave;
        });
    }

    return titulos;
}

const TITULOS_CATEGORIA = construirTitulosCategoria();

function escaparHTML(texto) {
    return String(texto).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

// =======================
// 🧱 CONSTRUIR LA PÁGINA DESDE EL CATÁLOGO
// =======================
// Todo el contenido visible (carrusel y cuadrícula) se genera aquí
// a partir del arreglo leído de js/productos.json.

// El panel guarda rutas completas como "img/carniceria/foto.jpg".
// También se admite solo el nombre del archivo, en cuyo caso se
// busca en la carpeta de su categoría.
function rutaImagen(producto) {
    if (!producto.imagen) return "";

    // El panel a veces escribe la ruta con barra inicial ("/img/foto.jpg").
    // Esa barra la convierte en una ruta absoluta del dominio y rompe la
    // página si vive en una subcarpeta (usuario.github.io/tu-repo/).
    // Se la quitamos siempre: así funciona igual en cualquier sitio.
    const ruta = String(producto.imagen).replace(/^\/+/, "");

    if (ruta.includes("/")) return ruta;

    const categoria = CATEGORIAS[producto.categoria];
    const carpeta = categoria && categoria.carpeta;
    return carpeta ? `img/${carpeta}/${ruta}` : ruta;
}

// "$179.50 kg"  ·  "$25"
function textoPrecio(producto, conUnidadPequena = false) {
    const precio = Number(producto.precio) || 0;
    const base = `$${precio.toFixed(2)}`;

    if (!producto.unidad) return base;

    return conUnidadPequena
        ? `${base} <small>${escaparHTML(producto.unidad)}</small>`
        : `${base} ${escaparHTML(producto.unidad)}`;
}

function crearTarjeta(producto) {
    const clases = ["card", producto.categoria];
    if (producto.promo) clases.push("promos");
    if (producto.destacado !== false) clases.push("inicio");

    const tarjeta = document.createElement("div");
    tarjeta.className = clases.join(" ");
    tarjeta.innerHTML = `
        <button type="button" onclick="agregarCarrito(this)">Agregar</button>
        <img src="${escaparHTML(rutaImagen(producto))}"
             alt="${escaparHTML(producto.nombre)}" loading="lazy">
        <div class="card-content">
            <h3>${escaparHTML(producto.nombre)}</h3>
            <p class="price">${textoPrecio(producto)}</p>
            ${producto.promo ? '<span class="tag">Promo</span>' : ""}
        </div>
    `;
    return tarjeta;
}

function crearDiapositiva(producto) {
    const categoria = CATEGORIAS[producto.categoria];

    // En el carrusel, los de promoción llevan la etiqueta roja y
    // los demás la gris con el nombre de su categoría.
    const etiqueta = producto.promo
        ? '<span class="tag">Promo</span>'
        : `<span class="cat-tag">${escaparHTML(categoria ? categoria.titulo : "")}</span>`;

    const diapositiva = document.createElement("div");
    diapositiva.className = "slide promo-slide";
    diapositiva.innerHTML = `
        <img src="${escaparHTML(rutaImagen(producto))}"
             alt="${escaparHTML(producto.nombre)}">
        <div class="card-content">
            ${etiqueta}
            <h3>${escaparHTML(producto.nombre)}</h3>
            <p class="price">${textoPrecio(producto, true)}</p>
            <button type="button" onclick="agregarCarrito(this)">Agregar al carrito</button>
        </div>
    `;
    return diapositiva;
}

// Lee el catálogo desde js/productos.json, el archivo que escribe
// el panel de administración (admin/).
// cache: "no-cache" obliga al navegador a revalidar contra el
// servidor, así un cambio publicado se ve de inmediato y no hay
// que esperar a que venza la caché.
async function cargarCatalogo() {
    try {
        const respuesta = await fetch("js/productos.json", { cache: "no-cache" });
        if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);

        const datos = await respuesta.json();
        return Array.isArray(datos) ? datos : [];
    } catch (error) {
        console.error("No se pudo leer js/productos.json:", error);
        return null;   // null = error, distinto de "lista vacía"
    }
}

function mensajeErrorCatalogo() {
    // Abrir index.html con doble clic usa el protocolo file:// y ahí
    // el navegador bloquea fetch() por seguridad (CORS).
    if (window.location.protocol === "file:") {
        return "No se pudo leer el catálogo porque la página está abierta con <strong>doble clic</strong>. " +
               "En ese modo el navegador bloquea la lectura de <strong>js/productos.json</strong>.<br><br>" +
               "Doble clic en <strong>VER-LOCAL.bat</strong> y abre <strong>http://localhost:8000</strong>.";
    }

    return "No se pudo leer el catálogo.<br>" +
           "Revisa que exista <strong>js/productos.json</strong> y que su contenido sea JSON válido.";
}

async function renderizarCatalogo() {
    const grid = document.getElementById("products-grid");
    const track = document.getElementById("carousel-track");

    const catalogo = await cargarCatalogo();

    if (catalogo === null) {
        if (grid) {
            grid.innerHTML =
                `<p class="sin-resultados aviso-catalogo">${mensajeErrorCatalogo()}</p>`;
        }
        return;
    }

    const productos = catalogo.filter(p => p && p.nombre && p.categoria);

    if (grid) {
        grid.innerHTML = "";
        productos.forEach(producto => grid.appendChild(crearTarjeta(producto)));
    }

    if (track) {
        track.innerHTML = "";
        productos
            .filter(producto => producto.carrusel)
            .forEach(producto => track.appendChild(crearDiapositiva(producto)));
    }
}

// =======================
// 🔎 BUSCADOR
// =======================
function buscar() {
    const campo = document.getElementById("busqueda");
    const texto = campo.value.toLowerCase().trim();

    // Muestra u oculta el botón de borrar
    const btnBorrar = document.getElementById("search-clear");
    if (btnBorrar) btnBorrar.style.display = campo.value ? "block" : "none";

    filtrar(categoriaActual, texto);
}

function limpiarBusqueda() {
    const campo = document.getElementById("busqueda");
    if (campo) campo.value = "";
    buscar();
    if (campo) campo.focus();
}

// =======================
// 📂 FILTRAR PRODUCTOS
// =======================
function filtrar(categoria, textoBusqueda = "") {
    categoriaActual = categoria;
    busquedaActiva = textoBusqueda !== "";

    const hayBusqueda = busquedaActiva;
    let visibles = 0;

    // En "Destacados" solo se muestran DESTACADOS_POR_PANTALLA productos.
    // En las demás categorías (o con búsqueda) se muestra todo lo que coincida.
    const soloDestacados = categoria === "todos" && !hayBusqueda;
    const grupo = soloDestacados ? grupoDestacadosActual() : [];

    // Solo las tarjetas del catálogo: las del carrusel no se filtran
    document.querySelectorAll("#products-grid .card").forEach(card => {
        const textoCard = (card.innerText || card.textContent || "").toLowerCase();

        // Al escribir en el buscador se revisan TODOS los productos,
        // no solo los de la categoría activa.
        let coincideCategoria;
        if (soloDestacados) {
            coincideCategoria = grupo.includes(card);
        } else if (hayBusqueda) {
            coincideCategoria = true;
        } else if (categoria === "promos") {
            coincideCategoria = card.classList.contains("promos");
        } else {
            coincideCategoria = card.classList.contains(categoria);
        }

        const coincideBusqueda = !hayBusqueda || textoCard.includes(textoBusqueda);
        const seMuestra = coincideCategoria && coincideBusqueda;

        card.style.display = seMuestra ? "flex" : "none";
        if (seMuestra) visibles++;
    });

    actualizarTitulo(categoria, textoBusqueda, visibles);
    mostrarAvisoVacio(visibles, textoBusqueda);
    sincronizarRotacion();   // también refresca botón, animación e info
}

// =======================
// 🔄 ROTACIÓN DE DESTACADOS
// =======================
// Todas las tarjetas elegibles para "Destacados"
function tarjetasDestacadas() {
    return Array.from(document.querySelectorAll("#products-grid .card"))
        .filter(card => card.classList.contains("inicio") || card.classList.contains("promos"));
}

// Ventana deslizante de DESTACADOS_POR_PANTALLA productos.
// Al llegar al final del catálogo vuelve a empezar, por eso
// siempre hay exactamente 4 tarjetas visibles.
function grupoDestacadosActual() {
    const todas = tarjetasDestacadas();
    const total = todas.length;

    if (total === 0) return [];
    if (total <= DESTACADOS_POR_PANTALLA) return todas;

    const inicio = indiceDestacados % total;
    const grupo = [];
    for (let i = 0; i < DESTACADOS_POR_PANTALLA; i++) {
        grupo.push(todas[(inicio + i) % total]);
    }
    return grupo;
}

function debeRotar() {
    if (rotacionPausadaPorUsuario) return false;
    if (categoriaActual !== "todos" || busquedaActiva) return false;
    if (document.hidden) return false;              // pestaña en segundo plano
    if (interaccionSobreGrid) return false;         // leyendo o a punto de hacer clic
    return tarjetasDestacadas().length > DESTACADOS_POR_PANTALLA;
}

// Arranca o detiene el temporizador según el estado actual
function sincronizarRotacion() {
    if (temporizadorDestacados) {
        clearInterval(temporizadorDestacados);
        temporizadorDestacados = null;
    }

    const rotar = debeRotar();

    if (rotar) {
        temporizadorDestacados = setInterval(rotarDestacados, INTERVALO_DESTACADOS);
    }

    // La clase activa la animación de entrada. Se mantiene aunque la
    // rotación esté pausada, para que pausar (o pasar el ratón por la
    // cuadrícula) no vuelva a animar tarjetas que ya están a la vista.
    const enDestacados = categoriaActual === "todos" && !busquedaActiva;
    const grid = document.getElementById("products-grid");
    if (grid) grid.classList.toggle("rotando", enDestacados);

    const boton = document.getElementById("btn-rotar");
    if (boton) {
        boton.hidden = !(categoriaActual === "todos" && !busquedaActiva &&
                         tarjetasDestacadas().length > DESTACADOS_POR_PANTALLA);
    }

    actualizarInfoDestacados();
}

function rotarDestacados() {
    if (!debeRotar()) return;

    const total = tarjetasDestacadas().length;
    if (total === 0) return;

    indiceDestacados = (indiceDestacados + PASO_DESTACADOS) % total;
    filtrar("todos");
}

// Botón ⏸ Pausar / ▶ Reanudar
function alternarRotacion() {
    rotacionPausadaPorUsuario = !rotacionPausadaPorUsuario;
    actualizarBotonRotacion();
    sincronizarRotacion();   // también refresca la línea informativa
}

function actualizarBotonRotacion() {
    const boton = document.getElementById("btn-rotar");
    if (!boton) return;

    const pausado = rotacionPausadaPorUsuario;
    boton.textContent = pausado ? "▶ Reanudar" : "⏸ Pausar";
    boton.title = pausado
        ? "Volver a cambiar los destacados automáticamente"
        : "Detener el cambio automático de destacados";
}

// Línea informativa bajo el título: "Mostrando 4 de 11 productos"
function actualizarInfoDestacados() {
    const info = document.getElementById("rotar-info");
    if (!info) return;

    const enDestacados = categoriaActual === "todos" && !busquedaActiva;
    if (!enDestacados) {
        info.textContent = "";
        return;
    }

    const total = tarjetasDestacadas().length;
    const visibles = Math.min(total, DESTACADOS_POR_PANTALLA);

    info.textContent = `Mostrando ${visibles} de ${total} productos` +
        (debeRotar() ? " · cambia automáticamente" : "");
}

// La rotación se detiene mientras se pasa el mouse o el foco por la
// cuadrícula (para poder leer y pulsar "Agregar") y al ocultar la pestaña.
function configurarPausaDestacados() {
    const grid = document.getElementById("products-grid");
    if (grid) {
        const pausar = () => { interaccionSobreGrid = true; sincronizarRotacion(); };
        const reanudar = () => { interaccionSobreGrid = false; sincronizarRotacion(); };

        grid.addEventListener("mouseenter", pausar);
        grid.addEventListener("mouseleave", reanudar);
        grid.addEventListener("focusin", pausar);
        grid.addEventListener("focusout", reanudar);
    }

    document.addEventListener("visibilitychange", sincronizarRotacion);
}

// Título según la categoría o la búsqueda activa
function actualizarTitulo(categoria, textoBusqueda, visibles) {
    const titulo = document.getElementById("section-title");
    if (!titulo) return;

    if (textoBusqueda) {
        titulo.textContent = `Resultados para "${textoBusqueda}" (${visibles})`;
    } else {
        titulo.textContent = TITULOS_CATEGORIA[categoria] || categoria;
    }
}

// Mensaje cuando no hay coincidencias
function mostrarAvisoVacio(visibles, textoBusqueda) {
    const aviso = document.getElementById("sin-resultados");
    if (!aviso) return;

    if (visibles > 0) {
        aviso.style.display = "none";
        aviso.innerHTML = "";
        return;
    }

    aviso.style.display = "block";
    aviso.innerHTML = textoBusqueda
        ? `No encontramos productos para "<strong>${escaparHTML(textoBusqueda)}</strong>"<br>
           <button type="button" onclick="limpiarBusqueda()">Ver todos los productos</button>`
        : `No hay productos disponibles en esta categoría por el momento.<br>
           <button type="button" onclick="filtrar('todos')">Ver Destacados</button>`;
}

// =======================
// 🚀 INICIALIZACIÓN
// =======================
document.addEventListener("DOMContentLoaded", async () => {
    await renderizarCatalogo();   // primero: crea las tarjetas y las diapositivas
    actualizarBotonRotacion();
    configurarPausaDestacados();
    filtrar("todos");
    actualizarCarrito();
    iniciarCarrusel();
    restaurarDatosPedido();

    // Mostrar sugerencia si hay productos guardados al refrescar
    if (carrito.length > 0) {
        mostrarSugerenciaCarrito();
    }

    // Configurar menú de categorías
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Cambiar de categoría borra la búsqueda anterior
            const campo = document.getElementById("busqueda");
            if (campo && campo.value) {
                campo.value = "";
                const btnBorrar = document.getElementById("search-clear");
                if (btnBorrar) btnBorrar.style.display = "none";
            }

            filtrar(item.getAttribute('data-categoria'));
        });
    });

    // Escape cierra el carrito y Tab queda atrapado dentro de él
    document.addEventListener('keydown', manejarTecladoCarrito);
});

// =======================
// SUGERENCIA AL REFRESCAR LA PÁGINA
// =======================
function mostrarSugerenciaCarrito() {
    const toast = prepararToast();
    if (!toast) return;

    toast.innerHTML = `
        Tienes ${carrito.length} producto(s) en tu carrito<br><br>
        <button type="button" onclick="seguirConPedido()">Seguir con mi pedido</button>
        <button type="button" class="toast-peligro"
                onclick="vaciarCarritoDesdeSugerencia()">Vaciar carrito</button>
    `;
    toast.classList.add("show");
    temporizadorToast = setTimeout(ocultarToast, 12000);
}

function seguirConPedido() {
    ocultarToast();
    toggleCarrito();
}

function vaciarCarritoDesdeSugerencia() {
    ocultarToast();
    vaciarCarrito();
}

// =======================
// 🖼️ CARRUSEL DE PROMOCIONES
// =======================
let indiceActual = 0;
let totalSlides = 0;
let temporizadorCarrusel = null;
const INTERVALO_CARRUSEL = 4000;

function iniciarCarrusel() {
    const track = document.getElementById("carousel-track");
    if (!track) return;

    totalSlides = track.children.length;
    if (totalSlides === 0) return;

    // Crea un punto por diapositiva
    const dots = document.getElementById("carousel-dots");
    if (dots) {
        dots.innerHTML = "";
        for (let i = 0; i < totalSlides; i++) {
            const punto = document.createElement("button");
            punto.type = "button";
            punto.className = "carousel-dot" + (i === 0 ? " activo" : "");
            punto.setAttribute("aria-label", "Ir a la imagen " + (i + 1));
            punto.addEventListener("click", () => {
                irACarrusel(i);
                reiniciarCarrusel();
            });
            dots.appendChild(punto);
        }
    }

    irACarrusel(0);
    arrancarCarrusel();
    configurarPausaCarrusel();
}

function irACarrusel(indice) {
    const track = document.getElementById("carousel-track");
    if (!track || totalSlides === 0) return;

    indiceActual = ((indice % totalSlides) + totalSlides) % totalSlides;
    track.style.transform = `translateX(-${indiceActual * 100}%)`;

    document.querySelectorAll(".carousel-dot").forEach((punto, i) => {
        punto.classList.toggle("activo", i === indiceActual);
    });
}

function moverCarrusel(paso) {
    irACarrusel(indiceActual + paso);
    reiniciarCarrusel();
}

function arrancarCarrusel() {
    clearInterval(temporizadorCarrusel);
    temporizadorCarrusel = setInterval(() => irACarrusel(indiceActual + 1), INTERVALO_CARRUSEL);
}

function pausarCarrusel() {
    clearInterval(temporizadorCarrusel);
}

function reiniciarCarrusel() {
    arrancarCarrusel();
}

// Se detiene al pasar el mouse o al enfocar un control,
// para que se pueda leer la promo y pulsar los botones.
function configurarPausaCarrusel() {
    const carousel = document.getElementById("carousel");
    if (!carousel) return;

    carousel.addEventListener("mouseenter", () => clearInterval(temporizadorCarrusel));
    carousel.addEventListener("mouseleave", arrancarCarrusel);
    carousel.addEventListener("focusin", () => clearInterval(temporizadorCarrusel));
    carousel.addEventListener("focusout", arrancarCarrusel);

    // Deslizar con el dedo en móvil
    let inicioX = null;
    carousel.addEventListener("touchstart", e => {
        inicioX = e.touches[0].clientX;
        clearInterval(temporizadorCarrusel);
    }, { passive: true });

    carousel.addEventListener("touchend", e => {
        if (inicioX === null) return;
        const delta = e.changedTouches[0].clientX - inicioX;
        if (Math.abs(delta) > 45) moverCarrusel(delta < 0 ? 1 : -1);
        else arrancarCarrusel();
        inicioX = null;
    }, { passive: true });
}

// =======================
// 🛒 ABRIR / CERRAR CARRITO
// =======================
// Guarda la posición de scroll para volver a ella al cerrar,
// evitando que el fondo se desplace con el carrito encima.
let posicionScroll = 0;

function bloquearScroll() {
    posicionScroll = window.scrollY || document.documentElement.scrollTop || 0;

    // Evita el salto horizontal al desaparecer la barra de scroll (solo PC)
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = anchoBarra > 0 ? `${anchoBarra}px` : "";

    document.body.style.top = `-${posicionScroll}px`;
    document.body.classList.add("carrito-abierto");
}

function desbloquearScroll() {
    document.body.classList.remove("carrito-abierto");
    document.body.style.top = "";
    document.body.style.paddingRight = "";
    window.scrollTo(0, posicionScroll);
}

function toggleCarrito() {
    const carritoEl = document.getElementById("carrito");
    const overlay = document.getElementById("overlay");
    if (!carritoEl || !overlay) return;

    const abriendo = !carritoEl.classList.contains("activo");

    carritoEl.classList.toggle("activo", abriendo);
    overlay.classList.toggle("activo", abriendo);

    if (abriendo) {
        elementoEnfocadoAntes = document.activeElement;
        carritoEl.removeAttribute("inert");   // fuera del modo "inaccesible"
        bloquearScroll();

        // Espera a que arranque la animación antes de mover el foco
        setTimeout(() => {
            const primerFoco = carritoEl.querySelector(".close-btn");
            if (primerFoco) primerFoco.focus();
        }, 150);
    } else {
        carritoEl.setAttribute("inert", "");
        desbloquearScroll();

        // Devuelve el foco al elemento que lo tenía antes de abrir
        if (elementoEnfocadoAntes && typeof elementoEnfocadoAntes.focus === "function") {
            elementoEnfocadoAntes.focus();
        }
        elementoEnfocadoAntes = null;
    }
}

function cerrarCarrito() {
    const carritoEl = document.getElementById("carrito");
    if (carritoEl && carritoEl.classList.contains("activo")) {
        toggleCarrito();
    }
}

// =======================
// ⌨️ TECLADO DENTRO DEL CARRITO
// =======================
function obtenerFocuseables(contenedor) {
    return Array.from(contenedor.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), ' +
        'select:not([disabled]), textarea:not([disabled]), ' +
        '[tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);
}

// Escape cierra; Tab no puede salir del carrito mientras esté abierto.
function manejarTecladoCarrito(e) {
    const carritoEl = document.getElementById("carrito");
    if (!carritoEl || !carritoEl.classList.contains("activo")) return;

    if (e.key === "Escape") {
        cerrarCarrito();
        return;
    }
    if (e.key !== "Tab") return;

    const foco = obtenerFocuseables(carritoEl);
    if (foco.length === 0) return;

    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    const actual = document.activeElement;

    if (!carritoEl.contains(actual)) {
        e.preventDefault();
        (e.shiftKey ? ultimo : primero).focus();
    } else if (e.shiftKey && actual === primero) {
        e.preventDefault();
        ultimo.focus();
    } else if (!e.shiftKey && actual === ultimo) {
        e.preventDefault();
        primero.focus();
    }
}

// =======================
// 🛒 AGREGAR AL CARRITO
// =======================
function agregarCarrito(boton) {
    // Funciona con tarjetas del catálogo y con las del carrusel
    const card = boton.closest(".card, .promo-slide");
    if (!card) return;

    const nombre = card.querySelector("h3").innerText.trim();
    const precioTexto = card.querySelector(".price").innerText;
    const precio = parseFloat(precioTexto.replace(/[^\d.]/g, "")) || 0;

    const existente = carrito.find(p => p.nombre === nombre);

    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({ nombre, precio, cantidad: 1 });
    }

    guardarCarrito();
    mostrarToast("Producto agregado ✓");
    actualizarCarrito();
    feedbackAgregado(boton);
}

// El botón confirma visualmente que el producto entró al carrito
function feedbackAgregado(boton) {
    if (!boton || boton.dataset.animando === "1") return;

    const textoOriginal = boton.textContent;
    boton.dataset.animando = "1";
    boton.textContent = "✓ Añadido";
    boton.classList.add("agregado");

    setTimeout(() => {
        boton.textContent = textoOriginal;
        boton.classList.remove("agregado");
        delete boton.dataset.animando;
    }, 1000);
}

// =======================
// 🔄 ACTUALIZAR CARRITO
// =======================
function actualizarCarrito() {
    const lista = document.getElementById("lista-carrito");
    if (!lista) return;

    lista.innerHTML = "";

    let total = 0;
    let totalItems = 0;

    carrito.forEach((item, index) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        totalItems += item.cantidad;

        const li = document.createElement("li");
        li.innerHTML = `
            <div class="item-carrito">
                <strong>${escaparHTML(item.nombre)}</strong><br>
                <span>$${item.precio.toFixed(2)} × ${item.cantidad}</span>
                <div class="cantidad-btns">
                    <button onclick="cambiarCantidad(${index}, -1)">–</button>
                    <span>${item.cantidad}</span>
                    <button onclick="cambiarCantidad(${index}, 1)">+</button>
                </div>
            </div>
        `;
        lista.appendChild(li);
    });

    document.getElementById("total").textContent = `Total: $${total.toFixed(2)}`;

    const contadores = document.querySelectorAll(
        "#contador, #contador-header, #contador-flotante"
    );
    contadores.forEach(el => {
        if (el) el.textContent = totalItems;
    });

    // Rebota solo cuando la cantidad cambia (no en la carga inicial)
    if (ultimoTotalItems !== -1 && totalItems !== ultimoTotalItems) {
        contadores.forEach(el => {
            if (!el) return;
            el.classList.remove("contador-bounce");
            void el.offsetWidth;   // fuerza el reinicio de la animación CSS
            el.classList.add("contador-bounce");
        });
    }
    ultimoTotalItems = totalItems;
}

// =======================
// ➕➖ CAMBIAR CANTIDAD
// =======================
function cambiarCantidad(index, cambio) {
    if (!carrito[index]) return;
    carrito[index].cantidad += cambio;
    if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
    guardarCarrito();
    actualizarCarrito();
}

// =======================
// 🧹 VACIAR CARRITO
// =======================
function vaciarCarrito() {
    if (carrito.length === 0) {
        mostrarToast("Tu carrito ya está vacío");
        return;
    }

    const respaldo = carrito.slice();   // copia para poder deshacer
    carrito = [];
    guardarCarrito();
    actualizarCarrito();

    mostrarToastAccion("Carrito vaciado.", "Deshacer", () => {
        carrito = respaldo;
        guardarCarrito();
        actualizarCarrito();
        mostrarToast("Pedido restaurado ✓");
    });
}

// =======================
// 💾 GUARDAR EN LOCALSTORAGE
// =======================
function guardarCarrito() {
    try {
        localStorage.setItem("carrito", JSON.stringify(carrito));
    } catch (e) {
        // Privado / lleno: el carrito sigue vivo en memoria
    }
}

// =======================
// 📲 ENVIAR PEDIDO POR WHATSAPP
// =======================
// ⚠️ NÚMERO DE WHATSAPP DE LA TIENDA (para recibir los pedidos).
//     Formato: 52 (México) + lada + número, SOLO dígitos.
//     Ejemplo: "526461234567"
//     Ahora mismo está en CEROS (marcador provisional): WhatsApp
//     marcará "número inválido" hasta que pongas el número real.
const NUMERO_WHATSAPP = "000000000000";

function enviarPedido() {
    const nombreCampo = document.getElementById("nombreCliente");
    const selectHorario = document.getElementById("horario");

    if (carrito.length === 0) {
        mostrarToast("Tu carrito está vacío");
        return;
    }

    // Validación en pantalla: borde rojo + mensaje bajo cada campo
    const nombreCliente = nombreCampo.value.trim();
    let errores = 0;

    if (!/[A-Za-zÁÉÍÓÚÜáéíóúüñÑ]/.test(nombreCliente)) {
        mostrarErrorCampo(nombreCampo, "Escribe tu nombre usando solo letras");
        errores++;
    } else {
        mostrarErrorCampo(nombreCampo, "");
    }

    if (!selectHorario.value) {
        mostrarErrorCampo(selectHorario, "Elige un horario de recolección");
        errores++;
    } else {
        mostrarErrorCampo(selectHorario, "");
    }

    if (errores > 0) {
        const primerCampo = document.querySelector("#carrito .campo-invalido");
        if (primerCampo) primerCampo.focus();
        return;
    }

    // Se usa el TEXTO visible de la opción ("Hoy por la tarde"),
    // no el value interno ("tarde").
    const horario = selectHorario.options[selectHorario.selectedIndex].text;

    let mensaje = "🛒 *Nuevo Pedido - Frutería La Pasadita*\n\n";
    mensaje += `👤 *Nombre:* ${nombreCliente}\n`;
    mensaje += `⏰ *Recolección:* ${horario}\n\n*Productos:*\n`;

    let total = 0;
    let totalItems = 0;
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        mensaje += `• ${item.nombre} x${item.cantidad} = $${subtotal.toFixed(2)}\n`;
        total += subtotal;
        totalItems += item.cantidad;
    });

    mensaje += `\n📦 *Artículos:* ${totalItems}\n`;
    mensaje += `💰 *Total a pagar al recoger:* $${total.toFixed(2)}\n\n`;
    mensaje += "✅ Confirma tu pedido por favor 🙌";

    // encodeURIComponent evita que nombres con &, # o ñ rompan la URL
    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
}

// =======================
// 🔔 TOAST
// =======================
// Un único temporizador evita que un toast largo oculte antes de tiempo
// a otro que aparezca después.
function cancelarOcultarToast() {
    if (temporizadorToast) {
        clearTimeout(temporizadorToast);
        temporizadorToast = null;
    }
}

function ocultarToast() {
    const toast = document.getElementById("toast");
    if (toast) toast.classList.remove("show");
    cancelarOcultarToast();
}

// Limpia el contenido y deja listo el elemento (los estilos vienen del CSS)
function prepararToast() {
    const toast = document.getElementById("toast");
    cancelarOcultarToast();
    if (!toast) return null;
    toast.innerHTML = "";
    return toast;
}

function mostrarToast(mensaje = "Producto agregado ✓", duracion = 2000) {
    const toast = prepararToast();
    if (!toast) return;

    toast.textContent = mensaje;
    toast.classList.add("show");
    temporizadorToast = setTimeout(ocultarToast, duracion);
}

// Toast con un botón de acción (por ejemplo "Deshacer")
function mostrarToastAccion(mensaje, textoAccion, alPulsarAccion) {
    const toast = prepararToast();
    if (!toast) return;

    toast.append(document.createTextNode(mensaje + " "));

    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = textoAccion;
    boton.addEventListener("click", () => {
        ocultarToast();
        alPulsarAccion();
    });
    toast.appendChild(boton);

    toast.classList.add("show");
    temporizadorToast = setTimeout(ocultarToast, 7000);
}