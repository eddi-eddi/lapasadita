# 📦 Cómo agregar o cambiar productos

No hay panel de administración propio, ni base de datos, ni servidor.
Todo se resuelve con **un archivo de datos** (`js/productos.json`) y un
**panel visual** que edita ese archivo directamente en GitHub.

> **Regla de oro:** los productos viven en **`js/productos.json`**.
> Ese archivo lo escribe el panel, no hay que tocarlo a mano.

---

## Las 2 formas de hacerlo

| | 🅰️ Panel de administración | 🅱️ A mano |
|---|---|---|
| **Para quién** | Uso diario: precios, fotos, productos nuevos | Ajustes puntuales |
| **¿Toca código?** | No | Editar un archivo de texto |
| **¿Sube fotos?** | Sí, desde el navegador | Hay que copiarlas a `img/` |
| **¿Requiere internet?** | Sí | No |
| **Dónde** | `tusitio.github.io/admin/` | `js/productos.json` |

---

# 🅰️ Panel de administración

## 1. Ver el sitio en tu computadora

El catálogo se lee con `fetch()`, que el navegador bloquea si abres
`index.html` con doble clic. Por eso existe un servidor local:

```
Doble clic en   VER-LOCAL.bat
Abre            http://localhost:8000
Panel           http://localhost:8000/admin/
```

Cierra la ventana negra para detenerlo. Requiere [Node.js](https://nodejs.org).

## 2. Abrir el panel

Ya publicada la web, entra a:

```
https://TU-USUARIO.github.io/TU-REPO/admin/
```

## 3. Iniciar sesión con un token

Sveltia CMS no tiene usuarios propios: se identifica con un **token de
GitHub**. En la pantalla de entrada, pulsa **«Sign In with Token»**.

> El propio panel te lleva a la página de GitHub para crear el token ya
> con los permisos correctos. Si prefieres crearlo a mano:

1. Ve a **github.com → Tu foto → Settings → Developer settings**
2. **Personal access tokens → Fine-grained tokens → Generate new token**
3. **Repository access** → *Only select repositories* → elige el de la web
4. **Permissions → Repository permissions** → **Contents: Read and write**
5. Genera y copia el token

**Guarda el token en un lugar seguro** (llavero, papel en la caja fuerte).
Se queda guardado solo en tu navegador. **Nunca lo escribas dentro del
repositorio.**

Puedes revocarlo cuando quieras desde la misma página de GitHub.

## 4. Agregar un producto

```
Productos  →  ➕ Add Product  (o «Agregar»)

   Nombre del producto        Bistec de Diezmillo
   Categoría                  Carnicería  ▾
   Precio                     179.50
   Unidad                     kg
   Foto del producto          [Subir foto] o elegir una existente
   ¿Es promoción?             ☑
   ¿Va en el carrusel?        ☑
   ¿Aparecer en Destacados?   ☑
   Nota interna               (opcional, no se ve en la página)

   [Save]  →  [Publish]
```

## 5. Publicar

| Botón | Qué hace |
|---|---|
| **Save** | Guarda el cambio en el panel |
| **Publish** | Lo sube a GitHub |
| — | GitHub Pages reconstruye la web en **~1 minuto** |

**No es instantáneo.** Después de publicar, espera ese minuto y recarga
la página con **Ctrl + F5**.

---

# 🅱️ A mano (sin panel)

Abre `js/productos.json` y agrega un bloque. Copia y rellena:

```json
{
  "nombre": "Ruffles Fuego 45g",
  "categoria": "snacks",
  "precio": 25,
  "unidad": "",
  "imagen": "img/snacks/rufflesfuego.jpg",
  "promo": false,
  "carrusel": false,
  "destacado": true,
  "nota": ""
},
```

> **JSON no admite comentarios** (`//` rompen el archivo).
> Para dejar un aviso usa el campo `nota`.

Sube la foto a la carpeta de su categoría:

```
img/carniceria/        img/lacteos/         img/snacks/
img/frutasyverduras/   img/bebidas/
```

---

## 📋 Campos

| Campo | Obligatorio | Qué hace | Ejemplo |
|---|---|---|---|
| `nombre` | ✅ | Texto tal como lo ve el cliente. | `"Monster Energy 473ml"` |
| `categoria` | ✅ | `carniceria` · `frutas` · `lacteos` · `bebidas` · `snacks` | `"snacks"` |
| `precio` | ✅ | Solo el número, sin `$` ni comas. | `179.50` |
| `imagen` | ✅ | Ruta de la foto. | `"img/snacks/monster.jpg"` |
| `unidad` | ❌ | Texto después del precio. Vacío si no aplica. | `"kg"`, `"pza"`, `"lt"` |
| `promo` | ❌ | `true` = etiqueta roja + menú Promociones. | `true` |
| `carrusel` | ❌ | `true` = aparece arriba, en el carrusel. | `true` |
| `destacado` | ❌ | `false` = no rota en Destacados. | `false` |
| `nota` | ❌ | Recordatorio tuyo. **No se ve en la página.** | `"Revisar precio"` |

### Cambiar el orden

En el panel, **arrastra** los productos en la lista.
A mano, mueve el bloque completo dentro del arreglo.

### Quitar un producto

En el panel, bórralo desde la lista y publica.
A mano, borra su bloque. **No borres la foto**, puede que la uses luego.

---

## ⚠️ Errores comunes

| Problema | Causa | Solución |
|---|---|---|
| «No se pudo leer el catálogo» | Abriste `index.html` con doble clic | Usa `VER-LOCAL.bat` |
| La página sale en blanco | Falta una coma o llave en el JSON | Compara con los productos de al lado |
| El panel no arranca | Falta cambiar `repo:` en `admin/config.yml` | Pon `tu-usuario/nombre-del-repositorio` |
| «Sign In» no aparece | Revisas el config y hay un error de YAML | Revisa sangrías y puntos y coma |
| La foto no se ve | El nombre no coincide (mayúsculas) | `Foto.jpg` ≠ `foto.jpg` |
| El cambio no aparece | GitHub Pages tarda ~1 min | Espera y recarga con Ctrl + F5 |
| Subí un producto y no sale | Hizo *Save* pero no *Publish* | Pulsa **Publish** |

---

## 🤖 Pedírselo a la inteligencia artificial

Si prefieres que yo lo haga, dame estos 4 datos:

1. **Nombre** — *"Sabritas Adobadas 42g"*
2. **Categoría** — `carniceria` · `frutas` · `lacteos` · `bebidas` · `snacks`
3. **Precio** — `$25`
4. **¿Promo?** sí/no · **¿Carrusel?** sí/no

---

## ✅ Cómo saber que quedó bien

1. El producto aparece en **Destacados** (rota cada 6 segundos).
2. Aparece al pulsar su **categoría** en el menú.
3. Lo encuentras con el **buscador**.
4. Si le pusiste `promo: true`, sale en **Promociones**.
5. Al pulsar *Agregar*, entra al carrito con el precio correcto.

---

## 🧩 Si cambias las categorías

Hay que actualizar **dos** lugares:

1. `js/script.js` → el bloque `CATEGORIAS`
2. `admin/config.yml` → el campo `Categoría`, añadiendo la opción

Dejarlo desincronizado hace que el producto no se pueda elegir en el panel.

---

## 🔒 Nota sobre el token

El token se guarda en el **almacenamiento local del navegador**. No es
infinitamente seguro: si alguien accede a tu computadora y a tu navegador,
podría usarlo. Se reduce mucho el riesgo con:

- un token **fine-grained** limitado **solo a ese repositorio**
- permiso **solo de Contents** (no de Issues, ni de Admin)
- revocarlo cuando no lo vayas a usar por un tiempo

Si creas la web desde cero, también puedes usar **GitHub Desktop** en
lugar del panel para no depender del token.
