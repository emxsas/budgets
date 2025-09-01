import { getIngresos, getGastos, getDeudas } from './storage.js';

// --- Helper Functions ---

/**
 * Aggregates all spending (gastos and deudas) by category.
 * @returns {object} An object where keys are categories and values are total spending.
 */
function getSpendingByCategory() {
    const spending = {};

    getGastos().forEach(gasto => {
        const amount = parseFloat(gasto.cantidad);
        spending[gasto.categoria] = (spending[gasto.categoria] || 0) + amount;
    });

    getDeudas().forEach(deuda => {
        const amount = parseFloat(deuda.pagoMensual);
        // We can prefix debt categories to avoid clashes, or just combine them.
        // For now, we'll combine them. E.g. a 'Casa' gasto and 'Casa' deuda tipo will be summed.
        spending[deuda.tipo] = (spending[deuda.tipo] || 0) + amount;
    });

    return spending;
}

/**
 * Generates a list of distinct colors for the chart.
 * @param {number} count The number of colors to generate.
 * @returns {string[]} An array of hex color codes.
 */
function generateChartColors(count) {
    const colors = [];
    // Simple hashing function to generate varied, but not random, colors.
    for (let i = 0; i < count; i++) {
        let hash = i * 360 / count;
        colors.push(`hsl(${hash}, 70%, 50%)`);
    }
    return colors;
}


// DOM Elements
const disponibleEl = document.getElementById('resumen-disponible');
const totalIngresosEl = document.getElementById('resumen-total-ingresos');
const totalGastosEl = document.getElementById('resumen-total-gastos');
const totalDeudaMensualEl = document.getElementById('resumen-total-deuda-mensual');
const deudaTotalEl = document.getElementById('resumen-deuda-total');
const categoryBreakdownEl = document.getElementById('resumen-category-breakdown');
const chartCanvas = document.getElementById('resumen-chart');

let resumenChart = null; // To hold the chart instance

function formatCurrency(value) {
    return `$${value.toFixed(2)}`;
}

export function updateResumen() {
    // 1. Perform all calculations
    const totalIngresos = getIngresos().reduce((sum, item) => sum + parseFloat(item.cantidad), 0);
    const totalGastos = getGastos().reduce((sum, item) => sum + parseFloat(item.cantidad), 0);
    const totalDeudaMensual = getDeudas().reduce((sum, item) => sum + parseFloat(item.pagoMensual), 0);
    const disponible = totalIngresos - totalGastos - totalDeudaMensual;
    const deudaTotal = getDeudas().reduce((sum, item) => sum + parseFloat(item.total), 0);
    const spendingByCategory = getSpendingByCategory();

    // 2. Render high-level text summary
    disponibleEl.textContent = formatCurrency(disponible);
    totalIngresosEl.textContent = formatCurrency(totalIngresos);
    totalGastosEl.textContent = formatCurrency(totalGastos);
    totalDeudaMensualEl.textContent = formatCurrency(totalDeudaMensual);
    deudaTotalEl.textContent = formatCurrency(deudaTotal);

    // 3. Render detailed category breakdown
    categoryBreakdownEl.innerHTML = Object.entries(spendingByCategory)
        .map(([category, amount]) => `
            <li class="flex justify-between p-1 bg-gray-100 rounded text-sm">
                <span>${category}:</span>
                <span class="font-semibold">${formatCurrency(amount)}</span>
            </li>
        `).join('');

    // 4. Prepare data and render the chart
    const chartLabels = Object.keys(spendingByCategory);
    const chartValues = Object.values(spendingByCategory);
    const chartColors = generateChartColors(chartLabels.length);

    const chartData = {
        labels: chartLabels,
        datasets: [{
            data: chartValues,
            backgroundColor: chartColors,
            hoverOffset: 4
        }]
    };

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
                    text: 'Resumen de Gastos por Categoría'
                }
            }
        },
    });
}

export function initResumen() {
    updateResumen();
}
