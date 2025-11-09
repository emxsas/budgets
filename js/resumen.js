import { getIngresos, getGastos, getDeudas, getGastosRecurrentes } from './storage.js';

// DOM Elements
const disponibleEl = document.getElementById('resumen-disponible');
const totalIngresosEl = document.getElementById('resumen-total-ingresos');
const totalGastosEl = document.getElementById('resumen-total-gastos');
const totalDeudaMensualEl = document.getElementById('resumen-total-deuda-mensual');
const deudaTotalEl = document.getElementById('resumen-deuda-total');
const chartCanvas = document.getElementById('resumen-chart');

let resumenChart = null; // To hold the chart instance

function formatCurrency(value) {
    return `$${value.toFixed(2)}`;
}

export function updateResumen() {
    // Calculations
    const totalIngresos = getIngresos().reduce((sum, item) => sum + parseFloat(item.cantidad), 0);
    const totalGastos = getGastos().reduce((sum, item) => sum + parseFloat(item.cantidad), 0) + getGastosRecurrentes().reduce((sum, item) => sum + parseFloat(item.cantidad), 0);
    const totalDeudaMensual = getDeudas().reduce((sum, item) => sum + parseFloat(item.pagoMensual), 0);
    const disponible = totalIngresos - totalGastos - totalDeudaMensual;
    const deudaTotal = getDeudas().reduce((sum, item) => sum + parseFloat(item.total), 0);

    // Render Text Summary
    disponibleEl.textContent = formatCurrency(disponible);
    totalIngresosEl.textContent = formatCurrency(totalIngresos);
    totalGastosEl.textContent = formatCurrency(totalGastos);
    totalDeudaMensualEl.textContent = formatCurrency(totalDeudaMensual);
    deudaTotalEl.textContent = formatCurrency(deudaTotal);

    // Chart Data
    const chartData = {
        labels: ['Gastos', 'Deuda Mensual', 'Disponible'],
        datasets: [{
            data: [totalGastos, totalDeudaMensual, disponible > 0 ? disponible : 0],
            backgroundColor: ['#EF4444', '#F97316', '#22C55E'],
            hoverOffset: 4
        }]
    };

    // Render Chart
    if (resumenChart) {
        resumenChart.destroy(); // Destroy existing chart to prevent duplicates
    }

    resumenChart = new Chart(chartCanvas, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Desglose de Ingresos'
                }
            }
        },
    });
}

export function initResumen() {
    updateResumen();
}
