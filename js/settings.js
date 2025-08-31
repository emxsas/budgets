import {
    getIngresoCategories, addIngresoCategory, deleteIngresoCategory,
    getGastoCategories, addGastoCategory, deleteGastoCategory,
    getDeudaCategories, addDeudaCategory, deleteDeudaCategory,
    getState, saveState
} from './storage.js';

// DOM Elements
const exportBtn = document.getElementById('export-data');
const importBtn = document.getElementById('import-data');

const ingresosCatList = document.getElementById('ingresos-categories-list');
const newIngresoCatInput = document.getElementById('new-ingreso-category');
const addIngresoCatBtn = document.getElementById('add-ingreso-category');

const gastosCatList = document.getElementById('gastos-categories-list');
const newGastoCatInput = document.getElementById('new-gasto-category');
const addGastoCatBtn = document.getElementById('add-gasto-category');

const deudasCatList = document.getElementById('deuda-categories-list');
const newDeudaCatInput = document.getElementById('new-deuda-category');
const addDeudaCatBtn = document.getElementById('add-deuda-category');

function renderCategories(listElement, categories, deleteHandler) {
    listElement.innerHTML = categories.map(cat => `
        <li class="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
            <span>${cat}</span>
            <button data-category="${cat}" class="delete-category font-bold py-1 px-2 rounded shadow bg-red-500 hover:bg-red-700 text-white text-sm">Borrar</button>
        </li>
    `).join('');

    listElement.querySelectorAll('.delete-category').forEach(button => {
        button.addEventListener('click', (e) => {
            const category = e.target.dataset.category;
            if (confirm(`¿Está seguro de que desea borrar la categoría "${category}"?`)) {
                deleteHandler(category);
                // This is a bit inefficient, but simple. We re-render everything.
                // A better implementation would be to re-render only the affected parts.
                initSettings();
            }
        });
    });
}

function handleAddCategory(inputElement, addHandler) {
    const newCategory = inputElement.value.trim();
    if (newCategory) {
        addHandler(newCategory);
        inputElement.value = '';
        initSettings(); // Re-render
    } else {
        alert('El nombre de la categoría no puede estar vacío.');
    }
}

export function initSettings() {
    renderCategories(ingresosCatList, getIngresoCategories(), deleteIngresoCategory);
    renderCategories(gastosCatList, getGastoCategories(), deleteGastoCategory);
    renderCategories(deudasCatList, getDeudaCategories(), deleteDeudaCategory);

    // The event listeners are set here. A more robust solution would be to ensure they are only added once.
    // For this simple app, re-assigning them in init is acceptable.
    addIngresoCatBtn.onclick = () => handleAddCategory(newIngresoCatInput, addIngresoCategory);
    addGastoCatBtn.onclick = () => handleAddCategory(newGastoCatInput, addGastoCategory);
    addDeudaCatBtn.onclick = () => handleAddCategory(newDeudaCatInput, addDeudaCategory);

    exportBtn.onclick = handleExport;
    importBtn.onclick = handleImport;
}

function handleExport() {
    const state = getState();
    const jsonString = JSON.stringify(state, null, 2);
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
                // Basic validation
                if (newState && newState.ingresos && newState.gastos && newState.deudas && newState.categories) {
                    if (confirm('¿Está seguro? Esto sobreescribirá todos sus datos actuales.')) {
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
