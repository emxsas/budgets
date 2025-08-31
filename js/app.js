import { setupUI } from './ui.js';
import { initState } from './storage.js';
import { initIngresos } from './ingresos.js';
import { initGastos } from './gastos.js';
import { initDeuda } from './deuda.js';
import { initSettings } from './settings.js';
import { initResumen } from './resumen.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("App Loaded");
    initState(); // Initialize storage on app start
    setupUI();
    initIngresos(); // Initialize Ingresos tab functionality
    initGastos(); // Initialize Gastos tab functionality
    initDeuda(); // Initialize Deuda tab functionality
    initSettings(); // Initialize Settings tab functionality
    initResumen(); // Initialize Resumen tab on load

    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all tabs
            tabs.forEach(t => {
                t.classList.remove('border-b-4', 'border-primary-button', 'font-bold');
            });
            contents.forEach(c => {
                c.classList.add('hidden');
            });

            // Activate clicked tab
            tab.classList.add('border-b-4', 'border-primary-button', 'font-bold');
            const contentId = `${tab.dataset.tab}-content`;
            document.getElementById(contentId).classList.remove('hidden');

            // Special action for resumen tab to ensure chart renders correctly
            if (tab.dataset.tab === 'resumen') {
                initResumen();
            }
        });
    });
});
