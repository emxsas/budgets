# Status del proyecto — Budgets

App de presupuesto personal, mobile-first, 100% estática (HTML + ES modules +
`localStorage`), servida por GitHub Pages. Tema oscuro **"Midnight Finance"**.

## Ramas y flujo

| Rama | Rol |
|------|-----|
| `main` | **Producción**. Cada push dispara el deploy de GitHub Pages. |
| `dev`  | **Staging / trabajo**. Aquí se desarrolla y se prueba. |

**Flujo:** trabajar en `dev` (o ramas de feature que salgan de `dev`) → commit/push a
`dev` → **PR `dev` → `main`** → merge → GitHub Pages publica producción. Tras el merge se
adelanta `dev` a `main` para mantenerlas alineadas.

## Deploy

- Workflow: `.github/workflows/jekyll-gh-pages.yml` (Jekyll), se ejecuta en cada push a `main`.
- Dominio (CNAME): **https://budgt.expertease.com.mx**
- Verificación local: servir estático (ej. un server node en `:8123`) y probar con Playwright
  headless (los navegadores están en caché; el paquete se instala con `npm i playwright`).
- ⚠️ Aviso conocido: el deploy muestra deprecación de Node 20 en `actions/deploy-pages@v4`
  (GitHub lo fuerza a Node 24). No rompe nada hoy; conviene bumpear esa action a futuro.

## Secciones / navegación

5 destinos + un botón "Añadir" (bottom-sheet). En **escritorio** (≥900px) sidebar con los 5 +
Añadir; en **móvil** barra inferior con `Resumen · Mov. · [+] · Deuda · Ejec.`, Ajustes por el
engrane del header, y **Presupuestos por una card en Resumen** (siempre visible).

- **Resumen** — hero "Disponible este mes", barras Ingresos vs Gastos, donut por categoría
  (top-20 + "Otros", Deuda siempre en rojo), card de acceso a Presupuestos, y deuda pendiente.
- **Movimientos** — 2 segmentos: Ingresos | Gastos. Gastos fusiona extras (coral) y recurrentes
  (cian) con etiqueta; ingresos efímeros en verde grass.
- **Presupuestos** — sobres de gasto con nombre + límite; lista con barra de progreso (estado
  sobre-presupuesto en coral) y **drill-in** para micro-administrar line-items.
- **Deuda** — hero total + tarjetas con % pagado (usa `original`).
- **Ejecución** — aplicar ingresos, seleccionar/ejecutar pagos en lote, deshacer.
- **Ajustes** — categorías (chips), Exportar/Importar JSON, Restablecer datos, Reset mes.

## Arquitectura

- `index.html` — chrome estático (sidebar + barra inferior + 5 secciones + raíz del sheet).
- `css/styles.css` — tema oscuro + layout responsive (breakpoint 900px) + animaciones.
- `js/storage.js` — capa de datos sobre `localStorage` (clave `budgetAppData`); única fuente
  de verdad. Compatibilidad hacia atrás vía `getState()` (deepMerge + backfill).
- `js/app.js` — navegación (6 pestañas en `TABS`) + render de la sección activa; el binding de
  nav es **delegación en `document`** (para que la card dinámica de Resumen funcione).
- Vistas: `js/resumen.js`, `js/movimientos.js`, `js/presupuestos.js`, `js/deuda.js`,
  `js/ejecucion.js`, `js/settings.js` (Ajustes).
- `js/sheet.js` — bottom-sheet de alta/edición. Picker global: Ingreso/Gasto/Deuda. Tipos extra
  invocados directamente: `presupuesto` y `presupuesto-item` (no salen en el picker).
- `js/ui.js` — helpers (`fmt`, `fmt0`, `sum`, `esc`, `monthLabel`, `emitDataChanged`,
  `checkboxRow`), íconos SVG y el color `GRASS`.
- Re-render: tras mutar datos se emite el evento `data-changed`; `app.js` re-renderiza la
  sección activa.

### Modelo de datos (`budgetAppData`)

```
ingresos[]           { id, categoria, descripcion, cantidad, efimero? }
gastos[]             { id, categoria, descripcion, cantidad }        // = "Extra"
gastosRecurrentes[]  { id, categoria, descripcion, cantidad }        // = "Recurrente"
deudas[]             { id, tipo, descripcion, pagoMensual, total, original? }
presupuestos[]       { id, nombre, limite, mensual, items: [ { id, descripcion, cantidad } ] }
executedPayments[]   ids
appliedIncomes[]     ids
categories           { ingresos[], gastos[], deudas[] }
```

**Reglas de compatibilidad (no romper):**
- No cambiar la clave `budgetAppData`.
- Campos opcionales con default seguro: `deuda.original` (→ usa `total`, 0% pagado si falta),
  `ingreso.efimero` (→ `false`), `presupuestos` (→ `[]` vía backfill en `getState`).
- Gastos: la pertenencia al array (`gastos` = Extra / `gastosRecurrentes` = Recurrente) **es**
  la bandera; el checkbox "Extra" del sheet solo decide en qué array vive. Sin migración.

### Presupuestos — integración con totales

- **Resumen**: cada presupuesto cuenta su **límite** como gasto (una rebanada del donut por su
  nombre; suma a `totGastos` y baja "Disponible"). Modelo envelope.
- **Ejecución**: cada presupuesto cuenta lo **gastado** (suma de `items`) como pago a realizar;
  solo aparece si `gastado > 0`.
- Los line-items NO suman aparte en Resumen (son el desglose del límite) → sin doble conteo.

## Ciclo mensual

- **Reset mes** (Ajustes): borra gastos extras + ingresos efímeros, limpia el progreso de
  ejecución (`executedPayments` y `appliedIncomes`), y **vacía los items de los presupuestos
  marcados `mensual`** (el sobre y su límite se conservan). Sobreviven recurrentes, deudas,
  ingresos fijos y presupuestos no-mensuales.
- **Restablecer datos**: vuelve al estado por defecto (limpia todo, conserva categorías base).

## Historial de cambios (esta iteración)

1. **Rediseño Midnight Finance** — port del diseño oscuro a la arquitectura vanilla; se
   eliminó Tailwind y Chart.js (donut en `conic-gradient`). Navegación sidebar/barra inferior.
2. **Ciclo mensual** — gastos unificados con checkbox "Extra" (recurrente por defecto);
   ingresos con checkbox "Efímero" (verde grass); botón "Reset mes"; donut top-20 + "Otros"
   con Deuda siempre en rojo; "Ingresos vs Gastos" movido arriba en Resumen.
3. **Sección Presupuestos** — sobres con micro-administración (lista + drill-in), alta vía
   sheet, integración Resumen(límite)/Ejecución(gastado), reset configurable por presupuesto.
4. **Fix acceso móvil** — la card de Presupuestos en Resumen ahora es **siempre visible** (con
   0 presupuestos invita a crear el primero); antes se ocultaba y dejaba sin entrada en móvil.
