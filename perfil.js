/********************
  perfil.js
  - Alta clientes (admin)
  - Mostrar clientes (admin/cliente)
  - Mostrar servicios por cliente
  - Editar / Eliminar cliente
  - Agregar / Editar / Eliminar servicios
********************/

// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, get, update, remove, child } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://TU_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "NUM",
  appId: "APP_ID"
};

// Inicializar
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const contenidoDiv = document.getElementById("contenido");
const serviciosDiv = document.getElementById("servicios");
const adminForm = document.getElementById("adminForm");

let usuarioActual = null;
let esAdmin = false;
let clienteEditandoKey = null;

// =========================
// Sesión
// =========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioActual = user;
    document.getElementById("bienvenido").innerText = "Bienvenido: " + user.email;

    if (user.email === "admin@gmail.com") {
      esAdmin = true;
      adminForm.style.display = "block";
      cargarTodosClientes();
    } else {
      esAdmin = false;
      adminForm.style.display = "none";
      cargarCliente(user.email.replace(/\./g, "_"));
    }
  } else {
    window.location.href = "perfil.html";
  }
});

window.logout = function() {
  signOut(auth);
};

// =========================
// Alta cliente
// =========================
window.altaCliente = async function() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const password = document.getElementById("password").value.trim();
  const modelo = document.getElementById("modelo").value.trim();
  const placa = document.getElementById("placa").value.trim();
  const imagen = document.getElementById("imagen").value.trim();

  if (!nombre || !correo || !modelo || !placa) {
    alert("Faltan datos");
    return;
  }

  const key = correo.replace(/\./g, "_");

  if (password) {
    try {
      await createUserWithEmailAndPassword(auth, correo, password);
      alert("Usuario creado en Auth");
    } catch (err) {
      console.warn("No se pudo crear en Auth:", err.message);
    }
  }

  await set(ref(db, "clientes/" + key), {
    nombre, email: correo, vehiculo: { modelo, placa, imagen }
  });

  alert("Cliente guardado");
  document.getElementById("nombre").value = "";
  document.getElementById("correo").value = "";
  document.getElementById("password").value = "";
  document.getElementById("modelo").value = "";
  document.getElementById("placa").value = "";
  document.getElementById("imagen").value = "";

  cargarTodosClientes();
};

// =========================
// Cargar datos
// =========================
async function cargarCliente(key) {
  const snap = await get(ref(db, "clientes/" + key));
  if (!snap.exists()) {
    contenidoDiv.innerHTML = "<p>No hay datos de este cliente</p>";
    return;
  }
  mostrarCliente(snap.key, snap.val());
}

async function cargarTodosClientes() {
  const snap = await get(ref(db, "clientes"));
  contenidoDiv.innerHTML = "";
  if (!snap.exists()) {
    contenidoDiv.innerHTML = "<p>No hay clientes</p>";
    return;
  }
  snap.forEach(c => mostrarCliente(c.key, c.val()));
}

function mostrarCliente(key, cliente) {
  const div = document.createElement("div");
  div.classList.add("cliente-card");
  div.innerHTML = `
    <h3>${cliente.nombre}</h3>
    <p><b>Email:</b> ${cliente.email}</p>
    <p><b>Vehículo:</b> ${cliente.vehiculo.modelo} (${cliente.vehiculo.placa})</p>
    <img src="imagenes/${cliente.vehiculo.imagen}" alt="Auto" style="max-width:200px">
    <div id="servicios-${key}"></div>
  `;

  if (esAdmin) {
    const btnEditar = document.createElement("button");
    btnEditar.innerText = "Editar";
    btnEditar.onclick = () => editarCliente(key, cliente);

    const btnEliminar = document.createElement("button");
    btnEliminar.innerText = "Eliminar";
    btnEliminar.onclick = () => eliminarCliente(key);

    div.appendChild(btnEditar);
    div.appendChild(btnEliminar);
  }

  contenidoDiv.appendChild(div);
  cargarServicios(key);
}

// =========================
// Servicios
// =========================
async function cargarServicios(clienteKey) {
  const cont = document.getElementById("servicios-" + clienteKey);
  const snap = await get(ref(db, "clientes/" + clienteKey + "/servicios"));
  cont.innerHTML = "<h4>Servicios</h4>";

  if (!snap.exists()) {
    cont.innerHTML += "<p>No hay servicios</p>";
    return;
  }

  snap.forEach(s => {
    const serv = s.val();
    const div = document.createElement("div");
    div.classList.add("servicio-card");
    div.innerHTML = `
      <p><b>Fecha:</b> ${serv.fecha}</p>
      <p><b>Descripción:</b> ${serv.descripcion}</p>
      <p><b>Costo:</b> $${serv.costo}</p>
    `;
    if (esAdmin) {
      const btnEliminar = document.createElement("button");
      btnEliminar.innerText = "Eliminar Servicio";
      btnEliminar.onclick = () => eliminarServicio(clienteKey, s.key);
      div.appendChild(btnEliminar);
    }
    cont.appendChild(div);
  });

  if (esAdmin) {
    const btnNuevo = document.createElement("button");
    btnNuevo.innerText = "Agregar Servicio";
    btnNuevo.onclick = () => agregarServicio(clienteKey);
    cont.appendChild(btnNuevo);
  }
}

async function agregarServicio(clienteKey) {
  const fecha = prompt("Fecha del servicio:");
  const descripcion = prompt("Descripción:");
  const costo = prompt("Costo:");

  if (!fecha || !descripcion || !costo) return;

  await push(ref(db, "clientes/" + clienteKey + "/servicios"), { fecha, descripcion, costo });
  cargarServicios(clienteKey);
}

async function eliminarServicio(clienteKey, servicioKey) {
  if (confirm("¿Eliminar servicio?")) {
    await remove(ref(db, "clientes/" + clienteKey + "/servicios/" + servicioKey));
    cargarServicios(clienteKey);
  }
}

// =========================
// Editar / Eliminar cliente
// =========================
function editarCliente(key, cliente) {
  clienteEditandoKey = key;
  document.getElementById("editNombre").value = cliente.nombre;
  document.getElementById("editCorreo").value = cliente.email;
  document.getElementById("editModelo").value = cliente.vehiculo.modelo;
  document.getElementById("editPlaca").value = cliente.vehiculo.placa;
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
  const imagen = document.getElementById("editImagen").value.trim();

  await update(ref(db, "clientes/" + clienteEditandoKey), {
    nombre, email, vehiculo: { modelo, placa, imagen }
  });

  alert("Cliente actualizado");
  document.getElementById("modalEditar").style.display = "none";
  clienteEditandoKey = null;
  cargarTodosClientes();
};

window.closeModal = function() {
  document.getElementById("modalEditar").style.display = "none";
  clienteEditandoKey = null;
};

async function eliminarCliente(key) {
  if (confirm("¿Eliminar cliente y sus servicios?")) {
    await remove(ref(db, "clientes/" + key));
    cargarTodosClientes();
  }
}