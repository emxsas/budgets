const APP_STATE_KEY = 'budgetAppData';

const defaultState = {
    ingresos: [],
    gastos: [],
    deudas: [],
    executedPayments: [],
    appliedIncomes: [],
    categories: {
        ingresos: ["Salario", "Ventas", "Regalo", "Otros"],
        gastos: ["Comida", "Transporte", "Vivienda", "Ocio", "Facturas", "Otros"],
        deudas: ["Tarjeta de Crédito", "Préstamo Personal", "Hipoteca", "Estudios"]
    }
};

/**
 * Initializes the state in localStorage if it doesn't exist.
 */
export function initState() {
    if (!localStorage.getItem(APP_STATE_KEY)) {
        console.log("No state found, initializing with default state.");
        localStorage.setItem(APP_STATE_KEY, JSON.stringify(defaultState));
    }
}

/**
 * Retrieves the entire application state from localStorage.
 * @returns {object} The application state.
 */
export function getState() {
    const storedState = localStorage.getItem(APP_STATE_KEY);
    const state = storedState ? JSON.parse(storedState) : defaultState;
    // Ensure that the state is always in sync with the default state structure
    return { ...defaultState, ...state };
}

/**
 * Saves the entire application state to localStorage.
 * @param {object} state The application state to save.
 */
export function saveState(state) {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}

// --- Data modification functions ---

// --- Ingresos Functions ---

export function addIngreso(ingreso) {
    const state = getState();
    state.ingresos.push({ id: Date.now(), ...ingreso });
    saveState(state);
}

export function getIngresos() {
    return getState().ingresos;
}

export function deleteIngreso(id) {
    const state = getState();
    state.ingresos = state.ingresos.filter(ingreso => ingreso.id !== id);
    saveState(state);
}

export function updateIngreso(updatedIngreso) {
    const state = getState();
    state.ingresos = state.ingresos.map(ingreso =>
        ingreso.id === updatedIngreso.id ? updatedIngreso : ingreso
    );
    saveState(state);
}

export function getIngresoCategories() {
    return getState().categories.ingresos;
}

// --- Gastos Functions ---

export function addGasto(gasto) {
    const state = getState();
    state.gastos.push({ id: Date.now(), ...gasto });
    saveState(state);
}

export function getGastos() {
    return getState().gastos;
}

export function deleteGasto(id) {
    const state = getState();
    state.gastos = state.gastos.filter(gasto => gasto.id !== id);
    saveState(state);
}

export function updateGasto(updatedGasto) {
    const state = getState();
    state.gastos = state.gastos.map(gasto =>
        gasto.id === updatedGasto.id ? updatedGasto : gasto
    );
    saveState(state);
}

export function getGastoCategories() {
    return getState().categories.gastos;
}

// --- Deudas Functions ---

export function addDeuda(deuda) {
    const state = getState();
    state.deudas.push({ id: Date.now(), ...deuda });
    saveState(state);
}

// --- Executed Payments Functions ---

export function addExecutedPayment(paymentId) {
    const state = getState();
    if (!state.executedPayments.includes(paymentId)) {
        state.executedPayments.push(paymentId);
        saveState(state);
    }
}

export function removeExecutedPayment(paymentId) {
    const state = getState();
    state.executedPayments = state.executedPayments.filter(id => id !== paymentId);
    saveState(state);
}

export function getExecutedPayments() {
    return getState().executedPayments;
}

// --- Applied Incomes Functions ---

export function addAppliedIncome(incomeId) {
    const state = getState();
    if (!state.appliedIncomes.includes(incomeId)) {
        state.appliedIncomes.push(incomeId);
        saveState(state);
    }
}

export function removeAppliedIncome(incomeId) {
    const state = getState();
    state.appliedIncomes = state.appliedIncomes.filter(id => id !== incomeId);
    saveState(state);
}

export function getAppliedIncomes() {
    return getState().appliedIncomes;
}

export function getDeudas() {
    return getState().deudas;
}

export function deleteDeuda(id) {
    const state = getState();
    state.deudas = state.deudas.filter(deuda => deuda.id !== id);
    saveState(state);
}

export function updateDeuda(updatedDeuda) {
    const state = getState();
    state.deudas = state.deudas.map(deuda =>
        deuda.id === updatedDeuda.id ? updatedDeuda : deuda
    );
    saveState(state);
}

export function getDeudaCategories() {
    return getState().categories.deudas;
}

// --- Category Management Functions ---

function addCategory(type, category) {
    const state = getState();
    if (!state.categories[type].includes(category)) {
        state.categories[type].push(category);
        saveState(state);
    }
}

function deleteCategory(type, category) {
    const state = getState();
    state.categories[type] = state.categories[type].filter(c => c !== category);
    saveState(state);
}

export const addIngresoCategory = (category) => addCategory('ingresos', category);
export const deleteIngresoCategory = (category) => deleteCategory('ingresos', category);

export const addGastoCategory = (category) => addCategory('gastos', category);
export const deleteGastoCategory = (category) => deleteCategory('gastos', category);

export const addDeudaCategory = (category) => addCategory('deudas', category);
export const deleteDeudaCategory = (category) => deleteCategory('deudas', category);
