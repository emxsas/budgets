# Status del proyecto — Budgets

App de presupuesto personal, mobile-first, 100% estática (HTML + ES modules +
`localStorage`), servida por GitHub Pages.

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

## Arquitectura

- `index.html` — chrome estático (sidebar + barra inferior + secciones + raíz del sheet).
- `css/styles.css` — tema oscuro "Midnight Finance" + layout responsive (breakpoint 900px).
- `js/storage.js` — capa de datos sobre `localStorage` (clave `budgetAppData`); única fuente
  de verdad. Compatibilidad hacia atrás vía `getState()` (deepMerge + backfill).
- `js/app.js` — controlador de navegación (5 secciones) y render de la sección activa.
- `js/*.js` por vista: `resumen`, `movimientos`, `deuda`, `ejecucion`, `settings` (Ajustes),
  `sheet` (alta/edición), `ui` (helpers/íconos).

### Modelo de datos (`budgetAppData`)

```
ingresos[]           { id, categoria, descripcion, cantidad, efimero? }
gastos[]             { id, categoria, descripcion, cantidad }   // = "Extra"
gastosRecurrentes[]  { id, categoria, descripcion, cantidad }   // = "Recurrente"
deudas[]             { id, tipo, descripcion, pagoMensual, total, original? }
executedPayments[]   ids
appliedIncomes[]     ids
categories           { ingresos[], gastos[], deudas[] }
```

**Reglas de compatibilidad (no romper):**
- No cambiar la clave `budgetAppData`.
- Campos opcionales con default seguro: `deuda.original` (→ usa `total`, 0% pagado si falta),
  `ingreso.efimero` (→ `false`, no efímero si falta).
- Gastos: la pertenencia al array (`gastos` = Extra / `gastosRecurrentes` = Recurrente) **es**
  la bandera; el checkbox "Extra" del sheet solo decide en qué array vive. Sin migración.

## Ciclo mensual

- **Reset mes** (Ajustes): borra todos los gastos extras + ingresos efímeros y limpia el
  progreso de ejecución (`executedPayments` y `appliedIncomes`). Sobreviven recurrentes,
  deudas e ingresos fijos.
- **Restablecer datos**: vuelve al estado por defecto (limpia todo, conserva categorías base).
