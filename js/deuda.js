import { addDeuda, getDeudas, getDeudaCategories, deleteDeuda, updateDeuda } from './storage.js';
import { updateResumen } from './resumen.js';

const deudaTipoSelect = document.getElementById('deuda-tipo');
const deudaDescripcionInput = document.getElementById('deuda-descripcion');
const deudaPagoMensualInput = document.getElementById('deuda-pago-mensual');
const deudaTotalInput = document.getElementById('deuda-total');
const addDeudaBtn = document.getElementById('add-deuda');
const deudasList = document.getElementById('deudas-list');

let editMode = false;
let editId = null;

function populateCategories() {
    const categories = getDeudaCategories();
    deudaTipoSelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function renderDeudas() {
    const deudas = getDeudas();
    deudasList.innerHTML = deudas.map(deuda => `
        <li class="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
            <div>
                <span class="font-bold">${deuda.descripcion}</span>
                <span class="text-sm text-gray-600">(${deuda.tipo})</span>
            </div>
            <div class="flex items-center space-x-2">
                <div>
                    <div class="font-semibold text-orange-600">Mensual: $${parseFloat(deuda.pagoMensual).toFixed(2)}</div>
                    <div class="text-xs text-gray-500">Total: $${parseFloat(deuda.total).toFixed(2)}</div>
                </div>
                <button data-id="${deuda.id}" class="edit-deuda font-bold py-1 px-2 rounded shadow bg-[#20B2AA] hover:bg-teal-600 text-white text-sm">Editar</button>
                <button data-id="${deuda.id}" class="delete-deuda font-bold py-1 px-2 rounded shadow bg-red-500 hover:bg-red-700 text-white text-sm">Borrar</button>
            </div>
        </li>
    `).join('');
}

function handleAddOrUpdateDeuda() {
    const tipo = deudaTipoSelect.value;
    const descripcion = deudaDescripcionInput.value;
    const pagoMensual = deudaPagoMensualInput.value;
    const total = deudaTotalInput.value;

    if (!descripcion || !pagoMensual || !total) {
        alert('Por favor, complete todos los campos.');
        return;
    }

    if (editMode) {
        updateDeuda({ id: editId, tipo, descripcion, pagoMensual, total });
        editMode = false;
        editId = null;
        addDeudaBtn.textContent = 'Añadir Deuda';
        addDeudaBtn.classList.replace('bg-blue-500', 'bg-[#00FA9A]');
    } else {
        addDeuda({ tipo, descripcion, pagoMensual, total });
    }

    deudaDescripcionInput.value = '';
    deudaPagoMensualInput.value = '';
    deudaTotalInput.value = '';
    renderDeudas();
    updateResumen();
}

function handleListClick(event) {
    const id = parseInt(event.target.dataset.id);

    if (event.target.classList.contains('delete-deuda')) {
        if (confirm('¿Está seguro de que desea borrar esta deuda?')) {
            deleteDeuda(id);
            renderDeudas();
            updateResumen();
        }
    }

    if (event.target.classList.contains('edit-deuda')) {
        const deudas = getDeudas();
        const deudaToEdit = deudas.find(deuda => deuda.id === id);
        if (deudaToEdit) {
            deudaTipoSelect.value = deudaToEdit.tipo;
            deudaDescripcionInput.value = deudaToEdit.descripcion;
            deudaPagoMensualInput.value = deudaToEdit.pagoMensual;
            deudaTotalInput.value = deudaToEdit.total;

            editMode = true;
            editId = id;
            addDeudaBtn.textContent = 'Actualizar Deuda';
            addDeudaBtn.classList.replace('bg-[#00FA9A]', 'bg-blue-500');
            deudaDescripcionInput.focus();
        }
    }
}

export function initDeuda() {
    populateCategories();
    renderDeudas();
    addDeudaBtn.addEventListener('click', handleAddOrUpdateDeuda);
    deudasList.addEventListener('click', handleListClick);
}
