import { setupUI } from './ui.js';
import { initState } from './storage.js';
import { initIngresos } from './ingresos.js';
import { initGastos } from './gastos.js';
import { initGastosRecurrentes } from './gastosRecurrentes.js';
import { initDeuda } from './deuda.js';
import { initSettings } from './settings.js';
import { initResumen } from './resumen.js';
import { initEjecucion } from './ejecucion.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("App Loaded");
    initState(); // Initialize storage on app start
    setupUI();
    initIngresos(); // Initialize Ingresos tab functionality
    initGastos(); // Initialize Gastos tab functionality
    initGastosRecurrentes(); // Initialize Gastos Recurrentes tab functionality
    initDeuda(); // Initialize Deuda tab functionality
    initSettings(); // Initialize Settings tab functionality
    initEjecucion(); // Initialize Ejecucion tab functionality
    initResumen(); // Initialize Resumen tab on load

    const menuButton = document.getElementById('menu-button');
    const menuDropdown = document.getElementById('menu-dropdown');
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');

    menuButton.addEventListener('click', () => {
        menuDropdown.classList.toggle('active');
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Hide all content
            contents.forEach(c => {
                c.classList.add('hidden');
            });

            // Show selected content
            const contentId = `${tab.dataset.tab}-content`;
            document.getElementById(contentId).classList.remove('hidden');

            // Update menu button text
            menuButton.textContent = tab.textContent;

            // Hide dropdown
            menuDropdown.classList.remove('active');

            // Special action for resumen tab to ensure chart renders correctly
            if (tab.dataset.tab === 'resumen') {
                initResumen();
            } else if (tab.dataset.tab === 'ejecucion') {
                initEjecucion();
            } else if (tab.dataset.tab === 'gastos-recurrentes') {
                initGastosRecurrentes();
            }
        });
    });
});
