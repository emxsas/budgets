import { addGastoRecurrente, getGastosRecurrentes, getGastoCategories, deleteGastoRecurrente, updateGastoRecurrente } from './storage.js';
import { updateResumen } from './resumen.js';

const gastoCategoriaSelect = document.getElementById('gasto-recurrente-categoria');
const gastoDescripcionInput = document.getElementById('gasto-recurrente-descripcion');
const gastoCantidadInput = document.getElementById('gasto-recurrente-cantidad');
const addGastoBtn = document.getElementById('add-gasto-recurrente');
const gastosList = document.getElementById('gastos-recurrentes-list');

let editMode = false;
let editId = null;

function populateCategories() {
    const categories = getGastoCategories();
    gastoCategoriaSelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function renderGastosRecurrentes() {
    const gastos = getGastosRecurrentes();
    gastosList.innerHTML = gastos.map(gasto => `
        <li class="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
            <div>
                <span class="font-bold">${gasto.descripcion}</span>
                <span class="text-sm text-gray-600">(${gasto.categoria})</span>
            </div>
            <div class="flex items-center space-x-2">
                <span class="font-semibold text-red-600">$${parseFloat(gasto.cantidad).toFixed(2)}</span>
                <button data-id="${gasto.id}" class="edit-gasto-recurrente font-bold py-1 px-2 rounded shadow bg-[#20B2AA] hover:bg-teal-600 text-white text-sm">Editar</button>
                <button data-id="${gasto.id}" class="delete-gasto-recurrente font-bold py-1 px-2 rounded shadow bg-red-500 hover:bg-red-700 text-white text-sm">Borrar</button>
            </div>
        </li>
    `).join('');
}

function handleAddOrUpdateGastoRecurrente() {
    const categoria = gastoCategoriaSelect.value;
    const descripcion = gastoDescripcionInput.value;
    const cantidad = gastoCantidadInput.value;

    if (!descripcion || !cantidad) {
        alert('Por favor, complete todos los campos.');
        return;
    }

    if (editMode) {
        updateGastoRecurrente({ id: editId, categoria, descripcion, cantidad });
        editMode = false;
        editId = null;
        addGastoBtn.textContent = 'Añadir Gasto Recurrente';
        addGastoBtn.classList.replace('bg-blue-500', 'bg-[#00FA9A]');
    } else {
        addGastoRecurrente({ categoria, descripcion, cantidad });
    }

    gastoDescripcionInput.value = '';
    gastoCantidadInput.value = '';
    renderGastosRecurrentes();
    updateResumen();
}

function handleListClick(event) {
    const id = parseInt(event.target.dataset.id);

    if (event.target.classList.contains('delete-gasto-recurrente')) {
        if (confirm('¿Está seguro de que desea borrar este gasto?')) {
            deleteGastoRecurrente(id);
            renderGastosRecurrentes();
            updateResumen();
        }
    }

    if (event.target.classList.contains('edit-gasto-recurrente')) {
        const gastos = getGastosRecurrentes();
        const gastoToEdit = gastos.find(gasto => gasto.id === id);
        if (gastoToEdit) {
            gastoCategoriaSelect.value = gastoToEdit.categoria;
            gastoDescripcionInput.value = gastoToEdit.descripcion;
            gastoCantidadInput.value = gastoToEdit.cantidad;

            editMode = true;
            editId = id;
            addGastoBtn.textContent = 'Actualizar Gasto';
            addGastoBtn.classList.replace('bg-[#00FA9A]', 'bg-blue-500');
            gastoDescripcionInput.focus();
        }
    }
}

export function initGastosRecurrentes() {
    populateCategories();
    renderGastosRecurrentes();
    addGastoBtn.addEventListener('click', handleAddOrUpdateGastoRecurrente);
    gastosList.addEventListener('click', handleListClick);
}
