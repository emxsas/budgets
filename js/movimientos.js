// Consolidated "Movimientos" view: two segments (Ingresos / Gastos). Gastos
// merges the two storage arrays (extra vs recurrente) into one colour-coded
// list; ingresos flag ephemeral entries in grass green. Edit opens the shared
// sheet; data comes from the existing storage.js getters/deleters.
import {
    getIngresos, getGastos, getGastosRecurrentes,
    deleteIngreso, deleteGasto, deleteGastoRecurrente
} from './storage.js';
import { fmt0, sum, esc, icon, GRASS } from './ui.js';
import { openEdit } from './sheet.js';

const MINT = '#34d399';

let seg = 'ingresos';

function ingresoItems() {
    return getIngresos().map(i => {
        const ef = !!i.efimero;
        return {
            id: i.id, type: 'ingreso', descripcion: i.descripcion, categoria: i.categoria, cantidad: i.cantidad,
            color: ef ? GRASS : MINT, iconBg: ef ? '#22300a' : '#12291f', tag: ef ? 'Efímero' : null
        };
    });
}

function gastoItems() {
    const recs = getGastosRecurrentes().map(g => ({
        id: g.id, type: 'gasto', extra: false, descripcion: g.descripcion, categoria: g.categoria, cantidad: g.cantidad,
        color: '#22d3ee', iconBg: '#122229', tag: 'Recurrente'
    }));
    const extras = getGastos().map(g => ({
        id: g.id, type: 'gasto', extra: true, descripcion: g.descripcion, categoria: g.categoria, cantidad: g.cantidad,
        color: '#f43f5e', iconBg: '#2a1518', tag: 'Extra'
    }));
    return recs.concat(extras);
}

const SEGMENTS = {
    ingresos: { label: 'Ingresos', color: MINT, sign: '+', items: ingresoItems },
    gastos: { label: 'Gastos', color: '#f43f5e', sign: '−', items: gastoItems }
};

function segButton(key) {
    const active = seg === key;
    const s = SEGMENTS[key];
    const style = `flex:1;border:none;border-radius:10px;padding:10px 6px;cursor:pointer;font-size:12.5px;font-weight:700;color:${active ? '#06231a' : '#8a97a0'};background:${active ? s.color : 'transparent'}`;
    return `<button data-seg="${key}" style="${style}">${s.label}</button>`;
}

function rowMarkup(item, sign) {
    const initial = (item.descripcion || '?').trim().charAt(0).toUpperCase() || '?';
    return `<div style="display:flex;align-items:center;gap:12px;background:#161a1d;border:1px solid #21282c;border-radius:14px;padding:13px 15px">
        <div class="num" style="width:38px;height:38px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:${item.iconBg};color:${item.color};font-weight:700;font-size:14px">${esc(initial)}</div>
        <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(item.descripcion)}</div>
            <div style="font-size:11px;color:#7c8a92;font-weight:600;margin-top:1px">${esc(item.categoria)}${item.tag ? ` · <span style="color:${item.color}">${item.tag}</span>` : ''}</div>
        </div>
        <div class="num" style="font-size:15px;font-weight:700;color:${item.color};flex:none">${sign}${fmt0(item.cantidad)}</div>
        <div style="display:flex;gap:4px;flex:none">
            <button data-action="edit" data-type="${item.type}" data-id="${item.id}" style="width:30px;height:30px;border-radius:9px;background:#1c2226;border:1px solid #2a3237;color:#9aa7ad;cursor:pointer;display:flex;align-items:center;justify-content:center">${icon('edit', { size: 14, sw: 2 })}</button>
            <button data-action="delete" data-type="${item.type}" data-id="${item.id}"${item.type === 'gasto' ? ` data-extra="${item.extra}"` : ''} style="width:30px;height:30px;border-radius:9px;background:#2a1518;border:1px solid #3a1e22;color:#f87171;cursor:pointer;display:flex;align-items:center;justify-content:center">${icon('trash', { size: 14, sw: 2 })}</button>
        </div>
    </div>`;
}

export function renderMovimientos() {
    const el = document.getElementById('movimientos-section');
    if (!el) return;
    const s = SEGMENTS[seg];
    const items = s.items();
    const total = sum(items, x => x.cantidad);

    const list = items.length
        ? items.map(i => rowMarkup(i, s.sign)).join('')
        : `<div style="text-align:center;padding:40px 20px;color:#5f6d73;font-size:13px">Sin movimientos aún. Toca <b style="color:#34d399">Añadir</b> para empezar.</div>`;

    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:16px">
        <div style="display:flex;gap:6px;background:#161a1d;border:1px solid #21282c;border-radius:14px;padding:5px">
            ${Object.keys(SEGMENTS).map(segButton).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 2px">
            <span style="font-size:12.5px;color:#7c8a92;font-weight:600">${items.length} movimiento${items.length === 1 ? '' : 's'}</span>
            <span class="num" style="font-size:15px;font-weight:700;color:${s.color}">${s.sign}${fmt0(total)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:9px">${list}</div>
    </div>`;
}

export function initMovimientos() {
    const el = document.getElementById('movimientos-section');
    el.addEventListener('click', (e) => {
        const segBtn = e.target.closest('[data-seg]');
        if (segBtn) { seg = segBtn.dataset.seg; renderMovimientos(); return; }
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = parseInt(btn.dataset.id, 10);
        const type = btn.dataset.type;
        if (btn.dataset.action === 'edit') {
            openEdit(type, id);
        } else if (btn.dataset.action === 'delete') {
            if (!confirm('¿Borrar este elemento?')) return;
            if (type === 'ingreso') deleteIngreso(id);
            else if (btn.dataset.extra === 'true') deleteGasto(id);
            else deleteGastoRecurrente(id);
            renderMovimientos();
            document.dispatchEvent(new Event('data-changed'));
        }
    });
}
