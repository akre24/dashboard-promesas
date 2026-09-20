# Dashboard Ejecutivo de Promesas

Dashboard estático para GitHub Pages que consume un Google Sheet publicado como CSV.

## Publicación

1. Sube `index.html`, `styles.css` y `app.js` a un repositorio de GitHub.
2. Ve a **Settings → Pages**.
3. Selecciona la rama `main` y carpeta `/root`.
4. Guarda y abre la URL de GitHub Pages.

## Fuente de datos

La URL del Google Sheet está configurada en `app.js` en:

```js
const CSV_URL = "...";
```

## Importante: reglas de clasificación

El dashboard intenta interpretar `Check` y `Validacion` de forma flexible. Antes de usarlo como reporte oficial, conviene confirmar los valores exactos que utiliza tu hoja para:

- Promesa correcta
- Promesa incorrecta
- Efectiva
- No efectiva

La parte a ajustar está en la función `classify()` de `app.js`.

## Seguridad

La hoja publicada como CSV es accesible públicamente para cualquiera que tenga la URL. No coloques en ella datos sensibles que no deban exponerse.
