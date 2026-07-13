import { initState } from './storage.js';
import { setupUI } from './ui.js';
import { renderResumen } from './resumen.js';
import { renderMovimientos, initMovimientos } from './movimientos.js';
import { renderDeuda, initDeuda } from './deuda.js';
import { renderEjecucion, initEjecucion, resetEjecucionSelection } from './ejecucion.js';
import { renderAjustes, initAjustes } from './settings.js';
import { initSheet, openPicker } from './sheet.js';

const TABS = {
    resumen: { title: 'Resumen', render: renderResumen },
    movimientos: { title: 'Movimientos', render: renderMovimientos },
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
    TABS[tab].render();

    window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    initState();
    setupUI();

    // Attach one-time event delegation for each section + the shared sheet.
    initMovimientos();
    initDeuda();
    initEjecucion();
    initAjustes();
    initSheet();

    // Navigation (sidebar, bottom bar, header gear all use [data-tab]).
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => setTab(btn.dataset.tab));
    });

    // Add (+) buttons open the type picker sheet.
    document.querySelectorAll('[data-add="open"]').forEach(btn => {
        btn.addEventListener('click', () => openPicker());
    });

    // Re-render the active section whenever persisted data changes.
    document.addEventListener('data-changed', () => TABS[currentTab].render());

    setTab('resumen');
});
