// 1. CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCsvZHZ3r8mazSijXy_rKCqa8qCPvXqqW4",
    authDomain: "certificacion-935.firebaseapp.com",
    databaseURL: "https://certificacion-935-default-rtdb.firebaseio.com",
    projectId: "certificacion-935",
    storageBucket: "certificacion-935.firebasestorage.app",
    messagingSenderId: "688990161818",
    appId: "1:688990161818:web:69d1fce898c2b7ec6c8823",
    measurementId: "G-7ZN3DR0KEM"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Arreglos en memoria
let pendientes = [];
let clientes = [];
let realizados = [];

// Escuchar cambios en tiempo real desde Firebase
db.ref('inventario_truper').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        pendientes = data.pendientes || [];
        clientes = data.clientes || [];
        realizados = data.realizados || [];
    } else {
        pendientes = [];
        clientes = [];
        realizados = [];
    }
    renderizarTablas();
});

// Elementos DOM
const form = document.getElementById('form-faltante');
const inputCodigo = document.getElementById('codigo');
const inputNombre = document.getElementById('nombre');
const selectMarca = document.getElementById('marca');
const selectTipoRegistro = document.getElementById('tipo-registro');

// Campos de Cliente
const seccionClienteOpciones = document.getElementById('seccion-cliente-opciones');
const seccionDomicilioCampos = document.getElementById('seccion-domicilio-campos');
const selectTipoEntrega = document.getElementById('tipo-entrega');
const inputNombreCliente = document.getElementById('nombre-cliente');
const inputTelCliente = document.getElementById('tel-cliente');
const inputDireccion = document.getElementById('direccion-entrega');
const inputReferencias = document.getElementById('referencias');
const inputLinkMaps = document.getElementById('link-maps');

const inputBusqueda = document.getElementById('input-busqueda');
const listaPendientes = document.getElementById('lista-pendientes');
const listaClientes = document.getElementById('lista-clientes');
const listaRealizados = document.getElementById('lista-realizados');
const mensajeAlerta = document.getElementById('mensaje-alerta');

// Abrir Google Maps desde el formulario
function abrirGoogleMapsFormulario() {
    const enlaceIngresado = inputLinkMaps ? inputLinkMaps.value.trim() : '';
    
    if (enlaceIngresado) {
        if (enlaceIngresado.startsWith('http://') || enlaceIngresado.startsWith('https://')) {
            window.open(enlaceIngresado, '_blank');
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enlaceIngresado)}`, '_blank');
        }
    } else {
        window.open('https://maps.google.com', '_blank');
    }
}

// Evaluar desplegables de formulario
function evaluarOpcionesCliente() {
    if (!selectTipoRegistro) return;
    const esCliente = selectTipoRegistro.value === 'cliente';
    if (esCliente) {
        if (seccionClienteOpciones) seccionClienteOpciones.classList.remove('oculta');
        if (selectTipoEntrega && selectTipoEntrega.value === 'domicilio') {
            if (seccionDomicilioCampos) seccionDomicilioCampos.classList.remove('oculta');
        } else {
            if (seccionDomicilioCampos) seccionDomicilioCampos.classList.add('oculta');
        }
    } else {
        if (seccionClienteOpciones) seccionClienteOpciones.classList.add('oculta');
        if (seccionDomicilioCampos) seccionDomicilioCampos.classList.add('oculta');
    }
}

// Sincronizar con Firebase y LocalStorage
function guardarEnStorage() {
    localStorage.setItem('pendientes_truper', JSON.stringify(pendientes));
    localStorage.setItem('clientes_truper', JSON.stringify(clientes));
    localStorage.setItem('realizados_truper', JSON.stringify(realizados));

    db.ref('inventario_truper').set({
        pendientes: pendientes,
        clientes: clientes,
        realizados: realizados
    });
}

function obtenerFechaHoraActual() {
    const ahora = new Date();
    return ahora.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + 
           ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// Formulario Submit
if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const codigo = inputCodigo.value.trim() || 'S/C';
        const nombre = inputNombre.value.trim();
        const marca = selectMarca.value;
        const tipo = selectTipoRegistro.value;
        const fecha = obtenerFechaHoraActual();

        if (!nombre) return;

        // Duplicados
        if (codigo !== 'S/C') {
            const existe = pendientes.some(p => p.codigo.toLowerCase() === codigo.toLowerCase()) ||
                           clientes.some(p => p.codigo.toLowerCase() === codigo.toLowerCase()) ||
                           realizados.some(p => p.codigo.toLowerCase() === codigo.toLowerCase());

            if (existe) {
                mostrarAlerta(`⚠️ El código "${codigo}" ya se encuentra registrado.`);
                return;
            }
        }

        if (tipo === 'faltante') {
            pendientes.push({ codigo, nombre, marca, fecha });
        } else {
            clientes.push({
                codigo,
                nombre,
                marca,
                fecha,
                entrega: selectTipoEntrega ? selectTipoEntrega.value : 'tienda',
                clienteNombre: inputNombreCliente ? inputNombreCliente.value.trim() || 'Anónimo' : 'Anónimo',
                clienteTel: inputTelCliente ? inputTelCliente.value.trim() || 'Sin número' : 'Sin número',
                direccion: inputDireccion ? inputDireccion.value.trim() || 'Sin dirección' : 'Sin dirección',
                referencias: inputReferencias ? inputReferencias.value.trim() || 'Sin referencias' : 'Sin referencias',
                maps: inputLinkMaps ? inputLinkMaps.value.trim() || '' : ''
            });
        }

        guardarEnStorage();
        form.reset();
        evaluarOpcionesCliente();
        ocultarAlerta();
    });
}

if (inputBusqueda) {
    inputBusqueda.addEventListener('input', renderizarTablas);
}

// Mover a completados
function marcarComoRealizado(origen, index) {
    let item;
    if (origen === 'pendientes') item = pendientes.splice(index, 1)[0];
    if (origen === 'clientes') item = clientes.splice(index, 1)[0];

    if (item) {
        realizados.push(item);
        guardarEnStorage();
    }
}

// Regresar de completados a pendientes
function regresarAPendientes(index) {
    const item = realizados.splice(index, 1)[0];
    if (item) {
        if (item.clienteNombre || item.direccion) {
            clientes.push(item);
        } else {
            pendientes.push(item);
        }
        guardarEnStorage();
    }
}

function eliminarItem(listaNombre, index) {
    if (listaNombre === 'pendientes') pendientes.splice(index, 1);
    if (listaNombre === 'clientes') clientes.splice(index, 1);
    if (listaNombre === 'realizados') realizados.splice(index, 1);

    guardarEnStorage();
}

function limpiarLista(listaNombre) {
    if (confirm(`¿Borrar todos los registros de esta lista?`)) {
        if (listaNombre === 'pendientes') pendientes = [];
        if (listaNombre === 'clientes') clientes = [];
        if (listaNombre === 'realizados') realizados = [];

        guardarEnStorage();
    }
}

// Renderizar Clientes
function renderizarClientes() {
    if (!listaClientes) return;
    const filtro = inputBusqueda ? inputBusqueda.value.trim().toLowerCase() : '';
    listaClientes.innerHTML = '';

    const filtrados = clientes.filter(item => 
        item.codigo.toLowerCase().includes(filtro) ||
        item.nombre.toLowerCase().includes(filtro) ||
        (item.clienteNombre && item.clienteNombre.toLowerCase().includes(filtro)) ||
        (item.clienteTel && item.clienteTel.toLowerCase().includes(filtro))
    );

    if (filtrados.length === 0) {
        listaClientes.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#777;">No hay pedidos de clientes registrados.</td></tr>`;
        return;
    }

    filtrados.forEach((prod, index) => {
        const fila = document.createElement('tr');
        const esDomicilio = prod.entrega === 'domicilio';

        if (!esDomicilio) {
            fila.classList.add('fila-recoge');
        } else {
            fila.classList.add('fila-domicilio');
        }

        const badgeEntrega = esDomicilio ? 
            `<span class="badge-domicilio">ENVÍO A DOMICILIO</span>` : 
            `<span class="badge-recoge">RECOGE EN TIENDA</span>`;

        let detallesEnvio = 'N/A (Recoge en Tienda)';
        if (esDomicilio) {
            let urlMapa = prod.maps;
            if (!urlMapa && prod.direccion !== 'Sin dirección') {
                urlMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prod.direccion)}`;
            }

            const botonMapa = urlMapa ? `<br><a href="${urlMapa}" target="_blank" class="btn-ver-mapa-tabla no-imprimir">🗺️ Abrir en Google Maps</a>` : '';
            detallesEnvio = `<strong>Dir:</strong> ${prod.direccion}<br><strong>Ref:</strong> ${prod.referencias}${botonMapa}`;
        }

        fila.innerHTML = `
            <td>${index + 1}</td>
            <td><small>${prod.fecha}</small></td>
            <td><strong>${prod.codigo}</strong><br><small>${prod.marca}</small> - ${prod.nombre}</td>
            <td><strong>${prod.clienteNombre}</strong><br>📞 ${prod.clienteTel}</td>
            <td>${badgeEntrega}</td>
            <td>${detallesEnvio}</td>
            <td><span class="badge-pendiente">PENDIENTE</span></td>
            <td class="no-imprimir">
                <button class="btn-marcar-pedido" onclick="marcarComoRealizado('clientes', ${index})">✅ Realizado</button>
                <button class="btn-eliminar" onclick="eliminarItem('clientes', ${index})">🗑️ Quitar</button>
            </td>
        `;
        listaClientes.appendChild(fila);
    });
}

// Renderizar Pendientes / Realizados
function renderizarStandard(arreglo, contenedor, badgeClase, badgeTexto, origen) {
    if (!contenedor) return;
    const filtro = inputBusqueda ? inputBusqueda.value.trim().toLowerCase() : '';
    contenedor.innerHTML = '';

    const filtrados = arreglo.filter(item => 
        item.codigo.toLowerCase().includes(filtro) ||
        item.nombre.toLowerCase().includes(filtro) ||
        item.marca.toLowerCase().includes(filtro)
    );

    if (filtrados.length === 0) {
        contenedor.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#777;">Sin registros.</td></tr>`;
        return;
    }

    filtrados.forEach((prod, index) => {
        const fila = document.createElement('tr');
        let botonAccion = '';
        if (origen !== 'realizados') {
            botonAccion = `<button class="btn-marcar-pedido" onclick="marcarComoRealizado('${origen}', ${index})">✅ Realizado</button>`;
        } else {
            botonAccion = `<button class="btn-marcar-pedido" style="background-color: #f39c12;" onclick="regresarAPendientes(${index})">↩️ Regresar</button>`;
        }

        fila.innerHTML = `
            <td>${index + 1}</td>
            <td><small>${prod.fecha}</small></td>
            <td><strong>${prod.codigo}</strong></td>
            <td>${prod.marca}</td>
            <td>${prod.nombre}</td>
            <td><span class="${badgeClase}">${badgeTexto}</span></td>
            <td class="no-imprimir">
                ${botonAccion}
                <button class="btn-eliminar" onclick="eliminarItem('${origen}', ${index})">🗑️ Quitar</button>
            </td>
        `;
        contenedor.appendChild(fila);
    });
}

// --- FUNCIONES DE IMPRESIÓN ---
function ejecutarImpresion(idSeccion, filtroSoloDomicilio = false) {
    const seccion = document.getElementById(idSeccion);
    if (!seccion) return;

    seccion.classList.add('seccion-imprimir-activa');
    if (filtroSoloDomicilio) {
        document.body.classList.add('imprimir-solo-domicilio');
    }

    window.print();

    seccion.classList.remove('seccion-imprimir-activa');
    document.body.classList.remove('imprimir-solo-domicilio');
}

function imprimirPendientes() {
    ejecutarImpresion('seccion-pendientes');
}

function imprimirClientes() {
    ejecutarImpresion('seccion-clientes');
}

function imprimirEnviosDomicilio() {
    ejecutarImpresion('seccion-clientes', true);
}

function imprimirRealizados() {
    ejecutarImpresion('seccion-realizados');
}

function renderizarTablas() {
    renderizarStandard(pendientes, listaPendientes, 'badge-pendiente', 'PENDIENTE', 'pendientes');
    renderizarClientes();
    renderizarStandard(realizados, listaRealizados, 'badge-realizado', 'COMPLETADO', 'realizados');
}

function mostrarAlerta(msj) {
    if (!mensajeAlerta) return;
    mensajeAlerta.textContent = msj;
    mensajeAlerta.className = 'alerta alerta-duplicado';
}

function ocultarAlerta() {
    if (!mensajeAlerta) return;
    mensajeAlerta.textContent = '';
    mensajeAlerta.className = 'alerta oculta';
}