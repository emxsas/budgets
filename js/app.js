import { initState } from './storage.js';
import { setupUI } from './ui.js';
import { renderResumen } from './resumen.js';
import { renderMovimientos, initMovimientos } from './movimientos.js';
import { renderPresupuestos, initPresupuestos, resetPresupuestoView } from './presupuestos.js';
import { renderDeuda, initDeuda } from './deuda.js';
import { renderEjecucion, initEjecucion, resetEjecucionSelection } from './ejecucion.js';
import { renderAjustes, initAjustes } from './settings.js';
import { initSheet, openPicker } from './sheet.js';

const TABS = {
    resumen: { title: 'Resumen', render: renderResumen },
    movimientos: { title: 'Movimientos', render: renderMovimientos },
    presupuestos: { title: 'Presupuestos', render: renderPresupuestos },
    deuda: { title: 'Deuda', render: renderDeuda },
    ejecucion: { title: 'Ejecución', render: renderEjecucion },
    ajustes: { title: 'Ajustes', render: renderAjustes }
};

let currentTab = 'resumen';

function setTab(tab) {
    if (!TABS[tab]) return;
    currentTab = tab;

    document.querySelectorAll('.tab-section').forEach(sec => {
        sec.hidden = sec.id !== `${tab}-section`;
    });
    document.querySelectorAll('.side-btn, .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.getElementById('screen-title').textContent = TABS[tab].title;

    if (tab === 'ejecucion') resetEjecucionSelection();
    if (tab === 'presupuestos') resetPresupuestoView();
    TABS[tab].render();

    window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    initState();
    setupUI();

    // Attach one-time event delegation for each section + the shared sheet.
    initMovimientos();
    initPresupuestos();
    initDeuda();
    initEjecucion();
    initAjustes();
    initSheet();

    // Navigation + Add via document-level delegation (works for the static nav
    // and for dynamically rendered entries like the Resumen "Presupuestos" card).
    document.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('[data-tab]');
        if (tabBtn) { setTab(tabBtn.dataset.tab); return; }
        if (e.target.closest('[data-add="open"]')) { openPicker(); }
    });

    // Re-render the active section whenever persisted data changes.
    document.addEventListener('data-changed', () => TABS[currentTab].render());

    setTab('resumen');
});
