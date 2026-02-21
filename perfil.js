import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, get, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
apiKey: "AIzaSyBA_i9O3vXzFn2rIKY4XQzll2fLvmD-u3A",
authDomain: "toperformance-50d5a.firebaseapp.com",
databaseURL: "https://toperformance-50d5a-default-rtdb.firebaseio.com",
projectId: "toperformance-50d5a",
storageBucket: "toperformance-50d5a.appspot.com",
messagingSenderId: "1020165964748",
appId: "1:1020165964748:web:f05155f982eb4f2eaf9369"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const contenidoDiv = document.getElementById("contenido");
const adminForm = document.getElementById("adminForm");
const fab = document.querySelector(".fab");

let usuarioActual = null;
let esAdmin = false;
let clienteActivoKey = null;
let clienteEditandoKey = null;

onAuthStateChanged(auth, async (user) => {
if (user) {
usuarioActual = user;
if (user.email === "admin@gmail.com" || user.email === "ti43300@uvp.edu.mx") {
esAdmin = true;
adminForm.style.display = "block";
document.getElementById("bienvenido").innerText = "Panel de Administración";
if(fab) fab.style.display = "none";
cargarTodosClientes();
} else {
esAdmin = false;
adminForm.style.display = "none";
await buscarClientePorCorreo(user.email);
}
} else {
window.location.href = "index.html";
}
});

async function buscarClientePorCorreo(correo) {
const key = correo.replace(/[.#$[\]@]/g, "_");
const snap = await get(ref(db, "clientes/" + key));

if (snap.exists()) {
const cliente = snap.val();
clienteActivoKey = key;
document.getElementById("bienvenido").innerText = `Bienvenido, ${cliente.nombre}`;
mostrarCliente(key, cliente);
return;
}

const allSnap = await get(ref(db, "clientes"));
if (allSnap.exists()) {
let encontrado = null, k = null;
allSnap.forEach(c => {
if (c.val().email === correo) {
encontrado = c.val();
k = c.key;
}
});
if (encontrado) {
clienteActivoKey = k;
document.getElementById("bienvenido").innerText = `Bienvenido, ${encontrado.nombre}`;
mostrarCliente(k, encontrado);
return;
}
}

contenidoDiv.innerHTML = "<p>No se encontraron datos de tu cuenta.</p>";
}

window.logout = function() {
signOut(auth).then(() => {
localStorage.clear();
window.location.href = "index.html";
});
};

window.altaCliente = async function() {
if (!esAdmin) return;

const nombre = document.getElementById("nombre").value.trim();
const correo = document.getElementById("correo").value.trim();
const password = document.getElementById("password").value.trim();
const modelo = document.getElementById("modelo").value.trim();
const placa = document.getElementById("placa").value.trim();
const kilometraje = document.getElementById("kilometraje") ? document.getElementById("kilometraje").value.trim() : "";
const imagen = document.getElementById("imagen").value.trim();

if (!nombre || !correo || !modelo || !placa) return;

const key = correo.replace(/[.#$[\]@]/g, "_");

if (password) {
try {
await createUserWithEmailAndPassword(auth, correo, password);
} catch {}
}

await set(ref(db, "clientes/" + key), {
nombre,
email: correo,
vehiculo: { modelo, placa, kilometraje, imagen: imagen || "defaultcar.png" }
});

adminForm.reset();
cargarTodosClientes();
};

async function cargarTodosClientes() {
const snap = await get(ref(db, "clientes"));
contenidoDiv.innerHTML = "";
if (!snap.exists()) return;
snap.forEach(c => mostrarCliente(c.key, c.val()));
}

function mostrarCliente(key, cliente) {
const div = document.createElement("div");
div.classList.add("cliente-card");

div.innerHTML = `
<h3>${cliente.nombre}</h3>
<p><b>Email:</b> ${cliente.email}</p>
<p><b>Vehículo:</b> ${cliente.vehiculo.modelo} (${cliente.vehiculo.placa})</p>
<p><b>Kilometraje:</b> ${cliente.vehiculo.kilometraje || "No registrado"} km</p>
<img src="imagenes/${cliente.vehiculo.imagen}">
<input placeholder="Buscar servicio por nombre o fecha..." oninput="filtrarServicios('${key}', this.value)">
<div id="servicios-${key}"></div>
`;

if (esAdmin) {
const btnEditar = document.createElement("button");
btnEditar.innerText = "Editar Cliente";
btnEditar.onclick = () => editarCliente(key, cliente);

const btnEliminar = document.createElement("button");
btnEliminar.innerText = "Eliminar Cliente";
btnEliminar.classList.add("danger");
btnEliminar.onclick = () => eliminarCliente(key);

div.appendChild(btnEditar);
div.appendChild(btnEliminar);
}

contenidoDiv.appendChild(div);
cargarServicios(key);
}

function calcularEstado(fechaStr) {
if (!fechaStr) return {color:"#ccc",texto:"Sin fecha"};
const fecha = new Date(fechaStr);
const hoy = new Date();
const diffMeses = (hoy - fecha) / (1000 * 60 * 60 * 24 * 30);

if (diffMeses <= 2) return {color:"green",texto:"Cambio en buen estado"};
if (diffMeses <= 3) return {color:"orange",texto:"El cambio deberá realizarse pronto"};
return {color:"red",texto:"Se necesita realizar el cambio"};
}

async function cargarServicios(clienteKey) {
const cont = document.getElementById("servicios-" + clienteKey);
clienteActivoKey = clienteKey;
const snap = await get(ref(db, "clientes/" + clienteKey + "/servicios"));
cont.innerHTML = "<h4>Historial de servicios</h4>";

if (!snap.exists()) {
cont.innerHTML += "<p>No hay servicios registrados.</p>";
return;
}

const tabla = document.createElement("table");
tabla.classList.add("tabla-servicios");
tabla.innerHTML = `
<thead>
<tr>
<th>Fecha</th>
<th>Servicio</th>
<th>Descripción</th>
<th>Costo</th>
<th>Estado</th>
</tr>
</thead>
<tbody></tbody>
`;

const tbody = tabla.querySelector("tbody");

snap.forEach(s => {
const serv = s.val();
const estado = calcularEstado(serv.fecha);

const fila = document.createElement("tr");
fila.innerHTML = `
<td>${serv.fecha}</td>
<td>${serv.nombre}</td>
<td>${serv.descripcion}</td>
<td>$${serv.costo}</td>
<td style="color:${estado.color};font-weight:600;">${estado.texto}</td>
`;
tbody.appendChild(fila);

const card = document.createElement("div");
card.className = "servicio-card";
card.setAttribute("data-nombre", serv.nombre.toLowerCase());
card.setAttribute("data-fecha", serv.fecha);

card.innerHTML = `
<h4>${serv.nombre}</h4>
<small style="color:${estado.color};font-weight:600;">${serv.fecha} - ${estado.texto}</small>
<small>🧾 ${serv.descripcion}</small>
<b>💲 $${serv.costo}</b>
`;
cont.appendChild(card);
});

cont.appendChild(tabla);

if (esAdmin && fab) {
fab.style.display = "block";
fab.onclick = () => agregarServicio(clienteKey);
}
}

window.filtrarServicios = function(clienteKey, valor) {
valor = valor.toLowerCase();
const cards = document.querySelectorAll(`#servicios-${clienteKey} .servicio-card`);
cards.forEach(card => {
const nombre = card.getAttribute("data-nombre");
const fecha = card.getAttribute("data-fecha");
if (nombre.includes(valor) || fecha.includes(valor)) {
card.style.display = "block";
} else {
card.style.display = "none";
}
});
};

async function agregarServicio(clienteKey) {
const nombre = prompt("Nombre del servicio:");
const fecha = prompt("Fecha (YYYY-MM-DD):");
const descripcion = prompt("Descripción:");
const costo = prompt("Costo:");
if (!nombre || !fecha || !descripcion || !costo) return;

await push(ref(db, "clientes/" + clienteKey + "/servicios"), {
nombre, fecha, descripcion, costo
});

cargarServicios(clienteKey);
}

function editarCliente(key, cliente) {
clienteEditandoKey = key;
document.getElementById("editNombre").value = cliente.nombre;
document.getElementById("editCorreo").value = cliente.email;
document.getElementById("editModelo").value = cliente.vehiculo.modelo;
document.getElementById("editPlaca").value = cliente.vehiculo.placa;
if(document.getElementById("editKilometraje"))
document.getElementById("editKilometraje").value = cliente.vehiculo.kilometraje || "";
document.getElementById("editImagen").value = cliente.vehiculo.imagen;
document.getElementById("modalEditar").style.display = "flex";
}

window.guardarEdicionCliente = async function(event) {
event.preventDefault();
if (!clienteEditandoKey) return;

const nombre = document.getElementById("editNombre").value.trim();
const email = document.getElementById("editCorreo").value.trim();
const modelo = document.getElementById("editModelo").value.trim();
const placa = document.getElementById("editPlaca").value.trim();
const kilometraje = document.getElementById("editKilometraje") ? document.getElementById("editKilometraje").value.trim() : "";
const imagen = document.getElementById("editImagen").value.trim();

await update(ref(db, "clientes/" + clienteEditandoKey), {
nombre,
email,
vehiculo: { modelo, placa, kilometraje, imagen }
});

document.getElementById("modalEditar").style.display = "none";
clienteEditandoKey = null;
cargarTodosClientes();
};

window.closeModal = function() {
document.getElementById("modalEditar").style.display = "none";
clienteEditandoKey = null;
};

async function eliminarCliente(key) {
if (confirm("¿Eliminar este cliente y su historial?")) {
await remove(ref(db, "clientes/" + key));
cargarTodosClientes();
}
}
