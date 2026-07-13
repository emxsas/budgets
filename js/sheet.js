// Centralized add / edit bottom sheet. Opens either a type picker (Añadir) or a
// prefilled form (edit), and routes saves to the existing storage.js functions.
// The global picker only offers Ingreso/Gasto/Deuda; Presupuesto and its
// line-items are opened directly from the Presupuestos section.
import {
    getIngresos, getGastos, getGastosRecurrentes, getDeudas, getPresupuestos,
    getIngresoCategories, getGastoCategories, getDeudaCategories,
    addIngreso, updateIngreso, saveGasto, addDeuda, updateDeuda,
    savePresupuesto, savePresupuestoItem
} from './storage.js';
import { esc, emitDataChanged, checkboxRow, icon } from './ui.js';

const root = document.getElementById('sheet-root');

let state = { open: false, type: null, editId: null, presupuestoId: null, form: {} };

const TYPES = {
    ingreso: { title: 'Ingreso', color: '#34d399', iconBg: '#12291f', icon: 'ingreso', placeholder: 'Ej. Salario mensual' },
    gasto: { title: 'Gasto', color: '#f43f5e', iconBg: '#2a1518', icon: 'extra', placeholder: 'Ej. Renta' },
    deuda: { title: 'Deuda', color: '#f97316', iconBg: '#2a1e12', icon: 'deudaPick', placeholder: 'Ej. Tarjeta BBVA' },
    presupuesto: { title: 'Presupuesto', color: '#a78bfa', iconBg: '#1e1a2e', icon: 'presupuestos', placeholder: 'Ej. Para el bebé' },
    'presupuesto-item': { title: 'Gasto', color: '#f43f5e', iconBg: '#2a1518', icon: 'extra', placeholder: 'Ej. Pañales' }
};

const PICKER_ORDER = ['ingreso', 'gasto', 'deuda'];

function catsFor(type) {
    if (type === 'ingreso') return getIngresoCategories();
    if (type === 'deuda') return getDeudaCategories();
    return getGastoCategories();
}

function itemFor(type, id) {
    if (type === 'ingreso') return getIngresos().find(x => x.id === id);
    if (type === 'deuda') return getDeudas().find(x => x.id === id);
    if (type === 'presupuesto') return getPresupuestos().find(x => x.id === id);
    return getGastos().find(x => x.id === id) || getGastosRecurrentes().find(x => x.id === id);
}

function reset(extra = {}) { state = { open: false, type: null, editId: null, presupuestoId: null, form: {}, ...extra }; }

export function openPicker() { reset({ open: true }); render(); }

export function openAdd(type) { reset({ open: true, type }); render(); }

export function openEdit(type, id) {
    const item = itemFor(type, id);
    if (!item) return;
    let form;
    if (type === 'deuda') {
        form = { tipo: item.tipo, descripcion: item.descripcion, pagoMensual: item.pagoMensual, total: item.total, original: item.original != null ? item.original : item.total };
    } else if (type === 'gasto') {
        form = { cat: item.categoria, descripcion: item.descripcion, cantidad: item.cantidad, extra: getGastos().some(x => x.id === id) };
    } else if (type === 'presupuesto') {
        form = { nombre: item.nombre, limite: item.limite, mensual: !!item.mensual };
    } else {
        form = { cat: item.categoria, descripcion: item.descripcion, cantidad: item.cantidad, efimero: !!item.efimero };
    }
    reset({ open: true, type, editId: id, form });
    render();
}

export function openAddItem(presupuestoId) { reset({ open: true, type: 'presupuesto-item', presupuestoId }); render(); }

export function openEditItem(presupuestoId, itemId) {
    const p = getPresupuestos().find(x => x.id === presupuestoId);
    const item = p && (p.items || []).find(x => x.id === itemId);
    if (!item) return;
    reset({ open: true, type: 'presupuesto-item', editId: itemId, presupuestoId, form: { descripcion: item.descripcion, cantidad: item.cantidad } });
    render();
}

export function closeSheet() { reset(); render(); }

function textInput(id, v, ph) { return `<input id="${id}" class="field" value="${v != null ? esc(v) : ''}" placeholder="${ph}">`; }
function numInput(id, v, ph) { return `<input id="${id}" class="field" type="number" value="${v != null ? esc(v) : ''}" placeholder="${ph}">`; }
function optionsFor(type, val) {
    return catsFor(type).map(c => `<option value="${esc(c)}"${String(val) === String(c) ? ' selected' : ''}>${esc(c)}</option>`).join('');
}

function pickerMarkup() {
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${PICKER_ORDER.map(key => { const t = TYPES[key]; return `
            <button data-pick="${key}" style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:16px;border-radius:16px;background:#161a1d;border:1px solid #21282c;cursor:pointer;text-align:left">
                <span style="width:38px;height:38px;border-radius:11px;background:${t.iconBg};color:${t.color};display:flex;align-items:center;justify-content:center">${icon(t.icon, { size: 20, sw: 2 })}</span>
                <span style="color:#fff;font-weight:700;font-size:14px">${t.title}</span>
            </button>`; }).join('')}
    </div>`;
}

function field(label, inner, hint) {
    return `<div><label class="field-label">${label}${hint ? ` <span style="color:#5f6d73;font-weight:600">${hint}</span>` : ''}</label>${inner}</div>`;
}

function formMarkup() {
    const t = state.type, f = state.form, cfg = TYPES[t];
    let body;
    if (t === 'deuda') {
        body = `${field('Tipo', `<select id="sh-cat" class="field">${optionsFor('deuda', f.tipo)}</select>`)}
            ${field('Descripción', textInput('sh-descripcion', f.descripcion, cfg.placeholder))}
            <div style="display:flex;gap:10px">
                <div style="flex:1">${field('Pago mensual', numInput('sh-pagoMensual', f.pagoMensual, '2500'))}</div>
                <div style="flex:1">${field('Restante', numInput('sh-total', f.total, '18400'))}</div>
            </div>
            ${field('Monto original', numInput('sh-original', f.original, '30000'), '(para progreso)')}`;
    } else if (t === 'presupuesto') {
        body = `${field('Nombre', textInput('sh-nombre', f.nombre, cfg.placeholder))}
            ${field('Límite', numInput('sh-limite', f.limite, '4000'))}
            ${checkboxRow('sh-mensual', 'Reiniciar cada mes', !!f.mensual)}`;
    } else if (t === 'presupuesto-item') {
        body = `${field('Descripción', textInput('sh-descripcion', f.descripcion, cfg.placeholder))}
            ${field('Cantidad', numInput('sh-cantidad', f.cantidad, '450'))}`;
    } else {
        const checkbox = t === 'ingreso'
            ? checkboxRow('sh-efimero', 'Efímero (se borra al cerrar el mes)', !!f.efimero)
            : checkboxRow('sh-extra', 'Extra (se borra al cerrar el mes)', !!f.extra);
        body = `${field('Categoría', `<select id="sh-cat" class="field">${optionsFor(t, f.cat)}</select>`)}
            ${field('Descripción', textInput('sh-descripcion', f.descripcion, cfg.placeholder))}
            ${field('Cantidad', numInput('sh-cantidad', f.cantidad, '1500'))}
            ${checkbox}`;
    }
    return `<div style="display:flex;flex-direction:column;gap:13px">
        ${body}
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
    const editId = state.editId != null ? state.editId : undefined;
    if (t === 'deuda') {
        const descripcion = document.getElementById('sh-descripcion').value.trim();
        const tipo = document.getElementById('sh-cat').value;
        const pagoMensual = document.getElementById('sh-pagoMensual').value;
        const total = document.getElementById('sh-total').value;
        const original = document.getElementById('sh-original').value;
        if (!descripcion || !pagoMensual || !total) { alert('Completa descripción, pago mensual y restante.'); return; }
        const obj = { tipo, descripcion, pagoMensual: parseFloat(pagoMensual) || 0, total: parseFloat(total) || 0, original: parseFloat(original) || parseFloat(total) || 0 };
        if (state.editId) updateDeuda({ id: state.editId, ...obj });
        else addDeuda(obj);
    } else if (t === 'presupuesto') {
        const nombre = document.getElementById('sh-nombre').value.trim();
        const limite = document.getElementById('sh-limite').value;
        if (!nombre || !limite) { alert('Completa nombre y límite.'); return; }
        savePresupuesto({ id: editId, nombre, limite: parseFloat(limite) || 0, mensual: document.getElementById('sh-mensual').checked });
    } else if (t === 'presupuesto-item') {
        const descripcion = document.getElementById('sh-descripcion').value.trim();
        const cantidad = document.getElementById('sh-cantidad').value;
        if (!descripcion || !cantidad) { alert('Completa descripción y cantidad.'); return; }
        savePresupuestoItem(state.presupuestoId, { id: editId, descripcion, cantidad: parseFloat(cantidad) || 0 });
    } else {
        const categoria = document.getElementById('sh-cat').value;
        const descripcion = document.getElementById('sh-descripcion').value.trim();
        const cantidad = document.getElementById('sh-cantidad').value;
        if (!descripcion || !cantidad) { alert('Completa descripción y cantidad.'); return; }
        const amount = parseFloat(cantidad) || 0;
        if (t === 'ingreso') {
            const obj = { categoria, descripcion, cantidad: amount, efimero: document.getElementById('sh-efimero').checked };
            if (state.editId) updateIngreso({ id: state.editId, ...obj });
            else addIngreso(obj);
        } else {
            saveGasto({ id: editId, extra: document.getElementById('sh-extra').checked, categoria, descripcion, cantidad: amount });
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
