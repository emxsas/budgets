import { getIngresos, getGastos, getDeudas, getGastosRecurrentes } from './storage.js';

let resumenChart = null; // To hold the chart instance

function formatCurrency(value) {
    return `$${value.toFixed(2)}`;
}

export function updateResumen() {
    console.log("Updating resumen...");
    // DOM Elements
    const disponibleEl = document.getElementById('resumen-disponible');
    const totalIngresosEl = document.getElementById('resumen-total-ingresos');
    const totalGastosRecurrentesEl = document.getElementById('resumen-total-gastos-recurrentes');
    const totalGastosExtrasEl = document.getElementById('resumen-total-gastos-extras');
    const totalDeudaMensualEl = document.getElementById('resumen-total-deuda-mensual');
    const deudaTotalEl = document.getElementById('resumen-deuda-total');
    const chartCanvas = document.getElementById('resumen-chart');

    // Data fetching and logging
    const ingresos = getIngresos();
    const gastosRecurrentes = getGastosRecurrentes();
    const gastosExtras = getGastos();
    const deudas = getDeudas();

    console.log("Ingresos data:", ingresos);
    console.log("Gastos Recurrentes data:", gastosRecurrentes);
    console.log("Gastos Extras data:", gastosExtras);
    console.log("Deudas data:", deudas);

    // Calculations
    const totalIngresos = ingresos.reduce((sum, item) => sum + parseFloat(item.cantidad), 0);
    const totalGastosRecurrentes = gastosRecurrentes.reduce((sum, item) => sum + parseFloat(item.cantidad), 0);
    const totalGastosExtras = gastosExtras.reduce((sum, item) => sum + parseFloat(item.cantidad), 0);
    const totalGastos = totalGastosRecurrentes + totalGastosExtras;
    const totalDeudaMensual = deudas.reduce((sum, item) => sum + parseFloat(item.pagoMensual), 0);
    const disponible = totalIngresos - totalGastos - totalDeudaMensual;
    const deudaTotal = deudas.reduce((sum, item) => sum + parseFloat(item.total), 0);

    console.log("Total Ingresos:", totalIngresos);
    console.log("Total Gastos Recurrentes:", totalGastosRecurrentes);
    console.log("Total Gastos Extras:", totalGastosExtras);
    console.log("Total Deuda Mensual:", totalDeudaMensual);
    console.log("Disponible:", disponible);
    console.log("Deuda Total:", deudaTotal);

    // Render Text Summary
    disponibleEl.textContent = formatCurrency(disponible);
    totalIngresosEl.textContent = formatCurrency(totalIngresos);
    totalGastosRecurrentesEl.textContent = formatCurrency(totalGastosRecurrentes);
    totalGastosExtrasEl.textContent = formatCurrency(totalGastosExtras);
    totalDeudaMensualEl.textContent = formatCurrency(totalDeudaMensual);
    deudaTotalEl.textContent = formatCurrency(deudaTotal);
    console.log("Resumen text updated.");

    // Chart Data
    const chartData = {
        labels: ['Gastos Recurrentes', 'Gastos Extras', 'Deuda Mensual', 'Disponible'],
        datasets: [{
            data: [totalGastosRecurrentes, totalGastosExtras, totalDeudaMensual, disponible > 0 ? disponible : 0],
            backgroundColor: ['#EF4444', '#DC2626', '#F97316', '#22C55E'],
            hoverOffset: 4
        }]
    };

    // Render Chart
    if (resumenChart) {
        resumenChart.destroy();
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
    console.log("Resumen chart updated.");
}

export function initResumen() {
    // Defer summary update until the DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateResumen);
    } else {
        updateResumen();
    }
}
