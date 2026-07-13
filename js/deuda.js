// Deuda (debt) view: total-pending hero plus per-debt cards with a paid-off
// progress bar. Progress uses the optional `original` field with a safe
// fallback so pre-existing debts (no `original`) simply show 0% paid.
import { getDeudas, deleteDeuda } from './storage.js';
import { fmt0, sum, esc, icon } from './ui.js';
import { openAdd, openEdit } from './sheet.js';

function progress(d) {
    const total = parseFloat(d.total) || 0;
    const orig = parseFloat(d.original) || total;
    const paid = Math.max(0, orig - total);
    const pct = orig ? Math.round(paid / orig * 100) : 0;
    return { total, pct };
}

export function renderDeuda() {
    const el = document.getElementById('deuda-section');
    if (!el) return;

    const deudas = getDeudas();
    const deudaTotal = sum(deudas, x => x.total);
    const deudaMes = sum(deudas, x => x.pagoMensual);
    const deudaOrig = sum(deudas, x => (parseFloat(x.original) || parseFloat(x.total) || 0));
    const paidPct = deudaOrig ? Math.round((deudaOrig - deudaTotal) / deudaOrig * 100) : 0;

    const cards = deudas.length
        ? deudas.map(d => {
            const p = progress(d);
            return `<div style="background:#161a1d;border-radius:16px;padding:15px;border:1px solid #21282c">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:11px">
                    <div style="min-width:0">
                        <div style="font-size:15px;font-weight:700">${esc(d.descripcion)}</div>
                        <div style="display:inline-block;font-size:10px;font-weight:700;color:#f9a35b;background:#2a1e12;padding:2px 8px;border-radius:99px;margin-top:5px">${esc(d.tipo)}</div>
                    </div>
                    <div style="display:flex;gap:4px;flex:none">
                        <button data-action="edit" data-id="${d.id}" style="width:30px;height:30px;border-radius:9px;background:#1c2226;border:1px solid #2a3237;color:#9aa7ad;cursor:pointer;display:flex;align-items:center;justify-content:center">${icon('edit', { size: 14, sw: 2 })}</button>
                        <button data-action="delete" data-id="${d.id}" style="width:30px;height:30px;border-radius:9px;background:#2a1518;border:1px solid #3a1e22;color:#f87171;cursor:pointer;display:flex;align-items:center;justify-content:center">${icon('trash', { size: 14, sw: 2 })}</button>
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:11px;color:#7c8a92;font-weight:600;margin-bottom:7px">
                    <span>Restante <b class="num" style="color:#fff;font-size:13px">${fmt0(p.total)}</b></span>
                    <span>Mensual <b class="num" style="color:#f97316;font-size:13px">${fmt0(d.pagoMensual)}</b></span>
                </div>
                <div style="display:flex;align-items:center;gap:9px">
                    <div style="flex:1" class="bar-track"><div style="width:${p.pct}%;height:100%;border-radius:99px;background:linear-gradient(90deg,#34d399,#22d3ee)"></div></div>
                    <span class="num" style="font-size:10.5px;font-weight:700;color:#34d399">${p.pct}% pagado</span>
                </div>
            </div>`;
        }).join('')
        : `<div style="text-align:center;padding:40px 20px;color:#5f6d73;font-size:13px">Sin deudas registradas.</div>`;

    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:16px">
        <div style="background:linear-gradient(135deg,#2a1518,#161a1d);border:1px solid #3a1e22;border-radius:20px;padding:20px">
            <div style="font-size:12.5px;font-weight:600;color:#f9a3aa">Deuda total pendiente</div>
            <div class="num" style="font-size:40px;font-weight:700;letter-spacing:-1.5px;color:#f43f5e;margin-top:2px">${fmt0(deudaTotal)}</div>
            <div style="display:flex;gap:20px;margin-top:6px">
                <span style="font-size:12px;color:#9aa7ad;font-weight:600">Pago mensual <b class="num" style="color:#f97316">${fmt0(deudaMes)}</b></span>
                <span style="font-size:12px;color:#9aa7ad;font-weight:600">Pagado <b class="num" style="color:#34d399">${paidPct}%</b></span>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:11px">${cards}</div>
        <button data-add-deuda style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border:1px dashed #3a444a;border-radius:14px;background:transparent;color:#34d399;font-weight:700;font-size:14px;cursor:pointer">
            ${icon('plus', { size: 17, sw: 2.2 })}Añadir deuda
        </button>
    </div>`;
}

export function initDeuda() {
    const el = document.getElementById('deuda-section');
    el.addEventListener('click', (e) => {
        if (e.target.closest('[data-add-deuda]')) { openAdd('deuda'); return; }
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = parseInt(btn.dataset.id, 10);
        if (btn.dataset.action === 'edit') {
            openEdit('deuda', id);
        } else if (btn.dataset.action === 'delete') {
            if (confirm('¿Borrar esta deuda?')) {
                deleteDeuda(id);
                renderDeuda();
                document.dispatchEvent(new Event('data-changed'));
            }
        }
    });
}
