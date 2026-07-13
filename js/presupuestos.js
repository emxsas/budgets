// Presupuestos (spending envelopes). Two views in one section switched by a
// local `openId`: the list of envelopes, and a drill-in that micro-manages one
// envelope's line-items. No new tab/route — `setTab` resets to the list.
import { getPresupuestos, deletePresupuesto, deletePresupuestoItem } from './storage.js';
import { fmt0, sum, esc, icon } from './ui.js';
import { openAdd, openEdit, openAddItem, openEditItem } from './sheet.js';

const PURPLE = '#a78bfa';
let openId = null;

export function resetPresupuestoView() { openId = null; }

function stats(p) {
    const limite = parseFloat(p.limite) || 0;
    const gastado = sum(p.items || [], it => it.cantidad);
    const restante = limite - gastado;
    const over = gastado > limite;
    const pct = limite ? Math.round(gastado / limite * 100) : 0;
    const fill = over ? 'linear-gradient(90deg,#f43f5e,#f97316)' : 'linear-gradient(90deg,#34d399,#22d3ee)';
    return { limite, gastado, restante, over, pct, fill };
}

function progressBar(s) {
    return `<div style="display:flex;align-items:center;gap:9px">
        <div style="flex:1" class="bar-track"><div style="width:${Math.min(s.pct, 100)}%;height:100%;border-radius:99px;background:${s.fill}"></div></div>
        <span class="num" style="font-size:10.5px;font-weight:700;color:${s.over ? '#f43f5e' : '#34d399'};flex:none;white-space:nowrap">${s.over ? 'Excedido ' + fmt0(-s.restante) : 'Quedan ' + fmt0(s.restante)}</span>
    </div>`;
}

function listView(presupuestos) {
    const totLimite = sum(presupuestos, p => p.limite);
    const totGastado = presupuestos.reduce((acc, p) => acc + sum(p.items || [], it => it.cantidad), 0);

    const cards = presupuestos.length
        ? presupuestos.map(p => {
            const s = stats(p);
            const n = (p.items || []).length;
            return `<div data-open="${p.id}" style="background:#161a1d;border-radius:16px;padding:15px;border:1px solid #21282c;cursor:pointer">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div style="min-width:0">
                        <div style="font-size:15px;font-weight:700">${esc(p.nombre)}</div>
                        <div style="font-size:11px;color:#7c8a92;font-weight:600;margin-top:2px">${n} movimiento${n === 1 ? '' : 's'}${p.mensual ? ' · <span style="color:#a78bfa">mensual</span>' : ''}</div>
                    </div>
                    <div style="text-align:right;flex:none">
                        <div class="num" style="font-size:15px;font-weight:700;color:${s.over ? '#f43f5e' : '#fff'}">${fmt0(s.gastado)}</div>
                        <div class="num" style="font-size:10.5px;color:#7c8a92;font-weight:600">de ${fmt0(s.limite)}</div>
                    </div>
                </div>
                <div style="margin-top:11px">${progressBar(s)}</div>
            </div>`;
        }).join('')
        : `<div style="text-align:center;padding:40px 20px;color:#5f6d73;font-size:13px">Sin presupuestos aún. Crea uno para empezar.</div>`;

    return `<div style="display:flex;flex-direction:column;gap:16px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 2px">
            <span style="font-size:12.5px;color:#7c8a92;font-weight:600">${presupuestos.length} presupuesto${presupuestos.length === 1 ? '' : 's'}</span>
            <span class="num" style="font-size:12px;font-weight:700;color:#9aa7ad">Presupuestado ${fmt0(totLimite)} · Gastado ${fmt0(totGastado)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:11px">${cards}</div>
        <button data-action="new" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border:1px dashed #3a444a;border-radius:14px;background:transparent;color:${PURPLE};font-weight:700;font-size:14px;cursor:pointer">
            ${icon('plus', { size: 17, sw: 2.2 })}Nuevo presupuesto
        </button>
    </div>`;
}

function itemRow(it) {
    const initial = (it.descripcion || '?').trim().charAt(0).toUpperCase() || '?';
    return `<div style="display:flex;align-items:center;gap:12px;background:#161a1d;border:1px solid #21282c;border-radius:14px;padding:13px 15px">
        <div class="num" style="width:38px;height:38px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:#1e1a2e;color:${PURPLE};font-weight:700;font-size:14px">${esc(initial)}</div>
        <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.descripcion)}</div></div>
        <div class="num" style="font-size:15px;font-weight:700;color:#f43f5e;flex:none">−${fmt0(it.cantidad)}</div>
        <div style="display:flex;gap:4px;flex:none">
            <button data-action="edit-item" data-id="${it.id}" style="width:30px;height:30px;border-radius:9px;background:#1c2226;border:1px solid #2a3237;color:#9aa7ad;cursor:pointer;display:flex;align-items:center;justify-content:center">${icon('edit', { size: 14, sw: 2 })}</button>
            <button data-action="del-item" data-id="${it.id}" style="width:30px;height:30px;border-radius:9px;background:#2a1518;border:1px solid #3a1e22;color:#f87171;cursor:pointer;display:flex;align-items:center;justify-content:center">${icon('trash', { size: 14, sw: 2 })}</button>
        </div>
    </div>`;
}

function detailView(p) {
    const s = stats(p);
    const items = p.items || [];
    const list = items.length
        ? items.map(itemRow).join('')
        : `<div style="text-align:center;padding:30px 20px;color:#5f6d73;font-size:13px">Sin gastos todavía.</div>`;

    return `<div style="display:flex;flex-direction:column;gap:16px">
        <button data-action="back" style="display:flex;align-items:center;gap:4px;background:transparent;border:none;color:#9aa7ad;font-weight:700;font-size:13px;cursor:pointer;padding:0;align-self:flex-start">${icon('back', { size: 18, sw: 2 })}Presupuestos</button>

        <div style="background:linear-gradient(135deg,#1e1a2e,#161a1d);border:1px solid #2a2740;border-radius:20px;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="min-width:0">
                    <div style="font-size:16px;font-weight:700">${esc(p.nombre)}${p.mensual ? ' <span style="font-size:10px;font-weight:700;color:#a78bfa;background:#1e1a2e;border:1px solid #2a2740;padding:2px 8px;border-radius:99px;vertical-align:middle">mensual</span>' : ''}</div>
                    <div class="num" style="font-size:36px;font-weight:700;letter-spacing:-1.5px;margin-top:4px;color:${s.over ? '#f43f5e' : '#fff'}">${fmt0(s.gastado)}</div>
                    <div style="font-size:12px;color:#9aa7ad;font-weight:600;margin-top:2px">de ${fmt0(s.limite)} · ${s.over ? 'Excedido ' + fmt0(-s.restante) : 'Quedan ' + fmt0(s.restante)} · ${s.pct}%</div>
                </div>
                <div style="display:flex;gap:4px;flex:none">
                    <button data-action="edit-budget" style="width:30px;height:30px;border-radius:9px;background:#1c2226;border:1px solid #2a3237;color:#9aa7ad;cursor:pointer;display:flex;align-items:center;justify-content:center">${icon('edit', { size: 14, sw: 2 })}</button>
                    <button data-action="del-budget" style="width:30px;height:30px;border-radius:9px;background:#2a1518;border:1px solid #3a1e22;color:#f87171;cursor:pointer;display:flex;align-items:center;justify-content:center">${icon('trash', { size: 14, sw: 2 })}</button>
                </div>
            </div>
            <div style="margin-top:14px">${progressBar(s)}</div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 2px">
            <span style="font-size:13.5px;font-weight:700;color:#c3cdd2">Gastos del presupuesto</span>
            <button data-action="add-item" style="display:flex;align-items:center;gap:6px;background:#1e1a2e;border:1px solid #2a2740;color:${PURPLE};font-weight:700;font-size:12.5px;padding:7px 12px;border-radius:10px;cursor:pointer">${icon('plus', { size: 14, sw: 2.4 })}Añadir gasto</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:9px">${list}</div>
    </div>`;
}

export function renderPresupuestos() {
    const el = document.getElementById('presupuestos-section');
    if (!el) return;
    const presupuestos = getPresupuestos();
    const current = openId != null ? presupuestos.find(p => p.id === openId) : null;
    if (openId != null && !current) openId = null;   // budget was deleted elsewhere
    el.innerHTML = current ? detailView(current) : listView(presupuestos);
}

export function initPresupuestos() {
    const el = document.getElementById('presupuestos-section');
    el.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.action;
            if (action === 'new') { openAdd('presupuesto'); return; }
            if (action === 'back') { openId = null; renderPresupuestos(); return; }
            if (action === 'edit-budget') { openEdit('presupuesto', openId); return; }
            if (action === 'del-budget') {
                if (confirm('¿Borrar este presupuesto y todos sus gastos?')) {
                    deletePresupuesto(openId); openId = null; renderPresupuestos();
                    document.dispatchEvent(new Event('data-changed'));
                }
                return;
            }
            if (action === 'add-item') { openAddItem(openId); return; }
            if (action === 'edit-item') { openEditItem(openId, parseInt(actionBtn.dataset.id, 10)); return; }
            if (action === 'del-item') {
                if (confirm('¿Borrar este gasto?')) {
                    deletePresupuestoItem(openId, parseInt(actionBtn.dataset.id, 10)); renderPresupuestos();
                    document.dispatchEvent(new Event('data-changed'));
                }
                return;
            }
        }
        const openBtn = e.target.closest('[data-open]');
        if (openBtn) { openId = parseInt(openBtn.dataset.open, 10); renderPresupuestos(); window.scrollTo(0, 0); }
    });
}
