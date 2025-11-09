import { getIngresos, getGastos, getDeudas, getExecutedPayments, addExecutedPayment, removeExecutedPayment, getAppliedIncomes, addAppliedIncome, removeAppliedIncome, getGastosRecurrentes } from './storage.js';

const ejecucionContent = document.getElementById('ejecucion-content');
const restanteEl = document.getElementById('ejecucion-restante');
const ejecucionListEl = document.getElementById('ejecucion-list');
const ejecucionIngresosListEl = document.getElementById('ejecucion-ingresos-list');

export function initEjecucion() {
    if (ejecucionContent.classList.contains('hidden')) {
        return;
    }
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

    const restante = totalIngresos - totalExecuted;
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

    allPayments.forEach(payment => {
        const isExecuted = executedPayments.includes(payment.id);
        const li = document.createElement('li');
        li.className = `flex justify-between items-center p-2 rounded ${isExecuted ? 'bg-green-200' : 'bg-red-200'}`;

        li.innerHTML = `
            <span>${payment.descripcion}</span>
            <span class="font-bold">$${payment.cantidad.toFixed(2)}</span>
            <div class="flex space-x-2">
                <button class="p-1 rounded ${isExecuted ? 'hidden' : 'bg-green-500 text-white'}" onclick="executePayment(${payment.id})">Ejecutar</button>
                <button class="p-1 rounded ${isExecuted ? 'bg-yellow-500 text-white' : 'hidden'}" onclick="undoPayment(${payment.id})">Deshacer</button>
            </div>
        `;

        ejecucionListEl.appendChild(li);
    });
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