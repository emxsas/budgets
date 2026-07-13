// Ejecución (execution) view. The underlying flow is unchanged and still wired
// to the existing storage.js primitives (applied incomes + executed payments +
// bulk execute); only the presentation is reworked to the new design.
import {
    getIngresos, getGastos, getGastosRecurrentes, getDeudas,
    getExecutedPayments, addExecutedPayments, removeExecutedPayment,
    getAppliedIncomes, addAppliedIncome, removeAppliedIncome
} from './storage.js';
import { fmt, fmt0, sum, esc, icon } from './ui.js';

let selectedIds = [];

function allPayments() {
    return [
        ...getGastos().map(g => ({ id: g.id, desc: g.descripcion, amount: parseFloat(g.cantidad) || 0, source: g.categoria, sourceType: 'Gasto extra', color: '#f43f5e' })),
        ...getGastosRecurrentes().map(g => ({ id: g.id, desc: g.descripcion, amount: parseFloat(g.cantidad) || 0, source: g.categoria, sourceType: 'Recurrente', color: '#22d3ee' })),
        ...getDeudas().map(d => ({ id: d.id, desc: d.descripcion, amount: parseFloat(d.pagoMensual) || 0, source: d.tipo, sourceType: 'Deuda', color: '#f97316' }))
    ];
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
