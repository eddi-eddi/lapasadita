// ============================================================
//  🖥️ SERVIDOR LOCAL — Frutería La Pasadita
// ============================================================
//  No es parte de la página. Solo sirve para ver el sitio en tu
//  computadora antes de publicarlo en GitHub.
//
//  ¿Por qué hace falta?
//  El catálogo (js/productos.json) se lee con fetch(). El
//  navegador bloquea esa lectura cuando abres index.html con
//  doble clic, así que hay que servirlo por http.
//
//  USO:  doble clic en VER-LOCAL.bat
//        y abre  http://localhost:8000
//
//  Requiere Node.js instalado.
// ============================================================

const http = require("http");
const fs   = require("fs");
const path = require("path");

const PUERTO = 8000;
const RAIZ   = __dirname;

const TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".js":   "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".yml":  "text/yaml; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".md":   "text/markdown; charset=utf-8",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".gif":  "image/gif",
    ".webp": "image/webp",
    ".svg":  "image/svg+xml",
    ".ico":  "image/x-icon"
};

http.createServer((peticion, respuesta) => {

    let ruta = decodeURIComponent(peticion.url.split("?")[0]);

    // Evita salirse de la carpeta del proyecto
    const archivo = path.normalize(path.join(RAIZ, ruta));
    if (!archivo.startsWith(RAIZ)) {
        respuesta.writeHead(403);
        return respuesta.end("403 — Acceso denegado");
    }

    // Si la ruta apunta a una carpeta, sirve su index.html.
    // Así  /  →  index.html   y   /admin/  →  admin/index.html
    const destino = (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory())
        ? path.join(archivo, "index.html")
        : archivo;

    fs.readFile(destino, (error, datos) => {
        if (error) {
            respuesta.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            return respuesta.end("404 — No encontrado: " + ruta);
        }

        const tipo = TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream";
        respuesta.writeHead(200, { "Content-Type": tipo });
        respuesta.end(datos);
    });

}).listen(PUERTO, () => {
    console.log("");
    console.log("  Servidor local en marcha.");
    console.log("  ─────────────────────────────────────────────");
    console.log("  Página:    http://localhost:" + PUERTO);
    console.log("  Panel:     http://localhost:" + PUERTO + "/admin/");
    console.log("  ─────────────────────────────────────────────");
    console.log("  Cierra esta ventana negra para detenerlo.");
    console.log("");
});
