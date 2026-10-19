// Ejecución (execution) view. The underlying flow is unchanged and still wired
// to the existing storage.js primitives (applied incomes + executed payments +
// bulk execute); only the presentation is reworked to the new design.
import {
    getIngresos, getGastos, getGastosRecurrentes, getDeudas, getPresupuestos,
    getIngresoCategories, getGastoCategories, getDeudaCategories, pagoDelMes, getState,
    getExecutedPayments, addExecutedPayments, removeExecutedPayment,
    getAppliedIncomes, addAppliedIncome, removeAppliedIncome
} from './storage.js';
import { fmt, fmt0, sum, esc, icon } from './ui.js';

let selectedIds = [];
// Current "Proyectar categoría" choice (transient, like the selection).
let projection = '';
let projExpanded = false;
const PROJ_LIMIT = 6;

function allPayments() {
    return [
        ...getGastos().map(g => ({ id: g.id, desc: g.descripcion, amount: parseFloat(g.cantidad) || 0, source: g.categoria, sourceType: 'Gasto extra', color: '#f43f5e' })),
        ...getGastosRecurrentes().map(g => ({ id: g.id, desc: g.descripcion, amount: parseFloat(g.cantidad) || 0, source: g.categoria, sourceType: 'Recurrente', color: '#22d3ee' })),
        // Auto debts pay min(pago, restante); once paid off they drop out (unless executed this month).
        ...(() => {
            const { deudaAbonos, executedPayments } = getState();
            return getDeudas()
                .map(d => ({ id: d.id, desc: d.descripcion, amount: pagoDelMes(d, deudaAbonos), source: d.tipo, sourceType: 'Deuda', color: '#f97316', auto: d.modo === 'auto' }))
                .filter(p => !p.auto || p.amount > 0 || executedPayments.includes(p.id));
        })(),
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

// Quick-pick groups for the "Proyectar categoría" card: [key, chip label,
// full label, dot color]. Mixed groups get a gradient dot.
const PROJ_GROUPS = [
    ['all:pagos', 'Todos los pagos', 'Todos los pagos', 'conic-gradient(#22d3ee 0 25%,#f43f5e 0 50%,#f97316 0 75%,#a78bfa 0)'],
    ['all:gastos', 'Gastos', 'Todos los gastos (fijos + extra)', 'linear-gradient(135deg,#22d3ee 50%,#f43f5e 50%)'],
    ['all:rec', 'Fijos', 'Gastos fijos (recurrentes)', '#22d3ee'],
    ['all:extra', 'Extra', 'Gastos extra', '#f43f5e'],
    ['all:deuda', 'Deuda', 'Toda la deuda', '#f97316'],
    ['all:presupuestos', 'Presupuestos', 'Presupuestos', '#a78bfa'],
    ['all:ingresos', 'Ingresos', 'Todos los ingresos', '#34d399']
];
// Accent per individual-category kind (gasto mixes fijo/extra → coral).
const PROJ_KIND_COLOR = { gasto: '#f43f5e', deuda: '#f97316', ingreso: '#34d399' };

// Individual categories for the picker select. Value format: "<kind>:<category>".
function projectionOptions() {
    const gastoCats = catsWithUsed(getGastoCategories(), [...getGastos(), ...getGastosRecurrentes()].map(g => g.categoria));
    const deudaCats = catsWithUsed(getDeudaCategories(), getDeudas().map(d => d.tipo));
    const ingresoCats = catsWithUsed(getIngresoCategories(), getIngresos().map(i => i.categoria));
    return [
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
    const group = PROJ_GROUPS.find(g => g[0] === projection);
    const isCat = groups.some(g => g.opts.some(([v]) => v === projection));
    if (!group && !isCat) projection = '';
    const kind = projection.slice(0, projection.indexOf(':'));
    const catColor = isCat ? PROJ_KIND_COLOR[kind] : '';

    // Group chips: horizontally scrollable, bleeding to the card edges.
    const chips = PROJ_GROUPS.map(([v, short, , dot]) => {
        const on = v === projection;
        const solid = dot.startsWith('#');
        return `<button data-proj="${v}" style="flex:none;display:flex;align-items:center;gap:7px;padding:7px 12px 7px 10px;border-radius:99px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .12s;${on
            ? `background:${solid ? dot + '22' : '#1f272b'};border:1px solid ${solid ? dot : '#c3cdd2'};color:#fff`
            : 'background:#0e1113;border:1px solid #2a3237;color:#9aa7ad'}">
            <span style="width:8px;height:8px;border-radius:50%;flex:none;background:${dot}"></span>${short}</button>`;
    }).join('');

    const options = `<option value=""${isCat ? '' : ' selected'}>Por categoría…</option>` +
        groups.map(g => `<optgroup label="${esc(g.label)}">${g.opts.map(([v, l]) =>
            `<option value="${esc(v)}"${v === projection ? ' selected' : ''}>${esc(l)}</option>`).join('')}</optgroup>`).join('');
    const picker = `<div style="position:relative;margin-top:10px">
        <span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;pointer-events:none;background:${catColor || '#3a444a'}"></span>
        <select id="ej-projection" class="field" style="padding:10px 12px 10px 30px;font-size:13.5px;font-weight:600;${isCat ? `border-color:${catColor};color:#fff` : 'color:#9aa7ad'}">${options}</select>
    </div>`;

    const head = `<div style="display:flex;align-items:center;justify-content:space-between;min-height:20px;margin:0 2px 10px">
        <div style="font-size:13.5px;font-weight:700;color:#c3cdd2">Proyectar categoría</div>
        ${projection ? `<button data-action="proj-clear" style="background:transparent;border:none;color:#7c8a92;font-size:11.5px;font-weight:700;cursor:pointer;padding:2px 0">Limpiar</button>` : ''}
    </div>`;
    const chipRow = `<div class="hscroll chip-row" id="ej-proj-chips" style="display:flex;gap:7px;overflow-x:auto;margin:0 -16px;padding:0 16px 2px;scroll-padding:0 16px">${chips}</div>`;

    let result = '';
    if (!projection) {
        result = `<div style="display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 12px;border:1px dashed #2a3237;border-radius:12px;font-size:11.5px;color:#7c8a92;font-weight:600;line-height:1.4">
            <span style="flex:none;color:#34d399;display:flex">${icon('ejecucion', { size: 16, sw: 2 })}</span>
            Elige un grupo o categoría para ver cuánto suma, cuánto falta y seleccionar sus pagos de un toque.
        </div>`;
    } else {
        const { income, items } = projectionItems(projection, payments);
        const done = income ? applied : executed;
        const accent = group ? (group[3].startsWith('#') ? group[3] : '#fff') : catColor;
        const label = group ? group[2] : groups.flatMap(g => g.opts).find(([v]) => v === projection)[1];
        const total = sum(items, x => x.amount);
        const pendItems = items.filter(x => !done.includes(x.id));
        const pend = sum(pendItems, x => x.amount);
        const pct = total ? Math.round((total - pend) / total * 100) : 0;
        // Pending first, executed/applied last (stable within each block).
        const ordered = [...pendItems, ...items.filter(x => done.includes(x.id))];
        const shown = projExpanded ? ordered : ordered.slice(0, PROJ_LIMIT);
        const rows = items.length
            ? shown.map(x => {
                const d = done.includes(x.id);
                const sel = !d && !income && selectedIds.includes(x.id);
                const color = income ? '#34d399' : x.color;
                const tag = income ? 'Ingreso' : x.sourceType;
                // Payments mirror the "Pagos a realizar" checkbox (tap toggles the
                // selection); incomes get a round, non-interactive marker.
                const r = income ? '50%' : '6px';
                const mark = d
                    ? `<span style="flex:none;width:18px;height:18px;border-radius:${r};background:#1c3a2e;color:#34d399;display:flex;align-items:center;justify-content:center">${icon('check', { size: 11, sw: 3.2 })}</span>`
                    : sel ? `<span style="flex:none;width:18px;height:18px;border-radius:${r};background:#34d399;color:#06231a;display:flex;align-items:center;justify-content:center">${icon('check', { size: 11, sw: 3.2 })}</span>`
                    : `<span style="flex:none;width:18px;height:18px;border-radius:${r};border:1.5px solid #3a444a"></span>`;
                const tap = !d && !income ? `data-action="tap-payment" data-id="${x.id}" ` : '';
                return `<div ${tap}style="display:flex;align-items:center;gap:10px;padding:9px 2px;border-top:1px solid #21282c;${d ? 'opacity:.55' : ''}${tap ? 'cursor:pointer' : ''}">
                    ${mark}
                    <div style="flex:1;min-width:0">
                        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${d ? 'text-decoration:line-through;color:#7c8a92' : ''}">${esc(x.desc)}</div>
                        <div style="display:flex;align-items:center;gap:6px;margin-top:2px;min-width:0">
                            <span style="width:7px;height:7px;border-radius:2px;flex:none;background:${color}"></span>
                            <span style="font-size:10.5px;font-weight:700;color:${color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.source)}</span>
                            <span style="flex:none;font-size:9.5px;font-weight:600;color:#7c8a92;background:#0e1113;padding:1px 6px;border-radius:99px">${tag}</span>
                        </div>
                    </div>
                    <span class="num" style="flex:none;font-size:13.5px;font-weight:700;color:${d ? '#7c8a92' : '#fff'}">${fmt0(x.amount)}</span>
                </div>`;
            }).join('')
            : `<div style="font-size:12px;color:#5f6d73;padding:10px 2px;border-top:1px solid #21282c;text-align:center">No hay movimientos en esta categoría.</div>`;
        const more = ordered.length > PROJ_LIMIT
            ? `<button data-action="proj-more" style="width:100%;background:transparent;border:none;border-top:1px solid #21282c;color:#9aa7ad;font-size:12px;font-weight:700;padding:10px 0 2px;cursor:pointer">${projExpanded ? 'Ver menos' : `Ver todos (${ordered.length})`}</button>`
            : '';
        const unselected = income ? [] : pendItems.filter(x => !selectedIds.includes(x.id));
        const selectBtn = unselected.length
            ? `<button data-action="select-projection" style="width:100%;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;background:#1c3a2e;border:1px solid #2a5544;color:#34d399;font-weight:700;font-size:13.5px;padding:11px;border-radius:12px;cursor:pointer">${icon('check', { size: 15, sw: 2.6 })}Seleccionar pendientes (${unselected.length})</button>`
            : !income && pendItems.length
                ? `<div style="margin-top:12px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:700;color:#34d399">${icon('check', { size: 14, sw: 2.6 })}Pendientes seleccionados</div>`
                : '';
        result = `<div style="margin-top:14px;background:#12171a;border:1px solid #21282c;border-radius:16px;padding:14px">
                <div style="display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:700;color:#9aa7ad;min-width:0">
                    <span style="width:8px;height:8px;border-radius:50%;flex:none;background:${group ? group[3] : catColor}"></span>
                    <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(label)}</span>
                    <span style="margin-left:auto;flex:none;color:#7c8a92">${items.length} ${items.length === 1 ? 'movimiento' : 'movimientos'}</span>
                </div>
                <div class="num" style="font-size:34px;font-weight:700;letter-spacing:-1.2px;margin-top:4px;color:${income ? '#34d399' : '#fff'}">${fmt(total)}</div>
                <div style="display:flex;align-items:center;gap:9px;margin-top:8px">
                    <div style="flex:1" class="bar-track"><div style="width:${pct}%;height:100%;border-radius:99px;background:linear-gradient(90deg,#34d399,#22d3ee)"></div></div>
                    <span class="num" style="flex:none;font-size:10.5px;font-weight:700;color:#34d399">${pct}% ${income ? 'aplicado' : 'ejecutado'}</span>
                </div>
                <div style="display:flex;gap:8px;margin-top:12px">
                    <div style="flex:1;min-width:0;background:#161a1d;border:1px solid #21282c;border-radius:11px;padding:8px 10px">
                        <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;color:#7c8a92;font-weight:700"><span style="width:6px;height:6px;border-radius:50%;background:#fbbf24"></span>${income ? 'Por aplicar' : 'Pendiente'}</div>
                        <div class="num" style="font-size:16px;font-weight:700;color:#fbbf24;margin-top:1px">${fmt0(pend)}</div>
                    </div>
                    <div style="flex:1;min-width:0;background:#161a1d;border:1px solid #21282c;border-radius:11px;padding:8px 10px">
                        <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;color:#7c8a92;font-weight:700"><span style="width:6px;height:6px;border-radius:50%;background:#34d399"></span>${income ? 'Aplicado' : 'Ejecutado'}</div>
                        <div class="num" style="font-size:16px;font-weight:700;color:#34d399;margin-top:1px">${fmt0(total - pend)}</div>
                    </div>
                </div>
                ${selectBtn}
            </div>
            <div style="margin-top:10px">${rows}${more}</div>`;
    }

    return `<div class="card" data-tour="ej-proj" style="border-radius:20px">${head}${chipRow}${picker}${result}</div>`;
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

    const chipScroll = document.getElementById('ej-proj-chips')?.scrollLeft || 0;
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:16px">
        <div class="card" data-tour="ej-restante" style="border-radius:20px;padding:20px;text-align:center">
            <div style="font-size:12.5px;font-weight:600;color:#7c8a92">Monto restante por aplicar</div>
            <div class="num" style="font-size:44px;font-weight:700;letter-spacing:-1.5px;margin-top:2px;color:${restante >= 0 ? '#34d399' : '#f43f5e'}">${fmt(restante)}</div>
            <div style="font-size:11.5px;color:#7c8a92;font-weight:600">Ingresos aplicados − pagos ejecutados</div>
        </div>
        ${projectionCard(payments, executed, applied)}
        <div data-tour="ej-ingresos">
            <div style="font-size:13.5px;font-weight:700;margin:0 2px 10px;color:#c3cdd2">Ingresos a aplicar</div>
            <div style="display:flex;flex-direction:column;gap:8px">${incomeRows}</div>
        </div>
        <div data-tour="ej-pagos">
            <div style="font-size:13.5px;font-weight:700;margin:0 2px 10px;color:#c3cdd2">Pagos a realizar <span style="color:#7c8a92;font-weight:600;font-size:12px">· toca para seleccionar</span></div>
            ${bulk}
            <div style="display:flex;flex-direction:column;gap:8px">${paymentRows}</div>
        </div>
    </div>`;
    const chips = document.getElementById('ej-proj-chips');
    if (chips) chips.scrollLeft = chipScroll;
}

export function initEjecucion() {
    const el = document.getElementById('ejecucion-section');
    el.addEventListener('change', (e) => {
        if (e.target.id !== 'ej-projection') return;
        projection = e.target.value;
        projExpanded = false;
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
        // Group chips toggle: tapping the active chip clears the projection.
        const chip = e.target.closest('[data-proj]');
        if (chip) {
            projection = projection === chip.dataset.proj ? '' : chip.dataset.proj;
            projExpanded = false;
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
            case 'proj-more': {
                projExpanded = !projExpanded;
                renderEjecucion();
                break;
            }
            case 'proj-clear': {
                projection = '';
                projExpanded = false;
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
