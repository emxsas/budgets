// Centralized add / edit bottom sheet. Opens either a type picker (Añadir) or a
// prefilled form (edit), and routes saves to the existing storage.js functions.
// Gastos are one unified type with an "Extra" checkbox (extra -> `gastos`,
// recurrente -> `gastosRecurrentes`); ingresos gain an "Efímero" checkbox.
import {
    getIngresos, getGastos, getGastosRecurrentes, getDeudas,
    getIngresoCategories, getGastoCategories, getDeudaCategories,
    addIngreso, updateIngreso, saveGasto, addDeuda, updateDeuda
} from './storage.js';
import { icon, esc, emitDataChanged, checkboxRow } from './ui.js';

const root = document.getElementById('sheet-root');

let state = { open: false, type: null, editId: null, form: {} };

const TYPES = {
    ingreso: { title: 'Ingreso', color: '#34d399', iconBg: '#12291f', icon: 'ingreso', placeholder: 'Ej. Salario mensual' },
    gasto: { title: 'Gasto', color: '#f43f5e', iconBg: '#2a1518', icon: 'extra', placeholder: 'Ej. Renta' },
    deuda: { title: 'Deuda', color: '#f97316', iconBg: '#2a1e12', icon: 'deudaPick', placeholder: 'Ej. Tarjeta BBVA' }
};

function catsFor(type) {
    if (type === 'ingreso') return getIngresoCategories();
    if (type === 'deuda') return getDeudaCategories();
    return getGastoCategories();
}

function itemFor(type, id) {
    if (type === 'ingreso') return getIngresos().find(x => x.id === id);
    if (type === 'deuda') return getDeudas().find(x => x.id === id);
    // gasto lives in either array (extra vs recurrente)
    return getGastos().find(x => x.id === id) || getGastosRecurrentes().find(x => x.id === id);
}

export function openPicker() { state = { open: true, type: null, editId: null, form: {} }; render(); }

export function openAdd(type) { state = { open: true, type, editId: null, form: {} }; render(); }

export function openEdit(type, id) {
    const item = itemFor(type, id);
    if (!item) return;
    let form;
    if (type === 'deuda') {
        form = { tipo: item.tipo, descripcion: item.descripcion, pagoMensual: item.pagoMensual, total: item.total, original: item.original != null ? item.original : item.total };
    } else if (type === 'gasto') {
        form = { cat: item.categoria, descripcion: item.descripcion, cantidad: item.cantidad, extra: getGastos().some(x => x.id === id) };
    } else {
        form = { cat: item.categoria, descripcion: item.descripcion, cantidad: item.cantidad, efimero: !!item.efimero };
    }
    state = { open: true, type, editId: id, form };
    render();
}

export function closeSheet() { state = { open: false, type: null, editId: null, form: {} }; render(); }

function pickerMarkup() {
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${Object.entries(TYPES).map(([key, t]) => `
            <button data-pick="${key}" style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:16px;border-radius:16px;background:#161a1d;border:1px solid #21282c;cursor:pointer;text-align:left">
                <span style="width:38px;height:38px;border-radius:11px;background:${t.iconBg};color:${t.color};display:flex;align-items:center;justify-content:center">${icon(t.icon, { size: 20, sw: 2 })}</span>
                <span style="color:#fff;font-weight:700;font-size:14px">${t.title}</span>
            </button>`).join('')}
    </div>`;
}

function field(label, inner, hint) {
    return `<div><label class="field-label">${label}${hint ? ` <span style="color:#5f6d73;font-weight:600">${hint}</span>` : ''}</label>${inner}</div>`;
}

function formMarkup() {
    const t = state.type, f = state.form, cfg = TYPES[t];
    const cats = catsFor(t);
    const catLabel = t === 'deuda' ? 'Tipo' : 'Categoría';
    const catValue = t === 'deuda' ? f.tipo : f.cat;
    const options = cats.map(c => `<option value="${esc(c)}"${String(catValue) === String(c) ? ' selected' : ''}>${esc(c)}</option>`).join('');

    let specific;
    if (t === 'deuda') {
        specific = `
            <div style="display:flex;gap:10px">
                <div style="flex:1">${field('Pago mensual', `<input id="sh-pagoMensual" class="field" type="number" value="${f.pagoMensual != null ? esc(f.pagoMensual) : ''}" placeholder="2500">`)}</div>
                <div style="flex:1">${field('Restante', `<input id="sh-total" class="field" type="number" value="${f.total != null ? esc(f.total) : ''}" placeholder="18400">`)}</div>
            </div>
            ${field('Monto original', `<input id="sh-original" class="field" type="number" value="${f.original != null ? esc(f.original) : ''}" placeholder="30000">`, '(para progreso)')}`;
    } else {
        const checkbox = t === 'ingreso'
            ? checkboxRow('sh-efimero', 'Efímero (se borra al cerrar el mes)', !!f.efimero)
            : checkboxRow('sh-extra', 'Extra (se borra al cerrar el mes)', !!f.extra);
        specific = `${field('Cantidad', `<input id="sh-cantidad" class="field" type="number" value="${f.cantidad != null ? esc(f.cantidad) : ''}" placeholder="1500">`)}${checkbox}`;
    }

    return `<div style="display:flex;flex-direction:column;gap:13px">
        ${field(catLabel, `<select id="sh-cat" class="field">${options}</select>`)}
        ${field('Descripción', `<input id="sh-descripcion" class="field" value="${f.descripcion != null ? esc(f.descripcion) : ''}" placeholder="${cfg.placeholder}">`)}
        ${specific}
        <button class="btn-primary" data-sheet="save" style="margin-top:6px">${state.editId ? 'Guardar cambios' : 'Añadir'}</button>
    </div>`;
}

function render() {
    if (!state.open) { root.innerHTML = ''; return; }
    const t = state.type;
    const title = t ? `${state.editId ? 'Editar ' : 'Nuevo '}${TYPES[t].title.toLowerCase()}` : 'Añadir';
    root.innerHTML = `
        <div class="sheet-overlay" data-sheet="overlay">
            <div class="sheet-panel">
                <div class="sheet-grab"></div>
                <div class="sheet-head">
                    <div class="sheet-title">${title}</div>
                    <button class="sheet-close" data-sheet="close">×</button>
                </div>
                ${t ? formMarkup() : pickerMarkup()}
            </div>
        </div>`;
}

function save() {
    const t = state.type;
    const descripcion = document.getElementById('sh-descripcion').value.trim();
    if (t === 'deuda') {
        const tipo = document.getElementById('sh-cat').value;
        const pagoMensual = document.getElementById('sh-pagoMensual').value;
        const total = document.getElementById('sh-total').value;
        const original = document.getElementById('sh-original').value;
        if (!descripcion || !pagoMensual || !total) { alert('Completa descripción, pago mensual y restante.'); return; }
        const obj = {
            tipo, descripcion,
            pagoMensual: parseFloat(pagoMensual) || 0,
            total: parseFloat(total) || 0,
            original: parseFloat(original) || parseFloat(total) || 0
        };
        if (state.editId) updateDeuda({ id: state.editId, ...obj });
        else addDeuda(obj);
    } else {
        const categoria = document.getElementById('sh-cat').value;
        const cantidad = document.getElementById('sh-cantidad').value;
        if (!descripcion || !cantidad) { alert('Completa descripción y cantidad.'); return; }
        const amount = parseFloat(cantidad) || 0;
        if (t === 'ingreso') {
            const efimero = document.getElementById('sh-efimero').checked;
            const obj = { categoria, descripcion, cantidad: amount, efimero };
            if (state.editId) updateIngreso({ id: state.editId, ...obj });
            else addIngreso(obj);
        } else {
            const extra = document.getElementById('sh-extra').checked;
            saveGasto({ id: state.editId != null ? state.editId : undefined, extra, categoria, descripcion, cantidad: amount });
        }
    }
    closeSheet();
    emitDataChanged();
}

export function initSheet() {
    root.addEventListener('click', (e) => {
        const overlay = e.target.closest('[data-sheet="overlay"]');
        const action = e.target.closest('[data-sheet]');
        const pick = e.target.closest('[data-pick]');
        if (pick) { openAdd(pick.dataset.pick); return; }
        if (action && action.dataset.sheet === 'save') { save(); return; }
        if (action && action.dataset.sheet === 'close') { closeSheet(); return; }
        if (overlay && e.target === overlay) { closeSheet(); }
    });
}
