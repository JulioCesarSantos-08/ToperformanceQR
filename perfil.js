/********************
  perfil.js FINAL 2025 (versión mejorada)
  - Muestra nombre del cliente en saludo
  - Historial de servicios tipo tabla con bordes y colores dinámicos de fecha
  - Totalmente centrado y responsivo
  - Compatible con admin y usuarios normales
********************/

// =========================
// Importar Firebase
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, push, set, get, update, remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
  getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// =========================
// Configuración Firebase
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyBA_i9O3vXzFn2rIKY4XQzll2fLvmD-u3A",
  authDomain: "toperformance-50d5a.firebaseapp.com",
  databaseURL: "https://toperformance-50d5a-default-rtdb.firebaseio.com",
  projectId: "toperformance-50d5a",
  storageBucket: "toperformance-50d5a.appspot.com",
  messagingSenderId: "1020165964748",
  appId: "1:1020165964748:web:f05155f982eb4f2eaf9369"
};

// =========================
// Inicialización
// =========================
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const contenidoDiv = document.getElementById("contenido");
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

    if (user.email === "admin@gmail.com" || user.email === "ti43300@uvp.edu.mx") {
      esAdmin = true;
      adminForm.style.display = "block";
      document.getElementById("bienvenido").innerText = "Panel de Administración";
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

// =========================
// Buscar cliente por correo
// =========================
async function buscarClientePorCorreo(correo) {
  const key = correo.replace(/[.#$[\]@]/g, "_");
  const refCliente = ref(db, "clientes/" + key);
  const snap = await get(refCliente);

  if (snap.exists()) {
    const cliente = snap.val();
    document.getElementById("bienvenido").innerText = `Bienvenido, ${cliente.nombre}`;
    mostrarCliente(key, cliente);
    return;
  }

  // Buscar entre todos los clientes
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
      document.getElementById("bienvenido").innerText = `Bienvenido, ${encontrado.nombre}`;
      mostrarCliente(k, encontrado);
      return;
    }
  }

  document.getElementById("bienvenido").innerText = "Bienvenido";
  contenidoDiv.innerHTML = "<p>No se encontraron datos de tu cuenta.</p>";
}

// =========================
// Cerrar sesión
// =========================
window.logout = function() {
  signOut(auth).then(() => {
    localStorage.clear();
    window.location.href = "index.html";
  });
};

// =========================
// Alta cliente (solo admin)
// =========================
window.altaCliente = async function() {
  if (!esAdmin) return;

  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const password = document.getElementById("password").value.trim();
  const modelo = document.getElementById("modelo").value.trim();
  const placa = document.getElementById("placa").value.trim();
  const imagen = document.getElementById("imagen").value.trim();

  if (!nombre || !correo || !modelo || !placa) {
    alert("Por favor completa todos los campos requeridos.");
    return;
  }

  const key = correo.replace(/[.#$[\]@]/g, "_");

  if (password) {
    try {
      await createUserWithEmailAndPassword(auth, correo, password);
      alert("Usuario creado en Firebase Authentication.");
    } catch (err) {
      console.warn("Error creando usuario en Auth:", err.message);
    }
  }

  await set(ref(db, "clientes/" + key), {
    nombre,
    email: correo,
    vehiculo: { modelo, placa, imagen: imagen || "defaultcar.png" }
  });

  alert("Cliente guardado correctamente.");
  document.getElementById("adminForm").reset();
  cargarTodosClientes();
};

// =========================
// Cargar clientes
// =========================
async function cargarCliente(key) {
  const snap = await get(ref(db, "clientes/" + key));
  contenidoDiv.innerHTML = "";
  if (!snap.exists()) {
    contenidoDiv.innerHTML = "<p>No hay datos de este cliente.</p>";
    return;
  }
  mostrarCliente(snap.key, snap.val());
}

async function cargarTodosClientes() {
  const snap = await get(ref(db, "clientes"));
  contenidoDiv.innerHTML = "";
  if (!snap.exists()) {
    contenidoDiv.innerHTML = "<p>No hay clientes registrados.</p>";
    return;
  }
  snap.forEach(c => mostrarCliente(c.key, c.val()));
}

// =========================
// Mostrar cliente + servicios
// =========================
function mostrarCliente(key, cliente) {
  const div = document.createElement("div");
  div.classList.add("cliente-card");
  div.style.margin = "auto"; // Centrado
  div.style.maxWidth = "900px"; // Ancho máximo

  div.innerHTML = `
    <h3>${cliente.nombre}</h3>
    <p><b>Email:</b> ${cliente.email}</p>
    <p><b>Vehículo:</b> ${cliente.vehiculo.modelo} (${cliente.vehiculo.placa})</p>
    <img src="imagenes/${cliente.vehiculo.imagen}" alt="Auto del cliente" 
      style="max-width:100%; border-radius:10px; margin:10px 0;">
    <div id="servicios-${key}" class="servicios-section"></div>
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

// =========================
// Tabla con color dinámico de fecha
// =========================
function calcularColorFecha(fechaStr) {
  if (!fechaStr) return "#ccc";

  const fecha = new Date(fechaStr);
  const hoy = new Date();
  const diffDias = (hoy - fecha) / (1000 * 60 * 60 * 24);

  if (diffDias <= 30) return "green";      // menos de 1 mes
  if (diffDias <= 60) return "orange";     // 1 a 2 meses
  return "red";                            // más de 2 meses
}

// =========================
// Servicios del cliente
// =========================
async function cargarServicios(clienteKey) {
  const cont = document.getElementById("servicios-" + clienteKey);
  const snap = await get(ref(db, "clientes/" + clienteKey + "/servicios"));
  cont.innerHTML = `<h4>🧰 Historial de servicios</h4>`;

  if (!snap.exists()) {
    cont.innerHTML += "<p>No hay servicios registrados.</p>";
  } else {
    const tabla = document.createElement("table");
    tabla.classList.add("tabla-servicios");
    tabla.style.borderCollapse = "collapse";
    tabla.style.width = "100%";
    tabla.style.marginTop = "10px";

    tabla.innerHTML = `
      <thead style="background:#d00000; color:white;">
        <tr>
          <th style="border:1px solid #ccc; padding:8px;">📅 Fecha</th>
          <th style="border:1px solid #ccc; padding:8px;">🔧 Servicio</th>
          <th style="border:1px solid #ccc; padding:8px;">🧾 Descripción</th>
          <th style="border:1px solid #ccc; padding:8px;">💲 Costo</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = tabla.querySelector("tbody");
    snap.forEach(s => {
      const serv = s.val();
      const fila = document.createElement("tr");
      const colorFecha = calcularColorFecha(serv.fecha);
      fila.innerHTML = `
        <td style="border:1px solid #ccc; padding:8px; color:${colorFecha}; font-weight:600;">
          ${serv.fecha || "-"}
        </td>
        <td style="border:1px solid #ccc; padding:8px;">${serv.nombre || "Sin nombre"}</td>
        <td style="border:1px solid #ccc; padding:8px;">${serv.descripcion || "-"}</td>
        <td style="border:1px solid #ccc; padding:8px;">$${serv.costo || "0"}</td>
      `;
      tbody.appendChild(fila);
    });

    cont.appendChild(tabla);
  }

  if (esAdmin) {
    const btnNuevo = document.createElement("button");
    btnNuevo.innerText = "Agregar Servicio";
    btnNuevo.onclick = () => agregarServicio(clienteKey);
    cont.appendChild(btnNuevo);
  }
}

// =========================
// Agregar servicio (admin)
// =========================
async function agregarServicio(clienteKey) {
  const nombre = prompt("Nombre del servicio:");
  const fecha = prompt("Fecha del servicio (YYYY-MM-DD):");
  const descripcion = prompt("Descripción del servicio:");
  const costo = prompt("Costo del servicio:");

  if (!nombre || !fecha || !descripcion || !costo) return;

  await push(ref(db, "clientes/" + clienteKey + "/servicios"), {
    nombre, fecha, descripcion, costo
  });

  cargarServicios(clienteKey);
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

  alert("Cliente actualizado correctamente.");
  document.getElementById("modalEditar").style.display = "none";
  clienteEditandoKey = null;
  cargarTodosClientes();
};

window.closeModal = function() {
  document.getElementById("modalEditar").style.display = "none";
  clienteEditandoKey = null;
};

async function eliminarCliente(key) {
  if (confirm("¿Eliminar este cliente y su historial de servicios?")) {
    await remove(ref(db, "clientes/" + key));
    cargarTodosClientes();
  }
}
