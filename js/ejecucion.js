import { getIngresos, getGastos, getDeudas, getExecutedPayments, addExecutedPayment, addExecutedPayments, removeExecutedPayment, getAppliedIncomes, addAppliedIncome, removeAppliedIncome, getGastosRecurrentes } from './storage.js';

const ejecucionContent = document.getElementById('ejecucion-content');
const restanteEl = document.getElementById('ejecucion-restante');
const ejecucionListEl = document.getElementById('ejecucion-list');
const ejecucionIngresosListEl = document.getElementById('ejecucion-ingresos-list');

let selectedIds = [];

export function initEjecucion() {
    if (ejecucionContent.classList.contains('hidden')) {
        return;
    }
    selectedIds = [];
    renderEjecucion();
}

function renderEjecucion() {
    const ingresos = getIngresos();
    const gastos = getGastos();
    const gastosRecurrentes = getGastosRecurrentes();
    const deudas = getDeudas();
    const executedPayments = getExecutedPayments();
    const appliedIncomes = getAppliedIncomes();

    const totalIngresos = ingresos
        .filter(i => appliedIncomes.includes(i.id))
        .reduce((sum, i) => sum + parseFloat(i.cantidad), 0);

    const allPayments = [
        ...gastos.map(g => ({ ...g, cantidad: parseFloat(g.cantidad), type: 'gasto' })),
        ...gastosRecurrentes.map(g => ({ ...g, cantidad: parseFloat(g.cantidad), type: 'gasto-recurrente' })),
        ...deudas.map(d => ({ ...d, cantidad: parseFloat(d.pagoMensual), type: 'deuda' }))
    ];

    const totalExecuted = allPayments
        .filter(p => executedPayments.includes(p.id))
        .reduce((sum, p) => sum + p.cantidad, 0);

    const totalSeleccionado = allPayments
        .filter(p => selectedIds.includes(p.id))
        .reduce((sum, p) => sum + p.cantidad, 0);

    const restante = totalIngresos - totalExecuted - totalSeleccionado;
    restanteEl.textContent = `$${restante.toFixed(2)}`;

    ejecucionIngresosListEl.innerHTML = '';

    ingresos.forEach(income => {
        const isApplied = appliedIncomes.includes(income.id);
        const li = document.createElement('li');
        li.className = `flex justify-between items-center p-2 rounded bg-blue-200`;

        li.innerHTML = `
            <span>${income.descripcion}</span>
            <span class="font-bold">$${parseFloat(income.cantidad).toFixed(2)}</span>
            <div class="flex space-x-2">
                <button class="p-1 rounded ${isApplied ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'}" onclick="${isApplied ? 'unapplyIncome' : 'applyIncome'}(${income.id})">${isApplied ? 'Desaplicar' : 'Aplicar'}</button>
            </div>
        `;

        ejecucionIngresosListEl.appendChild(li);
    });

    ejecucionListEl.innerHTML = '';

    if (selectedIds.length > 0) {
        const bulkActions = document.createElement('div');
        bulkActions.className = 'mb-4 p-2 bg-gray-100 rounded shadow-sm space-y-2';
        bulkActions.innerHTML = `
            <div class="flex space-x-2">
                <button class="flex-1 bg-green-500 text-white font-bold py-2 rounded hover:bg-green-600" onclick="bulkExecute()">Ejecutar</button>
                <button class="flex-1 bg-gray-500 text-white font-bold py-2 rounded hover:bg-gray-600" onclick="cancelSelection()">Cancelar</button>
            </div>
            <p class="text-center font-bold text-gray-700">Total Seleccionado: $${totalSeleccionado.toFixed(2)}</p>
        `;
        ejecucionListEl.appendChild(bulkActions);
    }

    allPayments.forEach(payment => {
        const isExecuted = executedPayments.includes(payment.id);
        const isSelected = selectedIds.includes(payment.id);
        const li = document.createElement('li');

        let classes = `flex justify-between items-center p-2 rounded transition-all cursor-pointer `;
        if (isExecuted) {
            classes += 'bg-green-200';
        } else {
            classes += isSelected ? 'bg-red-400 scale-[1.02] shadow-md z-10' : 'bg-red-200 hover:bg-red-300';
        }

        li.className = classes;
        if (!isExecuted) {
            li.onclick = () => toggleSelection(payment.id);
        }

        li.innerHTML = `
            <span>${payment.descripcion}</span>
            <span class="font-bold">$${payment.cantidad.toFixed(2)}</span>
            <div class="flex space-x-2">
                <button class="p-1 rounded ${isExecuted ? 'bg-yellow-500 text-white' : 'hidden'}" onclick="event.stopPropagation(); undoPayment(${payment.id})">Deshacer</button>
            </div>
        `;

        ejecucionListEl.appendChild(li);
    });
}

window.toggleSelection = function(id) {
    if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter(selectedId => selectedId !== id);
    } else {
        selectedIds.push(id);
    }
    renderEjecucion();
}

window.bulkExecute = function() {
    addExecutedPayments(selectedIds);
    selectedIds = [];
    renderEjecucion();
}

window.cancelSelection = function() {
    selectedIds = [];
    renderEjecucion();
}

window.executePayment = function(id) {
    addExecutedPayment(id);
    renderEjecucion();
}

window.undoPayment = function(id) {
    removeExecutedPayment(id);
    renderEjecucion();
}

window.applyIncome = function(id) {
    addAppliedIncome(id);
    renderEjecucion();
}

window.unapplyIncome = function(id) {
    removeAppliedIncome(id);
    renderEjecucion();
}