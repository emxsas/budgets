import { getIngresos, getGastos, getDeudas, getExecutedPayments, addExecutedPayment, removeExecutedPayment } from './storage.js';

const ejecucionContent = document.getElementById('ejecucion-content');
const restanteEl = document.getElementById('ejecucion-restante');
const ejecucionListEl = document.getElementById('ejecucion-list');

export function initEjecucion() {
    if (ejecucionContent.classList.contains('hidden')) {
        return;
    }
    renderEjecucion();
}

function renderEjecucion() {
    const ingresos = getIngresos();
    const gastos = getGastos();
    const deudas = getDeudas();
    const executedPayments = getExecutedPayments();

    const totalIngresos = ingresos.reduce((sum, i) => sum + parseFloat(i.cantidad), 0);

    const allPayments = [
        ...gastos.map(g => ({ ...g, cantidad: parseFloat(g.cantidad), type: 'gasto' })),
        ...deudas.map(d => ({ ...d, cantidad: parseFloat(d.pagoMensual), type: 'deuda' }))
    ];

    const totalExecuted = allPayments
        .filter(p => executedPayments.includes(p.id))
        .reduce((sum, p) => sum + p.cantidad, 0);

    const restante = totalIngresos - totalExecuted;
    restanteEl.textContent = `$${restante.toFixed(2)}`;

    ejecucionListEl.innerHTML = '';

    allPayments.forEach(payment => {
        const isExecuted = executedPayments.includes(payment.id);
        const li = document.createElement('li');
        li.className = `flex justify-between items-center p-2 rounded ${isExecuted ? 'bg-green-200' : 'bg-red-200'}`;

        li.innerHTML = `
            <span>${payment.descripcion}</span>
            <span class="font-bold">$${payment.cantidad.toFixed(2)}</span>
            <div class="flex space-x-2">
                <button class="execute-btn p-1 rounded ${isExecuted ? 'hidden' : 'bg-green-500 text-white'}" data-id="${payment.id}">Ejecutar</button>
                <button class="undo-btn p-1 rounded ${isExecuted ? 'bg-yellow-500 text-white' : 'hidden'}" data-id="${payment.id}">Deshacer</button>
            </div>
        `;

        ejecucionListEl.appendChild(li);
    });

    addEventListeners();
}

function addEventListeners() {
    document.querySelectorAll('.execute-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            addExecutedPayment(id);
            renderEjecucion();
        });
    });

    document.querySelectorAll('.undo-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            removeExecutedPayment(id);
            renderEjecucion();
        });
    });
}