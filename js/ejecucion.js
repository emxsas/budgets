// Ejecución (execution) view. The underlying flow is unchanged and still wired
// to the existing storage.js primitives (applied incomes + executed payments +
// bulk execute); only the presentation is reworked to the new design.
import {
    getIngresos, getGastos, getGastosRecurrentes, getDeudas, getPresupuestos,
    getIngresoCategories, getGastoCategories, getDeudaCategories,
    getExecutedPayments, addExecutedPayments, removeExecutedPayment,
    getAppliedIncomes, addAppliedIncome, removeAppliedIncome
} from './storage.js';
import { fmt, fmt0, sum, esc, icon } from './ui.js';

let selectedIds = [];
// Current "Proyectar categoría" choice (transient, like the selection).
let projection = '';

function allPayments() {
    return [
        ...getGastos().map(g => ({ id: g.id, desc: g.descripcion, amount: parseFloat(g.cantidad) || 0, source: g.categoria, sourceType: 'Gasto extra', color: '#f43f5e' })),
        ...getGastosRecurrentes().map(g => ({ id: g.id, desc: g.descripcion, amount: parseFloat(g.cantidad) || 0, source: g.categoria, sourceType: 'Recurrente', color: '#22d3ee' })),
        ...getDeudas().map(d => ({ id: d.id, desc: d.descripcion, amount: parseFloat(d.pagoMensual) || 0, source: d.tipo, sourceType: 'Deuda', color: '#f97316' })),
        // Presupuestos count what has actually been spent (sum of line-items); shown only when > 0.
        ...getPresupuestos()
            .map(p => ({ id: p.id, desc: p.nombre, amount: sum(p.items || [], it => it.cantidad), source: 'Presupuesto', sourceType: 'Presupuesto', color: '#a78bfa' }))
            .filter(p => p.amount > 0)
    ];
}

// Union of the configured categories and any still used by an entry (an item
// may keep a category that was later deleted in Ajustes).
function catsWithUsed(configured, used) {
    const out = [...configured];
    used.forEach(c => { if (c && !out.includes(c)) out.push(c); });
    return out;
}

// Options for the "Proyectar categoría" picker: whole groups first, then each
// individual category. Value format: "<kind>:<category>" or "all:<group>".
function projectionOptions() {
    const gastoCats = catsWithUsed(getGastoCategories(), [...getGastos(), ...getGastosRecurrentes()].map(g => g.categoria));
    const deudaCats = catsWithUsed(getDeudaCategories(), getDeudas().map(d => d.tipo));
    const ingresoCats = catsWithUsed(getIngresoCategories(), getIngresos().map(i => i.categoria));
    return [
        { label: 'Grupos', opts: [
            ['all:pagos', 'Todos los pagos'],
            ['all:gastos', 'Todos los gastos (fijos + extra)'],
            ['all:rec', 'Gastos fijos (recurrentes)'],
            ['all:extra', 'Gastos efímeros (extra)'],
            ['all:deuda', 'Toda la deuda'],
            ['all:presupuestos', 'Presupuestos'],
            ['all:ingresos', 'Todos los ingresos']
        ] },
        { label: 'Gastos', opts: gastoCats.map(c => ['gasto:' + c, c]) },
        { label: 'Deuda', opts: deudaCats.map(c => ['deuda:' + c, c]) },
        { label: 'Ingresos', opts: ingresoCats.map(c => ['ingreso:' + c, c]) }
    ].filter(g => g.opts.length);
}

// Resolve a projection key to its matching entries. Payments use the same
// shape as allPayments(); incomes are flagged so the card labels change.
function projectionItems(key, payments) {
    const i = key.indexOf(':');
    const kind = key.slice(0, i), val = key.slice(i + 1);
    if (kind === 'ingreso' || key === 'all:ingresos') {
        const items = getIngresos()
            .filter(x => key === 'all:ingresos' || x.categoria === val)
            .map(x => ({ id: x.id, desc: x.descripcion, amount: parseFloat(x.cantidad) || 0, source: x.categoria }));
        return { income: true, items };
    }
    const isGasto = p => p.sourceType === 'Gasto extra' || p.sourceType === 'Recurrente';
    const match = {
        'all:pagos': () => true,
        'all:gastos': isGasto,
        'all:rec': p => p.sourceType === 'Recurrente',
        'all:extra': p => p.sourceType === 'Gasto extra',
        'all:deuda': p => p.sourceType === 'Deuda',
        'all:presupuestos': p => p.sourceType === 'Presupuesto'
    }[key] || (kind === 'gasto' ? p => isGasto(p) && p.source === val
        : kind === 'deuda' ? p => p.sourceType === 'Deuda' && p.source === val
        : () => false);
    return { income: false, items: payments.filter(match) };
}

function projectionCard(payments, executed, applied) {
    const groups = projectionOptions();
    const valid = groups.some(g => g.opts.some(([v]) => v === projection));
    if (!valid) projection = '';

    const options = `<option value=""${projection ? '' : ' selected'}>Elige una categoría o grupo…</option>` +
        groups.map(g => `<optgroup label="${esc(g.label)}">${g.opts.map(([v, l]) =>
            `<option value="${esc(v)}"${v === projection ? ' selected' : ''}>${esc(l)}</option>`).join('')}</optgroup>`).join('');

    let result = '';
    if (projection) {
        const { income, items } = projectionItems(projection, payments);
        const done = income ? applied : executed;
        const total = sum(items, x => x.amount);
        const pendItems = items.filter(x => !done.includes(x.id));
        const pend = sum(pendItems, x => x.amount);
        const accent = income ? '#34d399' : '#fff';
        const rows = items.length
            ? items.map(x => {
                const d = done.includes(x.id);
                return `<div style="display:flex;align-items:center;gap:10px;padding:7px 2px;border-top:1px solid #21282c">
                    <div style="flex:1;min-width:0;font-size:12.5px;font-weight:600;${d ? 'text-decoration:line-through;color:#7c8a92' : ''}">${esc(x.desc)}<span style="font-size:10.5px;color:#7c8a92;font-weight:600"> · ${esc(x.source)}</span></div>
                    <span class="num" style="font-size:12.5px;font-weight:700;color:${d ? '#7c8a92' : '#c3cdd2'}">${fmt0(x.amount)}</span>
                </div>`;
            }).join('')
            : `<div style="font-size:12px;color:#5f6d73;padding:6px 2px">No hay movimientos en esta categoría.</div>`;
        const unselected = income ? [] : pendItems.filter(x => !selectedIds.includes(x.id));
        const selectBtn = unselected.length
            ? `<button data-action="select-projection" style="width:100%;margin-top:10px;background:#1c3a2e;border:1px solid #2a5544;color:#34d399;font-weight:700;padding:10px;border-radius:11px;cursor:pointer">Seleccionar pendientes (${unselected.length})</button>`
            : '';
        result = `<div style="text-align:center;margin-top:14px">
                <div class="num" style="font-size:34px;font-weight:700;letter-spacing:-1px;color:${accent}">${fmt(total)}</div>
                <div style="font-size:11.5px;color:#7c8a92;font-weight:600">${items.length} ${items.length === 1 ? 'movimiento' : 'movimientos'}</div>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px">
                <div style="flex:1;background:#161a1d;border:1px solid #21282c;border-radius:11px;padding:8px 10px">
                    <div style="font-size:10.5px;color:#7c8a92;font-weight:700">${income ? 'Por aplicar' : 'Pendiente'}</div>
                    <div class="num" style="font-size:15px;font-weight:700;color:#fbbf24">${fmt0(pend)}</div>
                </div>
                <div style="flex:1;background:#161a1d;border:1px solid #21282c;border-radius:11px;padding:8px 10px">
                    <div style="font-size:10.5px;color:#7c8a92;font-weight:700">${income ? 'Aplicado' : 'Ejecutado'}</div>
                    <div class="num" style="font-size:15px;font-weight:700;color:#34d399">${fmt0(total - pend)}</div>
                </div>
            </div>
            ${selectBtn}
            <div style="margin-top:10px">${rows}</div>`;
    }

    return `<div class="card" style="border-radius:20px">
        <div style="font-size:13.5px;font-weight:700;margin:0 2px 10px;color:#c3cdd2">Proyectar categoría</div>
        <select id="ej-projection" class="field">${options}</select>
        ${result}
    </div>`;
}

export function renderEjecucion() {
    const el = document.getElementById('ejecucion-section');
    if (!el) return;

    const ingresos = getIngresos();
    const applied = getAppliedIncomes();
    const executed = getExecutedPayments();
    const payments = allPayments();

    const totApplied = sum(ingresos.filter(i => applied.includes(i.id)), i => i.cantidad);
    const totExecuted = sum(payments.filter(p => executed.includes(p.id)), p => p.amount);
    const totSel = sum(payments.filter(p => selectedIds.includes(p.id)), p => p.amount);
    const restante = totApplied - totExecuted - totSel;

    const incomeRows = ingresos.length
        ? ingresos.map(i => {
            const ap = applied.includes(i.id);
            const btn = `flex:none;border:none;border-radius:9px;padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer;${ap ? 'background:#3a2e12;color:#fbbf24' : 'background:#1c3a2e;color:#34d399'}`;
            return `<div style="display:flex;align-items:center;gap:12px;background:${ap ? '#12291f' : '#161a1d'};border:1px solid ${ap ? '#2a5544' : '#21282c'};border-radius:13px;padding:12px 14px">
                <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:600">${esc(i.descripcion)}</div><div style="font-size:11px;color:#7c8a92;font-weight:600">${esc(i.categoria)}</div></div>
                <span class="num" style="font-size:14px;font-weight:700;color:#34d399">${fmt0(i.cantidad)}</span>
                <button data-action="toggle-income" data-id="${i.id}" style="${btn}">${ap ? 'Quitar' : 'Aplicar'}</button>
            </div>`;
        }).join('')
        : `<div style="font-size:12px;color:#5f6d73;padding:4px 2px">Sin ingresos para aplicar.</div>`;

    const paymentRows = payments.length
        ? payments.map(p => {
            const ex = executed.includes(p.id);
            const se = selectedIds.includes(p.id);
            const checked = ex || se;
            const rowBg = ex ? '#12291f' : se ? '#1a2f28' : '#161a1d';
            const rowBorder = ex ? '#2a5544' : se ? '#34d399' : '#21282c';
            const check = checked ? icon('check', { size: 13, sw: 3.2 }) : '';
            return `<div ${ex ? '' : `data-action="tap-payment" data-id="${p.id}"`} style="display:flex;align-items:center;gap:11px;border-radius:13px;padding:12px 14px;transition:all .12s;background:${rowBg};border:1px solid ${rowBorder};cursor:${ex ? 'default' : 'pointer'}">
                <div style="width:22px;height:22px;border-radius:7px;flex:none;display:flex;align-items:center;justify-content:center;border:1.5px solid ${checked ? '#34d399' : '#3a444a'};background:${checked ? '#34d399' : 'transparent'};color:#06231a">${check}</div>
                <div style="flex:1;min-width:0">
                    <div style="font-size:13.5px;font-weight:600;${ex ? 'text-decoration:line-through;color:#7c8a92' : ''}">${esc(p.desc)}</div>
                    <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
                        <span style="width:7px;height:7px;border-radius:2px;flex:none;background:${p.color}"></span>
                        <span style="font-size:10.5px;font-weight:700;color:${p.color}">${esc(p.source)}</span>
                        <span style="font-size:9.5px;font-weight:600;color:#7c8a92;background:#0e1113;padding:1px 6px;border-radius:99px">${p.sourceType}</span>
                    </div>
                </div>
                <span class="num" style="font-size:14px;font-weight:700;flex:none;${ex ? 'color:#7c8a92' : 'color:#fff'}">${fmt0(p.amount)}</span>
                ${ex ? `<button data-action="undo" data-id="${p.id}" style="flex:none;background:#3a2e12;border:1px solid #4a3a18;color:#fbbf24;font-size:11px;font-weight:700;padding:5px 9px;border-radius:8px;cursor:pointer">Deshacer</button>` : ''}
            </div>`;
        }).join('')
        : `<div style="font-size:12px;color:#5f6d73;padding:4px 2px">Sin pagos por realizar.</div>`;

    const bulk = selectedIds.length
        ? `<div style="margin-bottom:4px;padding:2px 0 0;display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;gap:8px">
                    <button data-bulk="execute" style="flex:1;background:#1c3a2e;border:1px solid #2a5544;color:#34d399;font-weight:700;padding:11px;border-radius:11px;cursor:pointer">Ejecutar (${selectedIds.length})</button>
                    <button data-bulk="cancel" style="flex:1;background:#1c2226;border:1px solid #2a3237;color:#9aa7ad;font-weight:700;padding:11px;border-radius:11px;cursor:pointer">Cancelar</button>
                </div>
                <p class="num" style="text-align:center;font-weight:700;color:#c3cdd2;margin:0">Total seleccionado: ${fmt0(totSel)}</p>
           </div>`
        : '';

    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:16px">
        <div class="card" style="border-radius:20px;padding:20px;text-align:center">
            <div style="font-size:12.5px;font-weight:600;color:#7c8a92">Monto restante por aplicar</div>
            <div class="num" style="font-size:44px;font-weight:700;letter-spacing:-1.5px;margin-top:2px;color:${restante >= 0 ? '#34d399' : '#f43f5e'}">${fmt(restante)}</div>
            <div style="font-size:11.5px;color:#7c8a92;font-weight:600">Ingresos aplicados − pagos ejecutados</div>
        </div>
        ${projectionCard(payments, executed, applied)}
        <div>
            <div style="font-size:13.5px;font-weight:700;margin:0 2px 10px;color:#c3cdd2">Ingresos a aplicar</div>
            <div style="display:flex;flex-direction:column;gap:8px">${incomeRows}</div>
        </div>
        <div>
            <div style="font-size:13.5px;font-weight:700;margin:0 2px 10px;color:#c3cdd2">Pagos a realizar <span style="color:#7c8a92;font-weight:600;font-size:12px">· toca para seleccionar</span></div>
            ${bulk}
            <div style="display:flex;flex-direction:column;gap:8px">${paymentRows}</div>
        </div>
    </div>`;
}

export function initEjecucion() {
    const el = document.getElementById('ejecucion-section');
    el.addEventListener('change', (e) => {
        if (e.target.id !== 'ej-projection') return;
        projection = e.target.value;
        renderEjecucion();
    });
    el.addEventListener('click', (e) => {
        const bulk = e.target.closest('[data-bulk]');
        if (bulk) {
            if (bulk.dataset.bulk === 'execute') { addExecutedPayments(selectedIds); selectedIds = []; }
            else { selectedIds = []; }
            renderEjecucion();
            return;
        }
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = parseInt(btn.dataset.id, 10);
        switch (btn.dataset.action) {
            case 'toggle-income': {
                if (getAppliedIncomes().includes(id)) removeAppliedIncome(id);
                else addAppliedIncome(id);
                renderEjecucion();
                break;
            }
            case 'tap-payment': {
                selectedIds = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : selectedIds.concat(id);
                renderEjecucion();
                break;
            }
            case 'select-projection': {
                const executed = getExecutedPayments();
                const { items } = projectionItems(projection, allPayments());
                items.forEach(p => { if (!executed.includes(p.id) && !selectedIds.includes(p.id)) selectedIds.push(p.id); });
                renderEjecucion();
                break;
            }
            case 'undo': {
                removeExecutedPayment(id);
                renderEjecucion();
                break;
            }
        }
    });
}

// Clear any transient selection when arriving at the tab.
export function resetEjecucionSelection() { selectedIds = []; }
