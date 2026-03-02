import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
import { getDatabase, ref, get, push, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js"
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"

const firebaseConfig={
apiKey:"AIzaSyBA_i9O3vXzFn2rIKY4XQzll2fLvmD-u3A",
authDomain:"toperformance-50d5a.firebaseapp.com",
databaseURL:"https://toperformance-50d5a-default-rtdb.firebaseio.com",
projectId:"toperformance-50d5a",
storageBucket:"toperformance-50d5a.appspot.com",
messagingSenderId:"1020165964748",
appId:"1:1020165964748:web:f05155f982eb4f2eaf9369"
}

const app=initializeApp(firebaseConfig)
const db=getDatabase(app)
const auth=getAuth(app)

const clienteSelect=document.getElementById("clienteSelect")
const vehiculoSelect=document.getElementById("vehiculoSelect")

onAuthStateChanged(auth,async user=>{
if(!user){window.location.href="index.html";return}
adminEmail.innerText=user.email
})

logoutBtn.onclick=async()=>{
await signOut(auth)
window.location.href="index.html"
}

formAltaCliente.addEventListener("submit",async e=>{
e.preventDefault()

const nombre=nombreCliente.value.trim()
const correo=emailCliente.value.trim()
const telefono=telefonoCliente.value.trim()
const password=passwordCliente.value.trim()
const marca=marcaVehiculo.value.trim()
const modelo=modeloVehiculo.value.trim()
const anio=anioVehiculo.value.trim()
const placa=placaVehiculo.value.trim().toUpperCase()
const kilometraje=kilometrajeVehiculo.value.trim()
const imagen=imagenVehiculo.value.trim()

if(!nombre||!correo||!modelo||!placa||!kilometraje)return

const clienteKey=correo.replace(/[.#$[\]@]/g,"_")
const clienteRef=ref(db,"clientes/"+clienteKey)
const snap=await get(clienteRef)

if(!snap.exists() && password){
try{await createUserWithEmailAndPassword(auth,correo,password)}catch{}
}

await update(clienteRef,{
nombre,
email:correo,
telefono
})

await update(ref(db,`clientes/${clienteKey}/vehiculos/${placa}`),{
marca,
modelo,
anio,
placa,
kilometraje,
imagen:imagen||"defaultcar.png"
})

formAltaCliente.reset()
cargarClientes()
})

async function cargarClientes(){
listaClientes.innerHTML=""
clienteSelect.innerHTML=""
vehiculoSelect.innerHTML="<option value=''>Selecciona un vehículo</option>"

const snap=await get(ref(db,"clientes"))
if(!snap.exists())return

snap.forEach(c=>{
const cli=c.val()
const key=c.key

let vehiculosHTML=""

if(cli.vehiculos){
Object.values(cli.vehiculos).forEach(v=>{
vehiculosHTML+=`
<div style="margin-top:10px;padding:10px;border:1px solid #eee;border-radius:8px">
<p><b>${v.marca||""} ${v.modelo}</b> (${v.placa})</p>
<p>Kilometraje: ${v.kilometraje||0} km</p>
<img src="imagenes/${v.imagen}" style="max-width:200px;border-radius:8px">
<button onclick="verInformacion('${key}','${v.placa}')">Información</button>
</div>
`
})
}

const div=document.createElement("div")
div.className="cliente-card"
div.innerHTML=`
<h3>${cli.nombre}</h3>
<p>Email: ${cli.email}</p>
<p>Teléfono: ${cli.telefono||""}</p>
${vehiculosHTML}
<hr>
<button onclick="editarCliente('${key}')">Editar Cliente</button>
<button class="danger" onclick="eliminarCliente('${key}')">Eliminar Cliente</button>
`

listaClientes.appendChild(div)

const opt=document.createElement("option")
opt.value=key
opt.textContent=cli.nombre+" - "+cli.email
clienteSelect.appendChild(opt)
})
}

clienteSelect.addEventListener("change",async ()=>{
vehiculoSelect.innerHTML="<option value=''>Selecciona un vehículo</option>"

const clienteKey=clienteSelect.value
if(!clienteKey)return

const snap=await get(ref(db,`clientes/${clienteKey}/vehiculos`))
if(!snap.exists())return

snap.forEach(v=>{
const data=v.val()
const opt=document.createElement("option")
opt.value=v.key
opt.textContent=`${data.marca||""} ${data.modelo} (${data.placa})`
vehiculoSelect.appendChild(opt)
})
})

formServicio.addEventListener("submit",async e=>{
e.preventDefault()

const clienteKey=clienteSelect.value
const vehiculoId=vehiculoSelect.value
const nombre=servicioNombre.value.trim()
const fecha=servicioFecha.value
const descripcion=servicioDescripcion.value.trim()
const costo=servicioCosto.value.trim()
const kilometraje=servicioKilometraje.value.trim()

if(!clienteKey||!vehiculoId||!nombre||!fecha||!costo||!kilometraje){
alert("Completa todos los campos y selecciona vehículo")
return
}

await push(ref(db,`clientes/${clienteKey}/vehiculos/${vehiculoId}/servicios`),{
nombre,fecha,descripcion,costo,kilometraje
})

await update(ref(db,`clientes/${clienteKey}/vehiculos/${vehiculoId}`),{
kilometraje
})

formServicio.reset()
alert("Servicio registrado correctamente")
})

window.editarCliente=async key=>{
const snap=await get(ref(db,"clientes/"+key))
if(!snap.exists())return
const c=snap.val()
editNombre.value=c.nombre
editCorreo.value=c.email
editTelefono.value=c.telefono||""
modalEditar.style.display="flex"
window.clienteEditandoKey=key
}

formEditarCliente.addEventListener("submit",async e=>{
e.preventDefault()
const key=window.clienteEditandoKey
if(!key)return

await update(ref(db,"clientes/"+key),{
nombre:editNombre.value.trim(),
email:editCorreo.value.trim(),
telefono:editTelefono.value.trim()
})

modalEditar.style.display="none"
cargarClientes()
})

window.eliminarCliente=async key=>{
if(confirm("¿Eliminar este cliente y todos sus vehículos?")){
await remove(ref(db,"clientes/"+key))
cargarClientes()
}
}

window.verInformacion=async (clienteKey,placa)=>{
const snap=await get(ref(db,`clientes/${clienteKey}/vehiculos/${placa}`))
if(!snap.exists())return

const vehiculo=snap.val()
const servicios=vehiculo.servicios?Object.values(vehiculo.servicios):[]

const filas=servicios.map(s=>{
const estado=estadoFecha(s.fecha)
return`
<tr>
<td>${s.fecha}</td>
<td>${s.nombre}</td>
<td>${s.descripcion||""}</td>
<td>$${s.costo}</td>
<td>${s.kilometraje}</td>
<td style="color:${estado.color};font-weight:600">${estado.texto}</td>
</tr>`
}).join("")

const modal=document.createElement("div")
modal.className="modal-info"
modal.innerHTML=`
<div class="modal-content">
<h2>${vehiculo.marca} ${vehiculo.modelo} (${placa})</h2>
<table class="tabla-servicios">
<thead><tr><th>Fecha</th><th>Servicio</th><th>Desc</th><th>Costo</th><th>Km</th><th>Estado</th></tr></thead>
<tbody>${filas}</tbody>
</table>
<button class="cerrar-modal">Cerrar</button>
</div>
`
document.body.appendChild(modal)
modal.querySelector(".cerrar-modal").onclick=()=>modal.remove()
modal.onclick=e=>{if(e.target===modal)modal.remove()}
}

function estadoFecha(fechaStr){
const f=new Date(fechaStr)
const h=new Date()
const meses=(h-f)/(1000*60*60*24*30)
if(meses<=2)return{color:"green",texto:"Cambio en buen estado"}
if(meses<=3)return{color:"orange",texto:"Cambio próximo"}
return{color:"red",texto:"Se necesita cambio"}
}

cargarClientes()
