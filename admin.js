import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, set, get, push, update, remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
  getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

const logoutBtn = document.getElementById("logoutBtn");
const formAltaCliente = document.getElementById("formAltaCliente");
const formServicio = document.getElementById("formServicio");
const listaClientes = document.getElementById("listaClientes");
const clienteSelect = document.getElementById("clienteSelect");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    document.getElementById("adminEmail").innerText = user.email;
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ======================================================
// 🚨 EVITAR DUPLICADOS AL REGISTRAR CLIENTE
// ======================================================

formAltaCliente.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombreCliente").value.trim();
  const correo = document.getElementById("emailCliente").value.trim();
  const password = document.getElementById("passwordCliente").value.trim();
  const modelo = document.getElementById("modeloVehiculo").value.trim();
  const placa = document.getElementById("placaVehiculo").value.trim();
  const imagen = document.getElementById("imagenVehiculo").value.trim();

  if (!nombre || !correo || !modelo || !placa) {
    alert("Por favor completa todos los campos requeridos.");
    return;
  }

  const key = correo.replace(/\./g, "_");

  // 🔍 Verificar si ya existe el cliente
  const existing = await get(ref(db, "clientes/" + key));

  if (existing.exists()) {
    alert("⚠ Ya existe un cliente con este correo. Se actualizarán sus datos.");
  } else {
    // Crear usuario en Auth solo si no existe
    if (password) {
      try {
        await createUserWithEmailAndPassword(auth, correo, password);
        alert("Usuario creado en Firebase Auth (no se cerró tu sesión).");
      } catch (err) {}
    }
  }

  await update(ref(db, "clientes/" + key), {
    nombre,
    email: correo,
    vehiculo: { modelo, placa, imagen: imagen || "default.png" }
  });

  alert("Cliente guardado correctamente.");
  formAltaCliente.reset();
  cargarClientes();
});

// ======================================================

async function cargarClientes() {
  listaClientes.innerHTML = "";
  clienteSelect.innerHTML = "<option value=''>Selecciona un cliente</option>";

  const snap = await get(ref(db, "clientes"));
  if (!snap.exists()) {
    listaClientes.innerHTML = "<p>No hay clientes registrados.</p>";
    return;
  }

  snap.forEach(c => {
    const cliente = c.val();
    const key = c.key;

    const div = document.createElement("div");
    div.classList.add("cliente-card", "cliente-item");

    div.innerHTML = `
      <h3>${cliente.nombre}</h3>
      <p><b>Email:</b> ${cliente.email}</p>
      <p><b>Vehículo:</b> ${cliente.vehiculo.modelo} (${cliente.vehiculo.placa})</p>
      <img src="imagenes/${cliente.vehiculo.imagen}" alt="Vehículo" style="max-width:200px; border-radius:8px;">
      <div class="btns">
        <button onclick="verInformacion('${key}')">Información</button>
        <button onclick="editarCliente('${key}')">Editar</button>
        <button class="danger" onclick="eliminarCliente('${key}')">Eliminar</button>
      </div>
      <hr>
    `;

    listaClientes.appendChild(div);

    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${cliente.nombre} - ${cliente.vehiculo.modelo}`;
    clienteSelect.appendChild(opt);
  });
}
cargarClientes();

formServicio.addEventListener("submit", async (e) => {
  e.preventDefault();

  const clienteKey = clienteSelect.value;
  const descripcion = document.getElementById("servicioDescripcion").value.trim();
  const nombreServ = document.getElementById("servicioNombre").value.trim();
  const fecha = document.getElementById("servicioFecha").value.trim();
  const costo = document.getElementById("servicioCosto").value.trim();

  if (!clienteKey || !nombreServ || !fecha || !costo) {
    alert("Completa todos los campos del servicio.");
    return;
  }

  await push(ref(db, "clientes/" + clienteKey + "/servicios"), {
    fecha,
    descripcion,
    nombre: nombreServ,
    costo
  });

  alert("Servicio agregado correctamente.");
  formServicio.reset();
});

window.editarCliente = async function(key) {
  const snap = await get(ref(db, "clientes/" + key));
  if (!snap.exists()) return alert("Cliente no encontrado.");

  const cliente = snap.val();
  document.getElementById("editNombre").value = cliente.nombre;
  document.getElementById("editCorreo").value = cliente.email;
  document.getElementById("editModelo").value = cliente.vehiculo.modelo;
  document.getElementById("editPlaca").value = cliente.vehiculo.placa;
  document.getElementById("editImagen").value = cliente.vehiculo.imagen;

  document.getElementById("modalEditar").style.display = "flex";
  window.clienteEditandoKey = key;
};

document.getElementById("formEditarCliente").addEventListener("submit", async (e) => {
  e.preventDefault();
  const key = window.clienteEditandoKey;
  if (!key) return;

  const nombre = document.getElementById("editNombre").value.trim();
  const email = document.getElementById("editCorreo").value.trim();
  const modelo = document.getElementById("editModelo").value.trim();
  const placa = document.getElementById("editPlaca").value.trim();
  const imagen = document.getElementById("editImagen").value.trim();

  await update(ref(db, "clientes/" + key), {
    nombre,
    email,
    vehiculo: { modelo, placa, imagen }
  });

  alert("Cliente actualizado correctamente.");
  document.getElementById("modalEditar").style.display = "none";
  cargarClientes();
});

document.getElementById("cancelarEdicion").addEventListener("click", () => {
  document.getElementById("modalEditar").style.display = "none";
  window.clienteEditandoKey = null;
});

window.eliminarCliente = async function(key) {
  if (confirm("¿Eliminar este cliente y su historial?")) {
    await remove(ref(db, "clientes/" + key));
    cargarClientes();
  }
};

window.verInformacion = async function(key) {
  const snap = await get(ref(db, "clientes/" + key));
  if (!snap.exists()) return alert("Cliente no encontrado.");

  const cliente = snap.val();
  const serviciosSnap = await get(ref(db, "clientes/" + key + "/servicios"));
  const servicios = serviciosSnap.exists() ? Object.values(serviciosSnap.val()) : [];

  const modal = document.createElement("div");
  modal.classList.add("modal-info");
  modal.innerHTML = `
    <div class="modal-content">
      <h2>🧰 Historial de servicios - ${cliente.nombre}</h2>
      ${
        servicios.length === 0
          ? "<p>No hay servicios registrados.</p>"
          : `
            <table class="tabla-servicios">
              <thead>
                <tr>
                  <th>📅 Fecha</th>
                  <th>🔧 Servicio</th>
                  <th>🧾 Descripción</th>
                  <th>💲 Costo</th>
                </tr>
              </thead>
              <tbody>
                ${servicios.map(s => `
                  <tr>
                    <td style="color:${colorFecha(s.fecha)};">${s.fecha}</td>
                    <td>${s.nombre}</td>
                    <td>${s.descripcion || "-"}</td>
                    <td>$${s.costo}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          `
      }
      <button class="cerrar-modal">Cerrar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const style = document.createElement("style");
  style.textContent = `
    .modal-info {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
    }
    .modal-content {
      background: #fff;
      border-radius: 10px;
      padding: 20px;
      width: 90%;
      max-width: 700px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      overflow-y: auto;
      max-height: 90vh;
    }
    .tabla-servicios {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .tabla-servicios th, .tabla-servicios td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    .tabla-servicios th {
      background-color: #f5f5f5;
    }
    .cerrar-modal {
      margin-top: 15px;
      background: #d00000;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  modal.querySelector(".cerrar-modal").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
};

function colorFecha(fechaStr) {
  const hoy = new Date();
  const fecha = new Date(fechaStr);
  const diffMeses = (hoy.getFullYear() - fecha.getFullYear()) * 12 + (hoy.getMonth() - fecha.getMonth());

  if (diffMeses <= 0) return "green";
  if (diffMeses === 1) return "orange";
  return "red";
}
