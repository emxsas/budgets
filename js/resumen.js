// Resumen (summary) view: available-this-month hero, category donut
// (conic-gradient, no chart library), income-vs-expense bars, savings rate and
// a pending-debt preview. Reads exclusively from storage.js getters.
import { getIngresos, getGastos, getGastosRecurrentes, getDeudas, getPresupuestos } from './storage.js';
import { fmt, fmt0, sum, esc, icon } from './ui.js';

// Deuda is always red and the folded "Otros" slice is always grey; every other
// category draws from this palette (which deliberately excludes red) by rank.
const DEUDA_COLOR = '#f43f5e';
const OTROS_COLOR = '#8a97a0';
const PALETTE = ['#22d3ee', '#f97316', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f472b6', '#2dd4bf', '#fb923c', '#c084fc'];
const MAX_SLICES = 20;

function debtProgress(d) {
    const total = parseFloat(d.total) || 0;
    const orig = parseFloat(d.original) || total;      // backward compatible: no original -> 0% paid
    const paid = Math.max(0, orig - total);
    const pct = orig ? Math.round(paid / orig * 100) : 0;
    return { total, pct };
}

export function renderResumen() {
    const el = document.getElementById('resumen-section');
    if (!el) return;

    const ingresos = getIngresos(), rec = getGastosRecurrentes(), ext = getGastos(), deudas = getDeudas();
    const presupuestos = getPresupuestos();
    const totIng = sum(ingresos, x => x.cantidad);
    const totRec = sum(rec, x => x.cantidad);
    const totExt = sum(ext, x => x.cantidad);
    const totDeudaMes = sum(deudas, x => x.pagoMensual);
    // Presupuestos count their full limit (the envelope) toward Resumen totals.
    const totPresupLimite = sum(presupuestos, p => p.limite);
    const totPresupGastado = presupuestos.reduce((acc, p) => acc + sum(p.items || [], it => it.cantidad), 0);
    const totGastos = totRec + totExt + totDeudaMes + totPresupLimite;
    const disp = totIng - totGastos;
    const deudaTotal = sum(deudas, x => x.total);
    const dispColor = disp >= 0 ? '#34d399' : '#f43f5e';

    // spending by category (recurrentes + extras + monthly debt + each envelope), top slices
    const catMap = {};
    rec.forEach(x => { catMap[x.categoria] = (catMap[x.categoria] || 0) + (parseFloat(x.cantidad) || 0); });
    ext.forEach(x => { catMap[x.categoria] = (catMap[x.categoria] || 0) + (parseFloat(x.cantidad) || 0); });
    if (totDeudaMes > 0) catMap['Deuda'] = (catMap['Deuda'] || 0) + totDeudaMes;
    presupuestos.forEach(p => { const l = parseFloat(p.limite) || 0; if (l > 0) catMap[p.nombre] = (catMap[p.nombre] || 0) + l; });
    const allCats = Object.keys(catMap)
        .map(k => ({ name: k, amount: catMap[k] }))
        .sort((a, b) => b.amount - a.amount);
    // Show the top MAX_SLICES; fold everything below into a single "Otros" slice
    // so the coloured arc always accounts for 100% of spending.
    const cats = allCats.slice(0, MAX_SLICES);
    const rest = allCats.slice(MAX_SLICES);
    if (rest.length) {
        const restSum = rest.reduce((s, c) => s + c.amount, 0);
        const label = cats.some(c => c.name === 'Otros') ? 'Otras categorías' : 'Otros';
        cats.push({ name: label, amount: restSum, isOtros: true });
    }
    // Deuda -> red, folded slice -> grey, everything else -> palette by rank.
    let pi = 0;
    cats.forEach(c => {
        if (c.name === 'Deuda') c.color = DEUDA_COLOR;
        else if (c.isOtros) c.color = OTROS_COLOR;
        else c.color = PALETTE[pi++ % PALETTE.length];
    });

    // donut: each category as a fraction of income, remainder (unspent) grey
    let acc = 0; const stops = [];
    cats.forEach(c => { const frac = totIng ? c.amount / totIng * 100 : 0; stops.push(`${c.color} ${acc}% ${acc + frac}%`); acc += frac; });
    stops.push(`#2a3237 ${acc}% 100%`);
    const donut = totGastos > 0 ? `conic-gradient(${stops.join(',')})` : '#2a3237';
    const gastadoPct = totIng ? Math.round(totGastos / totIng * 100) : 0;
    const savingsRate = totIng ? Math.round(disp / totIng * 100) : 0;

    // income vs expense bars (relative to the larger of the two)
    const mx = Math.max(totIng, totGastos, 1);
    const ivIng = Math.round(totIng / mx * 100);
    const ivGas = Math.round(totGastos / mx * 100);

    const catLegend = cats.length
        ? cats.map(c => `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#c3cdd2;font-weight:600">
                <span style="width:9px;height:9px;border-radius:3px;flex:none;background:${c.color}"></span>
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span>
                <span class="num" style="margin-left:auto;color:#fff">${fmt0(c.amount)}</span>
            </div>`).join('')
        : `<div style="font-size:12px;color:#5f6d73">Aún no hay gastos registrados.</div>`;

    const debtCards = deudas.length
        ? deudas.map(d => {
            const p = debtProgress(d);
            return `<div style="background:#161a1d;border-radius:16px;padding:15px;border:1px solid #21282c">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:11px">
                    <div style="min-width:0">
                        <div style="font-size:14px;font-weight:700">${esc(d.descripcion)}</div>
                        <div style="display:inline-block;font-size:10px;font-weight:700;color:#f9a35b;background:#2a1e12;padding:2px 8px;border-radius:99px;margin-top:5px">${esc(d.tipo)}</div>
                    </div>
                    <div style="text-align:right;flex:none">
                        <div class="num" style="font-size:15px;font-weight:700">${fmt0(p.total)}</div>
                        <div class="num" style="font-size:10.5px;color:#7c8a92;font-weight:600">${fmt0(d.pagoMensual)}/mes</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:9px">
                    <div style="flex:1" class="bar-track"><div style="width:${p.pct}%;height:100%;border-radius:99px;background:linear-gradient(90deg,#34d399,#22d3ee)"></div></div>
                    <span class="num" style="font-size:10.5px;font-weight:700;color:#34d399">${p.pct}%</span>
                </div>
            </div>`;
        }).join('')
        : `<div style="font-size:12px;color:#5f6d73">Sin deudas registradas.</div>`;

    // Entry card into the Presupuestos section (also the mobile access point).
    const presupCard = presupuestos.length ? `
        <div data-tab="presupuestos" style="background:#161a1d;border:1px solid #21282c;border-radius:18px;padding:15px 16px;cursor:pointer">
            <div style="display:flex;align-items:center;gap:12px">
                <span style="width:36px;height:36px;border-radius:11px;background:#1e1a2e;color:#a78bfa;display:flex;align-items:center;justify-content:center;flex:none">${icon('presupuestos', { size: 19, sw: 1.9 })}</span>
                <div style="flex:1;min-width:0">
                    <div style="font-size:14px;font-weight:700">Presupuestos</div>
                    <div class="num" style="font-size:11.5px;color:#7c8a92;font-weight:600">Gastado ${fmt0(totPresupGastado)} de ${fmt0(totPresupLimite)}</div>
                </div>
                <span style="color:#5f6d73;flex:none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>
            </div>
        </div>` : '';

    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:18px">
        <div>
            <div class="num" style="font-size:13px;font-weight:600;color:#7c8a92">Disponible este mes</div>
            <div class="num" style="font-size:52px;font-weight:700;letter-spacing:-2.5px;line-height:1.05;margin-top:2px;color:${dispColor}">${fmt(disp)}</div>
            <div style="display:flex;gap:18px;margin-top:4px">
                <span style="font-size:12.5px;color:#9aa7ad;font-weight:600">▲ Ingresos <b class="num" style="color:#e7edf0">${fmt0(totIng)}</b></span>
                <span style="font-size:12.5px;color:#9aa7ad;font-weight:600">▼ Gastos <b class="num" style="color:#e7edf0">${fmt0(totGastos)}</b></span>
            </div>
        </div>

        <div class="card" style="padding:16px 18px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
                <span style="font-size:13.5px;font-weight:700">Ingresos vs Gastos</span>
                <span class="num" style="font-size:12px;font-weight:700;color:${dispColor}">${savingsRate}% ahorro</span>
            </div>
            <div style="display:flex;height:14px;border-radius:8px;overflow:hidden;background:#0e1113">
                <div style="width:${ivIng}%;background:linear-gradient(90deg,#34d399,#22d3ee);border-radius:8px"></div>
            </div>
            <div style="display:flex;height:14px;border-radius:8px;overflow:hidden;background:#0e1113;margin-top:7px">
                <div style="width:${ivGas}%;background:linear-gradient(90deg,#f43f5e,#f97316);border-radius:8px"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:9px;font-size:11px;font-weight:600;color:#7c8a92">
                <span>Ingresos <b class="num" style="color:#34d399">${fmt0(totIng)}</b></span>
                <span>Gastos <b class="num" style="color:#f43f5e">${fmt0(totGastos)}</b></span>
            </div>
        </div>

        <div class="card" style="border-radius:22px;padding:20px">
            <div style="display:flex;align-items:center;gap:20px">
                <div style="width:104px;height:104px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:${donut}">
                    <div style="width:66px;height:66px;border-radius:50%;background:#161a1d;display:flex;flex-direction:column;align-items:center;justify-content:center">
                        <span style="font-size:9.5px;color:#7c8a92;font-weight:600">gastado</span>
                        <span class="num" style="font-size:16px;color:#fff;font-weight:700">${gastadoPct}%</span>
                    </div>
                </div>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:9px">${catLegend}</div>
            </div>
        </div>

        ${presupCard}

        <div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin:2px 2px 12px">
                <span style="font-size:15px;font-weight:700">Deuda pendiente</span>
                <span class="num" style="font-size:14px;font-weight:700;color:#f43f5e">${fmt0(deudaTotal)}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:11px">${debtCards}</div>
        </div>
    </div>`;
}
