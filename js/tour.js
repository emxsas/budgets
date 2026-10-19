// Guided onboarding tour: a welcome card, spotlight coachmarks over the real UI
// (switching tabs / opening the add sheet as needed, never writing data) and a
// closing card. Passive: a transparent blocker swallows clicks; the user moves
// with Siguiente / Atrás / Saltar (or Esc / ← / →). Targets are looked up by
// selector on every step and reposition, so innerHTML re-renders are harmless.
// The "seen" flag lives in its own localStorage key, outside budgetAppData.
import { getState } from './storage.js';
import { openAdd, closeSheet } from './sheet.js';

const FLAG_KEY = 'budgetAppTour';
const FLAG_VERSION = 1;

const CH = {
    ajustes: ['Ajustes', '#9aa7ad'],
    mov: ['Movimientos', '#34d399'],
    extra: ['Fijo o extra', '#84cc16'],
    deuda: ['Deudas', '#f97316'],
    ejec: ['Ejecución', '#22d3ee'],
    resumen: ['Resumen', '#34d399'],
    presup: ['Presupuestos', '#a78bfa'],
    cierre: ['Cierre de mes', '#fbbf24']
};

// --- mini visuals (static examples, so the tour reads well with no data) ---
const box = inner => `<div style="margin-top:12px;background:#0e1113;border:1px solid #21282c;border-radius:12px;padding:11px 12px">${inner}</div>`;
const chip = (t, c) => `<span style="display:inline-flex;align-items:center;gap:6px;background:#1c2226;border:1px solid #2a3237;border-radius:99px;padding:4px 10px;font-size:11.5px;font-weight:600;color:#e7edf0"><span style="width:7px;height:7px;border-radius:50%;background:${c}"></span>${t}</span>`;
const pill = (t, c, bg) => `<span style="font-size:10px;font-weight:700;color:${c};background:${bg};padding:2px 8px;border-radius:99px">${t}</span>`;
const row = (left, right, rc = '#fff') => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12px;font-weight:600;color:#c3cdd2;padding:3px 0">${left}<span class="num" style="font-weight:700;color:${rc}">${right}</span></div>`;
const bar = (pct, fill) => `<div class="bar-track" style="margin-top:7px"><div style="width:${pct}%;height:100%;border-radius:99px;background:${fill}"></div></div>`;
const MINTBAR = 'linear-gradient(90deg,#34d399,#22d3ee)';
const formula = html => `<div class="num" style="font-size:12.5px;font-weight:700;color:#e7edf0;text-align:center;line-height:1.5">${html}</div>`;

const labelOf = id => () => document.getElementById(id)?.closest('label');

const STEPS = [
    {
        center: true, tab: 'resumen', title: '¡Hola! Armemos tu presupuesto',
        body: 'En un minuto te enseño cómo funciona: categorías, movimientos, deudas, ejecución y el cierre de mes.',
        visual: `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px">${Object.values(CH).filter((_, i) => i !== 2).map(([t, c]) => chip(t, c)).join('')}</div>`
    },
    {
        ch: 'ajustes', tab: 'resumen', target: ['.topbar-gear', '.side-btn[data-tab="ajustes"]'],
        title: 'Todo empieza en Ajustes',
        body: 'Aquí defines tus categorías y respaldas tus datos. Lo abres con el engrane de arriba.',
        bodyDesktop: 'Aquí defines tus categorías y respaldas tus datos. Lo encuentras en el menú de la izquierda.'
    },
    {
        ch: 'ajustes', tab: 'ajustes', target: '[data-tour="cats"] > div:nth-child(2)', title: 'Tus categorías',
        body: 'Ya trae algunas de ejemplo: bórralas con la × o crea las tuyas, como “Despensa” o “Tdc Banorte”.',
        visual: box(`<div style="display:flex;flex-wrap:wrap;gap:6px">${chip('Salario', '#34d399')}${chip('Renta', '#f43f5e')}${chip('Tdc Banorte', '#f97316')}</div>
            <div style="font-size:11px;color:#7c8a92;font-weight:600;margin-top:9px;line-height:1.4">Si borras una que está en uso, te preguntamos a cuál mover sus movimientos.</div>`)
    },
    {
        ch: 'mov', tab: 'resumen', target: ['.fab', '.btn-add-side'], title: 'Registra con el +',
        body: 'Toca + y elige qué quieres añadir: un ingreso, un gasto o una deuda.',
        visual: box(`<div style="display:flex;gap:6px">${[['Ingreso', '#34d399'], ['Gasto', '#f43f5e'], ['Deuda', '#f97316']].map(([t, c]) =>
            `<div style="flex:1;text-align:center;background:#161a1d;border:1px solid #21282c;border-radius:10px;padding:8px 4px;font-size:11.5px;font-weight:700;color:${c}">${t}</div>`).join('')}</div>`)
    },
    {
        ch: 'extra', sheet: 'ingreso', target: labelOf('sh-efimero'), title: 'Ingresos fijos o extra',
        body: 'Tu sueldo es fijo: se queda mes con mes. Marca <b>Extra</b> si es de una sola vez, como una venta o un regalo.',
        visual: box(row(`<span>Quincena ${pill('Fijo', '#34d399', '#12291f')}</span>`, 'se queda', '#34d399') +
            row(`<span>Venta bici ${pill('Extra', '#84cc16', '#22300a')}</span>`, 'se borra al cerrar', '#fbbf24'))
    },
    {
        ch: 'extra', sheet: 'gasto', target: labelOf('sh-extra'), title: 'Gastos fijos o extra',
        body: 'Sin marcar, el gasto es fijo (renta, internet) y se repite cada mes. Marca <b>Extra</b> si es solo de este mes, como el súper.',
        visual: box(row(`<span>Renta ${pill('Recurrente', '#22d3ee', '#122229')}</span>`, '$6,000') +
            row(`<span>Súper ${pill('Extra', '#f43f5e', '#2a1518')}</span>`, '$1,800'))
    },
    {
        ch: 'deuda', sheet: 'deuda', target: '[data-tour="sh-deuda-montos"]', title: 'Tus deudas',
        body: 'El tipo es la categoría de la deuda. Anota lo que pagas al mes, lo que te falta (restante) y el monto original para ver tu avance.',
        visual: box(row('Lavadora · restante $5,400 de $9,000', '40%', '#34d399') + bar(40, MINTBAR))
    },
    {
        ch: 'deuda', sheet: 'deuda', target: '[data-tour="sh-deuda-modo"]', title: 'Manual o automática',
        body: '<b>Manual:</b> tú actualizas el restante (ideal si hay intereses). <b>Automática:</b> cada pago que ejecutes lo baja solo; perfecta para MSI o préstamos sin intereses.',
        visual: box(formula('Restante $5,400 <span style="color:#7c8a92">→ ejecutas</span> $900 <span style="color:#7c8a92">→</span> <span style="color:#34d399">$4,500</span>'))
    },
    {
        ch: 'deuda', tab: 'deuda', target: '[data-tour="deuda-total"]', title: 'Cómo cuenta tu deuda',
        body: 'El pago mensual se resta en Resumen como un gasto y aparece en Ejecución como un pago por hacer.'
    },
    {
        ch: 'ejec', tab: 'ejecucion', target: '[data-tour="ej-restante"]', title: 'Tu mes en tiempo real',
        body: 'En Ejecución vas marcando lo que ya pasó con tu dinero.',
        visual: box(formula('Restante = Ingresos aplicados − Pagos ejecutados'))
    },
    {
        ch: 'ejec', tab: 'ejecucion', target: '[data-tour="ej-ingresos"]', title: 'Aplica tus ingresos',
        body: 'Cuando te caiga el dinero, toca <b>Aplicar</b>. Si te equivocas, toca <b>Quitar</b>.',
        visual: box(row('Quincena', '$15,000 <span style="font-family:inherit;font-size:11px;background:#1c3a2e;color:#34d399;padding:3px 9px;border-radius:7px;margin-left:6px">Aplicar</span>', '#34d399'))
    },
    {
        ch: 'ejec', tab: 'ejecucion', target: '[data-tour="ej-pagos"]', title: 'Paga y ejecuta',
        body: 'Toca los pagos que ya hiciste y luego <b>Ejecutar</b>. Con <b>Deshacer</b> lo regresas.',
        visual: box(row('<span style="display:flex;align-items:center;gap:7px"><span style="width:15px;height:15px;border-radius:5px;background:#34d399"></span>Súper</span>', '$1,800') +
            `<div style="margin-top:7px;text-align:center;background:#1c3a2e;border:1px solid #2a5544;color:#34d399;font-size:11.5px;font-weight:700;padding:6px;border-radius:9px">Ejecutar (1)</div>`)
    },
    {
        ch: 'ejec', tab: 'ejecucion', target: '[data-tour="ej-proj"]', title: 'Proyecta una categoría',
        body: 'Elige un grupo (Fijos, Extra, Deuda…) o una categoría y ve cuánto falta y cuánto ya pagaste. <b>Seleccionar pendientes</b> los marca de un toque.'
    },
    {
        ch: 'resumen', tab: 'resumen', target: '[data-tour="res-disp"]', title: 'Disponible este mes',
        body: 'Es lo que te queda después de todo lo comprometido.',
        visual: box(formula('Ingresos − (Fijos + Extra + Pagos de deuda + Presupuestos)'))
    },
    {
        ch: 'resumen', tab: 'resumen', target: '[data-tour="res-bar"]', title: 'Ingresos vs gastos',
        body: 'La barra compara lo que entra con lo que sale; el % ahorro es lo que no tienes comprometido.'
    },
    {
        ch: 'resumen', tab: 'resumen', target: '[data-tour="res-donut"]', title: '¿En qué se va?',
        body: 'La dona reparte tus gastos por categoría, como parte de tus ingresos.'
    },
    {
        ch: 'presup', tab: 'resumen', target: '[data-tour="res-presup"]', title: 'Presupuestos',
        body: 'Aparta un límite para algo, como “Para el bebé”, y anota ahí lo que gastas. El límite completo cuenta en tu Disponible.',
        visual: box(row('Para el bebé', 'Quedan $1,200', '#a78bfa') + bar(70, 'linear-gradient(90deg,#a78bfa,#22d3ee)'))
    },
    {
        ch: 'resumen', tab: 'resumen', target: '[data-tour="res-deuda"]', title: 'Deuda pendiente',
        body: 'Es la suma de lo que te falta pagar en todas tus deudas.'
    },
    {
        ch: 'cierre', tab: 'ajustes', target: '[data-tour="aj-reset-mes"]', title: 'Cierra el mes',
        body: 'Al empezar un mes nuevo, toca <b>Reset mes</b>.',
        visual: box(`<div style="display:flex;gap:12px;font-size:11.5px;font-weight:600;line-height:1.55">
            <div style="flex:1"><div style="color:#f87171;font-weight:700;margin-bottom:2px">Se borra</div><div style="color:#c3cdd2">Gastos e ingresos extra<br>Avance de Ejecución<br>Presupuestos mensuales</div></div>
            <div style="flex:1"><div style="color:#34d399;font-weight:700;margin-bottom:2px">Se queda</div><div style="color:#c3cdd2">Gastos fijos<br>Ingresos fijos<br>Deudas</div></div>
        </div>
        <div style="font-size:11px;color:#fbbf24;font-weight:600;margin-top:9px;line-height:1.4">Las deudas automáticas ya bajaron con cada pago; las manuales actualízalas tú.</div>`)
    },
    {
        ch: 'cierre', tab: 'ajustes', target: '[data-tour="aj-datos"]', title: 'Respalda tus datos',
        body: 'Todo vive solo en este navegador: exporta un respaldo seguido y usa <b>Importar</b> para pasarlo a otro celular o compu. <b>Restablecer</b>, hasta abajo, borra todo.',
        visual: box(`<div class="num" style="font-size:12px;font-weight:600;color:#22d3ee">presupuesto-data-${new Date().toISOString().slice(0, 10)}.json</div>`)
    },
    {
        center: true, final: true, tab: 'ajustes', title: '¡Listo!',
        body: 'Empieza revisando tus categorías y agrega tu primer ingreso. Puedes volver a ver este tutorial en Ajustes.'
    }
];

const COUNTED = STEPS.filter(s => !s.center).length;

let deps = { setTab: () => {} };
let idx = -1;
let sheetOpen = null;
let root = null;
let prevFocus = null;
let raf = 0;
let showToken = 0;

const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function writeFlag(status) {
    try { localStorage.setItem(FLAG_KEY, JSON.stringify({ v: FLAG_VERSION, status, at: new Date().toISOString() })); } catch (e) { /* storage blocked */ }
}
function readFlag() {
    try { const f = JSON.parse(localStorage.getItem(FLAG_KEY)); return f && f.v >= FLAG_VERSION ? f : null; } catch (e) { return null; }
}

function resolveTarget(step) {
    const t = step.target;
    if (!t) return null;
    if (typeof t === 'function') return t() || null;
    const sels = Array.isArray(t) ? t : [t];
    for (const sel of sels) {
        const el = document.querySelector(sel);
        if (el && el.getClientRects().length) return el;
    }
    return null;
}

function controls(step, n) {
    const ghost = 'background:#1c2226;border:1px solid #2a3237;color:#c3cdd2';
    const primary = 'background:linear-gradient(135deg,#34d399,#22d3ee);border:none;color:#06231a';
    const btn = (act, label, style) => `<button data-tour-act="${act}" style="min-height:44px;padding:0 16px;border-radius:12px;font-weight:700;font-size:13.5px;cursor:pointer;${style}">${label}</button>`;
    if (idx === 0) return `<div style="display:flex;gap:8px;margin-top:16px">${btn('skip', 'Ahora no', ghost + ';flex:1')}${btn('next', 'Empezar', primary + ';flex:1.4')}</div>`;
    if (step.final) return `<div style="display:flex;gap:8px;margin-top:16px">${btn('done-home', 'Terminar', ghost + ';flex:1')}${btn('done-ajustes', 'Ir a Ajustes', primary + ';flex:1.4')}</div>`;
    return `<div style="display:flex;align-items:center;gap:8px;margin-top:16px">
        <button data-tour-act="skip" style="min-height:44px;background:transparent;border:none;color:#7c8a92;font-weight:700;font-size:12.5px;cursor:pointer;padding:0 4px;margin-right:auto">Saltar</button>
        ${n > 1 ? btn('back', 'Atrás', ghost) : ''}
        ${btn('next', 'Siguiente', primary)}
    </div>`;
}

function cardMarkup(step, forceCompact = false) {
    const n = STEPS.slice(0, idx + 1).filter(s => !s.center).length;
    const [chLabel, chColor] = step.ch ? CH[step.ch] : ['', ''];
    const head = step.center ? '' : `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <span style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${chColor}">${chLabel}</span>
            <span class="num" style="font-size:11.5px;font-weight:700;color:#7c8a92">${n}/${COUNTED}</span>
        </div>
        <div style="height:3px;border-radius:99px;background:#21282c;margin:8px 0 12px;overflow:hidden"><div style="width:${n / COUNTED * 100}%;height:100%;background:#34d399;border-radius:99px"></div></div>`;
    const body = isDesktop() && step.bodyDesktop ? step.bodyDesktop : step.body;
    const compact = forceCompact || window.innerHeight < 560;
    return `${head}
        <div id="tour-title" style="font-size:${step.center ? 19 : 16}px;font-weight:700;letter-spacing:-.2px">${step.title}</div>
        <div aria-live="polite" style="font-size:13.5px;color:#9aa7ad;font-weight:500;line-height:1.45;margin-top:5px">${body}</div>
        ${step.visual && !compact ? `<div data-tour-visual>${step.visual}</div>` : ''}
        ${controls(step, n)}`;
}

function ensureRoot() {
    if (root) return root;
    root = document.createElement('div');
    root.id = 'tour-root';
    root.innerHTML = `<div class="tour-blocker"></div><div class="tour-hole"></div>
        <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" tabindex="-1"></div>`;
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    return root;
}

function scrollToTarget(el, card) {
    if (el.closest('.nav-bottom, .nav-side')) return;
    if (el.closest('.sheet-panel')) { el.scrollIntoView({ block: 'nearest' }); return; }
    if (el.closest('.topbar')) { window.scrollTo(0, 0); return; }
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const floor = isDesktop() ? vh - 12 : vh - 100;
    const total = r.height + 12 + card.offsetHeight;
    // Leave room for the card right below the target when both fit; otherwise
    // put the target near the top (tall targets) or around 30% of the viewport.
    const anchor = total <= floor - 24 ? Math.max(16, (floor - total) / 2)
        : r.height > vh * 0.45 ? vh * 0.1 : vh * 0.3;
    window.scrollTo(0, Math.max(0, window.scrollY + r.top - anchor));
}

function position(compactTried = false) {
    if (idx < 0 || !root) return;
    const step = STEPS[idx];
    const hole = root.querySelector('.tour-hole');
    const card = root.querySelector('.tour-card');
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const desk = isDesktop();
    const el = step.center ? null : resolveTarget(step);

    // Card width: full-bleed minus 16px gutters on mobile, fixed on desktop.
    const w = desk ? 340 : Math.min(vw - 32, 440);
    card.style.width = (step.center ? Math.min(vw - 32, 380) : w) + 'px';

    if (!el) {
        root.classList.add('tour-centered');
        hole.style.cssText = '';
        card.style.left = Math.round((vw - card.offsetWidth) / 2) + 'px';
        card.style.top = Math.round(Math.max(16, (vh - card.offsetHeight) / 2)) + 'px';
        return;
    }
    root.classList.remove('tour-centered');
    const r = el.getBoundingClientRect();
    const pad = 6;
    const h = { top: Math.max(4, r.top - pad), left: Math.max(4, r.left - pad) };
    h.right = Math.min(vw - 4, r.right + pad);
    h.bottom = Math.min(vh - 4, r.bottom + pad);
    Object.assign(hole.style, { top: h.top + 'px', left: h.left + 'px', width: (h.right - h.left) + 'px', height: Math.max(0, h.bottom - h.top) + 'px' });

    const ch = card.offsetHeight, cw = card.offsetWidth, gap = 12;
    const inNav = !!el.closest('.nav-bottom');
    const floor = desk || inNav ? vh - 12 : vh - 100;   // keep clear of the floating bottom bar
    let top, left;
    if (desk && el.closest('.nav-side')) {
        left = h.right + 14;
        top = Math.min(Math.max(12, h.top), vh - ch - 12);
    } else {
        left = desk ? Math.min(Math.max(12, h.left + (h.right - h.left - cw) / 2), vw - cw - 12) : Math.round((vw - cw) / 2);
        const below = h.bottom + gap, above = h.top - gap - ch;
        const fitsBelow = below + ch <= floor, fitsAbove = above >= 12;
        const order = step.sheet || inNav ? ['above', 'below'] : ['below', 'above'];
        const pick = order.find(o => (o === 'below' ? fitsBelow : fitsAbove));
        // No room on either side: retry once without the mini visual before overlapping.
        if (!pick && !compactTried && step.visual && card.querySelector('[data-tour-visual]')) {
            const focused = document.activeElement && document.activeElement.dataset.tourAct;
            card.innerHTML = cardMarkup(step, true);
            if (focused) card.querySelector(`[data-tour-act="${focused}"]`)?.focus({ preventScroll: true });
            position(true);
            return;
        }
        if (pick === 'below') top = below;
        else if (pick === 'above') top = above;
        else top = (h.top > vh - h.bottom) ? Math.max(12, above) : Math.min(below, floor - ch);   // bigger side wins
    }
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(Math.max(12, top)) + 'px';
}

function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => position());
}

function show(i) {
    const step = STEPS[i];
    idx = i;
    const token = ++showToken;
    ensureRoot();
    const card = root.querySelector('.tour-card');

    // Sheet: open the requested form (no data is written), or close a leftover one.
    let wait = 0;
    if (step.sheet !== sheetOpen) {
        if (step.sheet) { openAdd(step.sheet); wait = reduced() ? 30 : 320; }
        else closeSheet();
        sheetOpen = step.sheet || null;
    }
    // Sheet steps keep whatever tab is underneath.
    if (!step.sheet && step.tab) deps.setTab(step.tab);

    card.innerHTML = cardMarkup(step);
    card.classList.remove('tour-in');
    void card.offsetWidth;
    card.classList.add('tour-in');

    // Find the target (retrying a few frames for late renders), scroll, then place.
    let tries = 0;
    const settle = () => {
        if (token !== showToken) return;
        const el = step.center ? null : resolveTarget(step);
        if (!step.center && !el && tries++ < 10) { requestAnimationFrame(settle); return; }
        if (el) scrollToTarget(el, card);
        position();
        const focusBtn = card.querySelector('[data-tour-act="next"], [data-tour-act="done-ajustes"]');
        if (focusBtn) focusBtn.focus({ preventScroll: true });
    };
    setTimeout(() => requestAnimationFrame(settle), wait);
}

function end(status, tab = 'resumen') {
    writeFlag(status);
    closeSheet();
    sheetOpen = null;
    idx = -1;
    showToken++;
    if (root) { root.remove(); root = null; }
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('scroll', schedule, true);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', schedule);
    deps.setTab(tab);
    if (prevFocus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
}

function next() { if (idx < STEPS.length - 1) show(idx + 1); }
function back() { if (idx > 0) show(idx - 1); }

function onClick(e) {
    const b = e.target.closest('[data-tour-act]');
    if (!b) return;
    const a = b.dataset.tourAct;
    if (a === 'next') next();
    else if (a === 'back') back();
    else if (a === 'skip') end('skipped');
    else if (a === 'done-home') end('done', 'resumen');
    else if (a === 'done-ajustes') end('done', 'ajustes');
}

function onKey(e) {
    if (idx < 0) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end('skipped'); return; }
    if (e.key === 'ArrowRight' && !STEPS[idx].final) { e.preventDefault(); next(); return; }
    if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); back(); return; }
    if (e.key === 'Tab') {
        // Keep focus inside the card.
        const f = [...root.querySelectorAll('.tour-card button')];
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
}

export function startTour() {
    if (idx >= 0) return;
    prevFocus = document.activeElement;
    closeSheet();
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule);
    show(0);
}

export function initTour({ setTab }) {
    deps.setTab = setTab;
    document.addEventListener('start-tour', startTour);
}

/** First run: start automatically when there is no flag and no user data yet.
 *  Existing users (data but no flag) are marked silently — no surprise tour. */
export function maybeAutoStartTour() {
    if (readFlag()) return;
    const s = getState();
    const empty = !s.ingresos.length && !s.gastos.length && !s.gastosRecurrentes.length && !s.deudas.length && !s.presupuestos.length;
    if (!empty) { writeFlag('existing'); return; }
    const go = () => requestAnimationFrame(startTour);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
    else go();
}
