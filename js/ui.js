// Shared helpers reused across all view modules.

export function fmt(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmt0(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function sum(arr, f) {
    return (arr || []).reduce((s, x) => s + (parseFloat(f(x)) || 0), 0);
}

// Escape text before injecting into innerHTML (descriptions/categories are user input).
export function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
export function monthLabel(d = new Date()) {
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Notify the app that persisted data changed so the active section re-renders.
export function emitDataChanged() {
    document.dispatchEvent(new Event('data-changed'));
}

const PATHS = {
    resumen: '<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/>',
    movimientos: '<path d="M7 7h13M7 7 4 4M7 7 4 10"/><path d="M17 17H4M17 17l3 3M17 17l3-3"/>',
    deuda: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
    ejecucion: '<path d="M9 5h11M9 12h11M9 19h11M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2"/>',
    ajustes: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    ingreso: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    recurrente: '<path d="M17 2l4 4-4 4M21 6H7a4 4 0 0 0-4 4v1M7 22l-4-4 4-4M3 18h14a4 4 0 0 0 4-4v-1"/>',
    extra: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    deudaPick: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>'
};

export function icon(name, { size = 20, sw = 1.9 } = {}) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] || ''}</svg>`;
}

// Distinct "grass" green used to flag ephemeral incomes (vs the teal mint #34d399).
export const GRASS = '#84cc16';

// Reusable dark-theme checkbox row for the add/edit sheet.
export function checkboxRow(id, label, checked) {
    return `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:4px 0">
        <input type="checkbox" id="${id}"${checked ? ' checked' : ''} style="width:18px;height:18px;accent-color:#34d399;cursor:pointer">
        <span style="font-size:13px;font-weight:600;color:#c3cdd2">${label}</span>
    </label>`;
}

// Populate the static month labels and sidebar nav icons/labels once at startup.
const NAV = [
    { tab: 'resumen', label: 'Resumen' },
    { tab: 'movimientos', label: 'Movimientos' },
    { tab: 'deuda', label: 'Deuda' },
    { tab: 'ejecucion', label: 'Ejecución' },
    { tab: 'ajustes', label: 'Ajustes' }
];

export function setupUI() {
    document.querySelectorAll('[data-month]').forEach(el => { el.textContent = monthLabel(); });
    NAV.forEach(({ tab, label }) => {
        const btn = document.querySelector(`.side-btn[data-tab="${tab}"]`);
        if (btn) btn.innerHTML = `${icon(tab)}<span>${label}</span>`;
    });
}
