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

onAuthStateChanged(auth,async user=>{
if(!user){window.location.href="index.html";return}
const adminSnap=await get(ref(db,"admins/"+user.uid))
if(!adminSnap.exists()){window.location.href="perfil.html";return}
adminEmail.innerText=user.email
})

logoutBtn.onclick=async()=>{await signOut(auth);window.location.href="index.html"}

formAltaCliente.addEventListener("submit",async e=>{
e.preventDefault()

const nombre=nombreCliente.value.trim()
const correo=emailCliente.value.trim()
const password=passwordCliente.value.trim()
const marca=marcaVehiculo.value.trim()
const modelo=modeloVehiculo.value.trim()
const anio=anioVehiculo.value.trim()
const placa=placaVehiculo.value.trim()
const kilometraje=kilometrajeVehiculo.value.trim()
const imagen=imagenVehiculo.value.trim()

if(!nombre||!correo||!modelo||!placa||!kilometraje)return

const key=correo.replace(/[.#$[\]@]/g,"_")
const existe=await get(ref(db,"clientes/"+key))

if(!existe.exists()&&password){
try{await createUserWithEmailAndPassword(auth,correo,password)}catch{}
}

await update(ref(db,"clientes/"+key),{
nombre,
email:correo,
vehiculo:{marca,modelo,anio,placa,kilometraje,imagen:imagen||"defaultcar.png"}
})

formAltaCliente.reset()
cargarClientes()
})

async function cargarClientes(){
listaClientes.innerHTML=""
clienteSelect.innerHTML=""

const snap=await get(ref(db,"clientes"))
if(!snap.exists())return

snap.forEach(c=>{
const cli=c.val()
const key=c.key

const div=document.createElement("div")
div.className="cliente-card"

div.innerHTML=`
<h3>${cli.nombre}</h3>
<p>Email: ${cli.email}</p>
<p>Vehículo: ${cli.vehiculo.modelo} (${cli.vehiculo.placa})</p>
<p>Kilometraje: ${cli.vehiculo.kilometraje||0} km</p>
<img src="imagenes/${cli.vehiculo.imagen}" style="max-width:200px;border-radius:8px">
<div class="btns">
<button onclick="verInformacion('${key}')">Información</button>
<button onclick="editarCliente('${key}')">Editar</button>
<button class="danger" onclick="eliminarCliente('${key}')">Eliminar</button>
</div>
<hr>
`

listaClientes.appendChild(div)

const opt=document.createElement("option")
opt.value=key
opt.textContent=cli.nombre+" - "+cli.vehiculo.modelo
clienteSelect.appendChild(opt)
})
}
cargarClientes()

formServicio.addEventListener("submit",async e=>{
e.preventDefault()

const clienteKey=clienteSelect.value
const nombre=servicioNombre.value.trim()
const fecha=servicioFecha.value
const descripcion=servicioDescripcion.value.trim()
const costo=servicioCosto.value.trim()
const kilometraje=servicioKilometraje.value.trim()

if(!clienteKey||!nombre||!fecha||!costo||!kilometraje)return

await push(ref(db,"clientes/"+clienteKey+"/servicios"),{
nombre,fecha,descripcion,costo,kilometraje
})

await update(ref(db,"clientes/"+clienteKey+"/vehiculo"),{kilometraje})

formServicio.reset()
cargarClientes()
})

window.editarCliente=async key=>{
const snap=await get(ref(db,"clientes/"+key))
if(!snap.exists())return

const c=snap.val()
editNombre.value=c.nombre
editCorreo.value=c.email
editMarca.value=c.vehiculo.marca||""
editModelo.value=c.vehiculo.modelo
editAnio.value=c.vehiculo.anio||""
editPlaca.value=c.vehiculo.placa
editKilometraje.value=c.vehiculo.kilometraje||""
editImagen.value=c.vehiculo.imagen||""

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
vehiculo:{
marca:editMarca.value.trim(),
modelo:editModelo.value.trim(),
anio:editAnio.value.trim(),
placa:editPlaca.value.trim(),
kilometraje:editKilometraje.value.trim(),
imagen:editImagen.value.trim()||"defaultcar.png"
}
})

modalEditar.style.display="none"
cargarClientes()
})

window.eliminarCliente=async key=>{
if(confirm("¿Eliminar este cliente y su historial?")){
await remove(ref(db,"clientes/"+key))
cargarClientes()
}
}

window.verInformacion=async key=>{
const snap=await get(ref(db,"clientes/"+key))
if(!snap.exists())return

const cli=snap.val()
const servSnap=await get(ref(db,"clientes/"+key+"/servicios"))
const servicios=servSnap.exists()?Object.values(servSnap.val()):[]

let ultimoKm=null

const filas=servicios.map(s=>{
let diff=""
if(ultimoKm)diff=` (+${s.kilometraje-ultimoKm} km)`
ultimoKm=s.kilometraje
const estado=estadoFecha(s.fecha)

return`
<tr>
<td>${s.fecha}</td>
<td>${s.nombre}</td>
<td>${s.descripcion||""}</td>
<td>$${s.costo}</td>
<td>${s.kilometraje}${diff}</td>
<td style="color:${estado.color};font-weight:600">${estado.texto}</td>
</tr>`
}).join("")

const modal=document.createElement("div")
modal.className="modal-info"
modal.innerHTML=`
<div class="modal-content">
<h2>${cli.nombre}</h2>
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
