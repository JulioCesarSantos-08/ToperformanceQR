/***********************
  vehiculo.js
  - Muestra info del cliente
  - Muestra historial de servicios
  - Admin puede editar o agregar servicios
***********************/

import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Inicializar Firebase
const db = getDatabase();
const auth = getAuth();

const infoDiv = document.getElementById("infoCliente");
const listaServicios = document.getElementById("listaServicios");
const btnNuevoServicio = document.getElementById("btnNuevoServicio");
const nombreUsuario = document.getElementById("nombreUsuario");
const logoutBtn = document.getElementById("logoutBtn");

// Cerrar sesión
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
});

// Detectar login
onAuthStateChanged(auth, async (user) => {
  if (user) {
    nombreUsuario.textContent = user.email;

    const emailKey = user.email.replace(/\./g, "_");
    const clienteRef = ref(db, "clientes/" + emailKey);

    const snapshot = await get(clienteRef);
    if (snapshot.exists()) {
      const data = snapshot.val();

      // --- Mostrar info del cliente ---
      infoDiv.innerHTML = `
        <h2>${data.nombre}</h2>
        <p><b>Email:</b> ${data.email}</p>
        <p><b>Vehículo:</b> ${data.vehiculo?.modelo || "Sin modelo"} (${data.vehiculo?.placa || "Sin placa"})</p>
        ${data.vehiculo?.imagen ? `<img src="imagenes/${data.vehiculo.imagen}" alt="Vehículo de ${data.nombre}"/>` : ""}
      `;

      // --- Mostrar historial de servicios ---
      mostrarServicios(emailKey, data.servicios || {}, user.email);

      // Si es admin, mostrar botón para agregar servicios
      if (user.email === "admin@gmail.com") {
        btnNuevoServicio.style.display = "block";
        btnNuevoServicio.onclick = () => agregarServicio(emailKey);
      }
    } else {
      infoDiv.innerHTML = "<p>No se encontró información del cliente.</p>";
    }
  } else {
    window.location.href = "login.html";
  }
});

// --- Función para mostrar servicios ---
function mostrarServicios(emailKey, servicios, emailUser) {
  listaServicios.innerHTML = "";
  const keys = Object.keys(servicios);
  if (keys.length === 0) {
    listaServicios.innerHTML = "<p>No hay servicios registrados.</p>";
    return;
  }

  keys.forEach((key) => {
    const s = servicios[key];
    const card = document.createElement("div");
    card.className = "p-4 bg-white shadow rounded mb-3";

    card.innerHTML = `
      <h4>${s.nombre}</h4>
      <p><b>Fecha:</b> ${s.fecha}</p>
      <p><b>Descripción:</b> ${s.descripcion}</p>
      <p><b>Costo:</b> $${s.costo}</p>
      ${s.imagen ? `<img src="imagenes/${s.imagen}" class="w-40 rounded mt-2"/>` : ""}
      <div id="acciones-${key}"></div>
    `;

    // --- Si es admin, mostrar botón editar ---
    if (emailUser === "admin@gmail.com") {
      const btn = document.createElement("button");
      btn.textContent = "Editar";
      btn.className = "bg-blue-500 text-white px-3 py-1 mt-2 rounded hover:bg-blue-700";
      btn.onclick = () => editarServicio(emailKey, key, s);
      card.querySelector(`#acciones-${key}`).appendChild(btn);
    }

    listaServicios.appendChild(card);
  });
}

// --- Función para agregar nuevo servicio ---
async function agregarServicio(emailKey) {
  const nombre = prompt("Nombre del servicio:");
  const descripcion = prompt("Descripción del servicio:");
  const costo = prompt("Costo del servicio:");
  const fecha = prompt("Fecha (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
  const imagen = prompt("Imagen (opcional, ej: cambioaceite.png):");

  if (!nombre || !costo || !fecha) {
    alert("Por favor llena al menos nombre, costo y fecha.");
    return;
  }

  const nuevoServicio = { nombre, descripcion, costo, fecha, imagen };

  const serviciosRef = ref(db, `clientes/${emailKey}/servicios`);
  const snapshot = await get(serviciosRef);
  const servicios = snapshot.exists() ? snapshot.val() : {};

  const nuevoId = "s" + Date.now();
  servicios[nuevoId] = nuevoServicio;

  update(ref(db, `clientes/${emailKey}`), { servicios })
    .then(() => {
      alert("✅ Servicio agregado correctamente");
      location.reload();
    })
    .catch((err) => alert("Error: " + err.message));
}

// --- Función para editar un servicio ---
function editarServicio(emailKey, servicioKey, servicioData) {
  const nuevoNombre = prompt("Nuevo nombre del servicio:", servicioData.nombre);
  const nuevaFecha = prompt("Nueva fecha:", servicioData.fecha);
  const nuevaDescripcion = prompt("Nueva descripción:", servicioData.descripcion);
  const nuevoCosto = prompt("Nuevo costo:", servicioData.costo);

  if (nuevoNombre && nuevaFecha) {
    update(ref(db, `clientes/${emailKey}/servicios/${servicioKey}`), {
      nombre: nuevoNombre,
      fecha: nuevaFecha,
      descripcion: nuevaDescripcion,
      costo: nuevoCosto
    })
      .then(() => {
        alert("Servicio actualizado ✅");
        location.reload();
      })
      .catch((err) => {
        alert("Error: " + err.message);
      });
  }
}
