/***********************
  vehiculo.js
  - Muestra info del cliente
  - Muestra historial de servicios
  - Admin puede editar servicios
***********************/

import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Inicializar Firebase
const db = getDatabase();
const auth = getAuth();

const infoDiv = document.getElementById("infoCliente");
const serviciosDiv = document.getElementById("historialServicios");

// Detectar login
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const emailKey = user.email.replace(/\./g, "_"); // transformar correo para usar como clave
    const clienteRef = ref(db, "clientes/" + emailKey);

    const snapshot = await get(clienteRef);
    if (snapshot.exists()) {
      const data = snapshot.val();

      // --- Mostrar info del cliente ---
      infoDiv.innerHTML = `
        <h2>${data.nombre}</h2>
        <p><b>Email:</b> ${data.email}</p>
        <p><b>Vehículo:</b> ${data.vehiculo.modelo} (${data.vehiculo.placa})</p>
        <img src="imagenes/${data.vehiculo.imagen}" class="w-64 rounded-lg shadow-md mt-2"/>
      `;

      // --- Mostrar historial de servicios ---
      if (data.servicios) {
        serviciosDiv.innerHTML = "<h3>Historial de Servicios</h3>";
        Object.keys(data.servicios).forEach((key) => {
          const s = data.servicios[key];
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
          if (user.email === "admin@gmail.com") {
            const btn = document.createElement("button");
            btn.textContent = "Editar";
            btn.className = "bg-blue-500 text-white px-3 py-1 mt-2 rounded hover:bg-blue-700";
            btn.onclick = () => editarServicio(emailKey, key, s);
            card.querySelector(`#acciones-${key}`).appendChild(btn);
          }

          serviciosDiv.appendChild(card);
        });
      } else {
        serviciosDiv.innerHTML = "<p>No hay servicios registrados.</p>";
      }
    } else {
      infoDiv.innerHTML = "<p>No se encontró información de este cliente.</p>";
    }
  } else {
    window.location.href = "index.html"; // si no está logueado, redirigir
  }
});

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
    }).then(() => {
      alert("Servicio actualizado ✅");
      location.reload();
    }).catch((err) => {
      alert("Error: " + err.message);
    });
  }
}