// Ajustes (settings) view: manage categories as chips, export/import the JSON
// backup (unchanged lenient format), and reset to defaults.
import {
    getIngresoCategories, addIngresoCategory, deleteIngresoCategory,
    getGastoCategories, addGastoCategory, deleteGastoCategory,
    getDeudaCategories, addDeudaCategory, deleteDeudaCategory,
    getState, saveState, resetState, resetMonth,
    countCategoryUse, moveAndDeleteCategory
} from './storage.js';
import { esc, icon, emitDataChanged } from './ui.js';

const GROUPS = [
    { kind: 'ingresos', title: 'Ingresos', color: '#34d399', get: getIngresoCategories, add: addIngresoCategory, del: deleteIngresoCategory },
    { kind: 'gastos', title: 'Gastos', color: '#f43f5e', get: getGastoCategories, add: addGastoCategory, del: deleteGastoCategory },
    { kind: 'deudas', title: 'Deuda', color: '#f97316', get: getDeudaCategories, add: addDeudaCategory, del: deleteDeudaCategory }
];

// Pending "move entries then delete" dialog for a category that is in use.
let moving = null;   // { kind, name, count }

function moveDialog() {
    if (!moving) return '';
    const g = GROUPS.find(x => x.kind === moving.kind);
    const others = g.get().filter(c => c !== moving.name);
    const n = moving.count;
    const body = others.length
        ? `<label class="field-label" for="mv-target">Mover a</label>
           <select id="mv-target" class="field">${others.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
           <button class="btn-primary" data-move="confirm" style="width:100%;margin-top:14px">Mover y borrar</button>`
        : `<div style="font-size:12.5px;color:#fbbf24;font-weight:600;line-height:1.45">No hay otra categoría de ${g.title.toLowerCase()} a donde moverlos. Crea una primero y vuelve a intentarlo.</div>`;
    return `<div class="sheet-overlay" data-move="overlay">
        <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="mv-title">
            <div class="sheet-grab"></div>
            <div class="sheet-head">
                <div class="sheet-title" id="mv-title">Borrar “${esc(moving.name)}”</div>
                <button class="sheet-close" data-move="close" aria-label="Cerrar">×</button>
            </div>
            <div style="font-size:13px;color:#9aa7ad;font-weight:600;line-height:1.45;margin-bottom:14px">Esta categoría tiene <b style="color:#fff">${n} movimiento${n === 1 ? '' : 's'}</b>. Elige a qué categoría pasarlos antes de borrarla.</div>
            ${body}
            <button data-move="close" style="width:100%;margin-top:10px;background:#1c2226;border:1px solid #2a3237;color:#9aa7ad;font-weight:700;font-size:13px;padding:12px;border-radius:13px;cursor:pointer">Cancelar</button>
        </div>
    </div>`;
}

function groupMarkup(g) {
    const chips = g.get().map(c => `
        <span style="display:inline-flex;align-items:center;gap:6px;background:#1c2226;border:1px solid #2a3237;border-radius:99px;padding:6px 8px 6px 12px;font-size:12px;font-weight:600">${esc(c)}
            <button data-cat-del="${g.kind}" data-name="${esc(c)}" style="width:17px;height:17px;border-radius:50%;background:#2a1518;border:none;color:#f87171;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;padding:0">×</button>
        </span>`).join('');
    return `<div style="background:#161a1d;border:1px solid #21282c;border-radius:16px;padding:15px;margin-bottom:11px">
        <div style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${g.color};margin-bottom:11px">${g.title}</div>
        <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px">${chips || '<span style="font-size:12px;color:#5f6d73">Sin categorías</span>'}</div>
        <div style="display:flex;gap:8px">
            <input data-cat-input="${g.kind}" placeholder="Nueva categoría" style="flex:1;background:#0e1113;border:1px solid #2a3237;border-radius:10px;padding:9px 12px;color:#fff;font-size:13px">
            <button data-cat-add="${g.kind}" style="background:#1c3a2e;border:1px solid #2a5544;color:#34d399;font-weight:700;font-size:13px;padding:9px 16px;border-radius:10px;cursor:pointer">Añadir</button>
        </div>
    </div>`;
}

export function renderAjustes() {
    const el = document.getElementById('ajustes-section');
    if (!el) return;
    const sub = 'font-size:12px;color:#7c8a92;font-weight:600;line-height:1.45';
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:22px">
        <button data-action="tour" data-tour="aj-tour" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#161a1d;border:1px solid #21282c;border-radius:16px;padding:13px 15px;cursor:pointer;color:#fff">
            <span style="width:36px;height:36px;border-radius:11px;background:#12291f;color:#34d399;display:flex;align-items:center;justify-content:center;flex:none">${icon('ejecucion', { size: 18, sw: 2 })}</span>
            <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:700">Ver tutorial</span><span style="display:block;${sub}">Repasa cómo funciona la app paso a paso</span></span>
            <span style="color:#5f6d73;flex:none">${icon('next', { size: 18, sw: 2 })}</span>
        </button>
        <div data-tour="cats">
            <div style="font-size:15px;font-weight:700;margin-bottom:12px">Categorías</div>
            ${GROUPS.map(groupMarkup).join('')}
        </div>
        <div data-tour="aj-datos">
            <div style="font-size:15px;font-weight:700;margin-bottom:4px">Respaldo</div>
            <div style="${sub};margin-bottom:12px">Tus datos viven solo en este navegador. Exporta un respaldo seguido y usa Importar para pasarlos a otro dispositivo.</div>
            <div style="display:flex;gap:10px">
                <button data-action="export" style="flex:1;background:#161a1d;border:1px solid #21282c;color:#22d3ee;font-weight:700;font-size:13px;padding:13px;border-radius:13px;cursor:pointer">Exportar JSON</button>
                <button data-action="import" style="flex:1;background:#161a1d;border:1px solid #21282c;color:#22d3ee;font-weight:700;font-size:13px;padding:13px;border-radius:13px;cursor:pointer">Importar JSON</button>
            </div>
        </div>
        <div data-tour="aj-reset-mes" style="background:#161a1d;border:1px solid #4a3a18;border-radius:16px;padding:15px">
            <div style="font-size:15px;font-weight:700;color:#fbbf24">Cierre de mes</div>
            <div style="${sub};margin:4px 0 12px">Borra gastos e ingresos extra y el avance de Ejecución, y vacía los presupuestos mensuales. Se quedan los fijos, las deudas y los ingresos fijos.</div>
            <button data-action="reset-mes" style="width:100%;background:#3a2e12;border:1px solid #4a3a18;color:#fbbf24;font-weight:700;font-size:13px;padding:12px;border-radius:12px;cursor:pointer">Reset mes</button>
        </div>
        <div style="margin-top:22px;padding-top:18px;border-top:1px dashed #3a1e22">
            <div style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#f87171">Zona de peligro</div>
            <div style="${sub};margin:4px 0 12px">Restablecer borra <b style="color:#c3cdd2">todo</b>, incluidas tus categorías personalizadas. Exporta un respaldo antes.</div>
            <button data-action="reset" style="width:100%;background:transparent;border:1px solid #3a1e22;color:#f87171;font-weight:600;font-size:12.5px;padding:11px;border-radius:13px;cursor:pointer">Restablecer datos</button>
        </div>
        <div style="text-align:center;font-size:11px;color:#4a555b;padding-top:4px">Los datos se guardan en este navegador</div>
    </div>${moveDialog()}`;
}

function addFrom(kind) {
    const g = GROUPS.find(x => x.kind === kind);
    const input = document.querySelector(`[data-cat-input="${kind}"]`);
    const value = input.value.trim();
    if (!value) { alert('El nombre de la categoría no puede estar vacío.'); return; }
    g.add(value);
    renderAjustes();
}

function handleExport() {
    const jsonString = JSON.stringify(getState(), null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuesto-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleImport() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const newState = JSON.parse(event.target.result);
                // Lenient validation kept for backward compatibility with older exports.
                if (newState && newState.ingresos && newState.gastos && newState.deudas && newState.categories) {
                    if (!newState.executedPayments) newState.executedPayments = [];
                    if (!newState.appliedIncomes) newState.appliedIncomes = [];
                    if (confirm('¿Seguro? Esto reemplazará todos tus datos actuales.')) {
                        saveState(newState);
                        alert('Datos importados con éxito. La aplicación se recargará.');
                        location.reload();
                    }
                } else {
                    alert('Archivo de importación inválido. No tiene la estructura correcta.');
                }
            } catch (error) {
                alert('Error al leer o procesar el archivo.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();
}

export function initAjustes() {
    const el = document.getElementById('ajustes-section');
    el.addEventListener('click', (e) => {
        const add = e.target.closest('[data-cat-add]');
        if (add) { addFrom(add.dataset.catAdd); return; }
        const mv = e.target.closest('[data-move]');
        if (mv) {
            const a = mv.dataset.move;
            if (a === 'close' || (a === 'overlay' && e.target === mv)) { moving = null; renderAjustes(); }
            else if (a === 'confirm') {
                moveAndDeleteCategory(moving.kind, moving.name, document.getElementById('mv-target').value);
                moving = null;
                renderAjustes();
                emitDataChanged();
            }
            return;
        }
        const del = e.target.closest('[data-cat-del]');
        if (del) {
            const g = GROUPS.find(x => x.kind === del.dataset.catDel);
            const name = del.dataset.name;
            const count = countCategoryUse(g.kind, name);
            if (count) { moving = { kind: g.kind, name, count }; renderAjustes(); }
            else if (confirm(`¿Borrar la categoría "${name}"?`)) { g.del(name); renderAjustes(); }
            return;
        }
        const action = e.target.closest('[data-action]');
        if (!action) return;
        if (action.dataset.action === 'tour') document.dispatchEvent(new Event('start-tour'));
        else if (action.dataset.action === 'export') handleExport();
        else if (action.dataset.action === 'import') handleImport();
        else if (action.dataset.action === 'reset') {
            if (confirm('¿Restablecer la app? Se borrarán todos los datos y se conservarán las categorías por defecto.')) {
                resetState();
                location.reload();
            }
        }
        else if (action.dataset.action === 'reset-mes') {
            if (confirm('¿Cerrar el mes? Se borrarán todos los gastos e ingresos extra, y se limpiará el progreso de Ejecución. Los recurrentes, deudas e ingresos fijos se conservan.')) {
                resetMonth();
                location.reload();
            }
        }
    });
    el.addEventListener('keydown', (e) => {
        const input = e.target.closest('[data-cat-input]');
        if (input && e.key === 'Enter') { e.preventDefault(); addFrom(input.dataset.catInput); }
    });
}
