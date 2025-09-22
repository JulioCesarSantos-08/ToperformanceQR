// perfil.js
import { getDatabase, ref, child, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Función para cargar historial de servicios
export async function cargarServicios(uidOrEmailKey) {
  const db = getDatabase();
  const dbRef = ref(db);

  try {
    const snapshot = await get(child(dbRef, "clientes/" + uidOrEmailKey + "/servicios"));
    const cont = document.getElementById("servicios");

    cont.innerHTML = "<h2>Historial de Servicios</h2>";

    if (!snapshot.exists()) {
      cont.innerHTML += "<p>No hay servicios registrados para este vehículo.</p>";
      return;
    }

    const servicios = snapshot.val();

    // Crear tabla
    const table = document.createElement("table");
    table.className = "tabla-servicios";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Servicio</th>
          <th>Descripción</th>
          <th>Costo</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    Object.values(servicios).forEach(servicio => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${servicio.fecha}</td>
        <td>${servicio.tipo}</td>
        <td>${servicio.descripcion}</td>
        <td>$${servicio.costo}</td>
      `;
      tbody.appendChild(tr);
    });

    cont.appendChild(table);

  } catch (error) {
    console.error("Error cargando servicios:", error);
  }
}
