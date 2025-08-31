import { addIngreso, getIngresos, getIngresoCategories, deleteIngreso, updateIngreso } from './storage.js';
import { updateResumen } from './resumen.js';

const ingresoCategoriaSelect = document.getElementById('ingreso-categoria');
const ingresoDescripcionInput = document.getElementById('ingreso-descripcion');
const ingresoCantidadInput = document.getElementById('ingreso-cantidad');
const addIngresoBtn = document.getElementById('add-ingreso');
const ingresosList = document.getElementById('ingresos-list');

let editMode = false;
let editId = null;

function populateCategories() {
    const categories = getIngresoCategories();
    ingresoCategoriaSelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function renderIngresos() {
    const ingresos = getIngresos();
    ingresosList.innerHTML = ingresos.map(ingreso => `
        <li class="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
            <div>
                <span class="font-bold">${ingreso.descripcion}</span>
                <span class="text-sm text-gray-600">(${ingreso.categoria})</span>
            </div>
            <div class="flex items-center space-x-2">
                <span class="font-semibold text-green-600">$${parseFloat(ingreso.cantidad).toFixed(2)}</span>
                <button data-id="${ingreso.id}" class="edit-ingreso font-bold py-1 px-2 rounded shadow bg-[#20B2AA] hover:bg-teal-600 text-white text-sm">Editar</button>
                <button data-id="${ingreso.id}" class="delete-ingreso font-bold py-1 px-2 rounded shadow bg-red-500 hover:bg-red-700 text-white text-sm">Borrar</button>
            </div>
        </li>
    `).join('');
}

function handleAddOrUpdateIngreso() {
    const categoria = ingresoCategoriaSelect.value;
    const descripcion = ingresoDescripcionInput.value;
    const cantidad = ingresoCantidadInput.value;

    if (!descripcion || !cantidad) {
        alert('Por favor, complete todos los campos.');
        return;
    }

    if (editMode) {
        updateIngreso({ id: editId, categoria, descripcion, cantidad });
        editMode = false;
        editId = null;
        addIngresoBtn.textContent = 'Añadir Ingreso';
        addIngresoBtn.classList.replace('bg-blue-500', 'bg-[#00FA9A]');
    } else {
        addIngreso({ categoria, descripcion, cantidad });
    }

    ingresoDescripcionInput.value = '';
    ingresoCantidadInput.value = '';
    renderIngresos();
    updateResumen();
}

function handleListClick(event) {
    const id = parseInt(event.target.dataset.id);

    if (event.target.classList.contains('delete-ingreso')) {
        if (confirm('¿Está seguro de que desea borrar este ingreso?')) {
            deleteIngreso(id);
            renderIngresos();
            updateResumen();
        }
    }

    if (event.target.classList.contains('edit-ingreso')) {
        const ingresos = getIngresos();
        const ingresoToEdit = ingresos.find(ingreso => ingreso.id === id);
        if (ingresoToEdit) {
            ingresoCategoriaSelect.value = ingresoToEdit.categoria;
            ingresoDescripcionInput.value = ingresoToEdit.descripcion;
            ingresoCantidadInput.value = ingresoToEdit.cantidad;

            editMode = true;
            editId = id;
            addIngresoBtn.textContent = 'Actualizar Ingreso';
            addIngresoBtn.classList.replace('bg-[#00FA9A]', 'bg-blue-500');
            ingresoDescripcionInput.focus();
        }
    }
}

export function initIngresos() {
    populateCategories();
    renderIngresos();
    addIngresoBtn.addEventListener('click', handleAddOrUpdateIngreso);
    ingresosList.addEventListener('click', handleListClick);
}
