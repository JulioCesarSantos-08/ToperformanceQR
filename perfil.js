import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
import { getDatabase, ref, push, set, get, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js"
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

const contenidoDiv=document.getElementById("contenido")
const adminForm=document.getElementById("adminForm")
const fab=document.querySelector(".fab")

let usuarioActual=null
let esAdmin=false
let clienteActivoKey=null
let clienteEditandoKey=null

onAuthStateChanged(auth,async user=>{
if(!user){window.location.href="index.html";return}
usuarioActual=user
const adminSnap=await get(ref(db,"admins/"+user.uid))
esAdmin=adminSnap.exists()

if(esAdmin){
adminForm.style.display="block"
document.getElementById("bienvenido").innerText="Panel de Administración"
if(fab)fab.style.display="none"
cargarTodosClientes()
}else{
adminForm.style.display="none"
await buscarClientePorCorreo(user.email)
}
})

async function buscarClientePorCorreo(correo){
const key=correo.replace(/[.#$[\]@]/g,"_")
const snap=await get(ref(db,"clientes/"+key))

if(!snap.exists()){
contenidoDiv.innerHTML="<p>No se encontraron datos de tu cuenta.</p>"
return
}

const cliente=snap.val()
clienteActivoKey=key
document.getElementById("bienvenido").innerText=`Bienvenido, ${cliente.nombre}`
mostrarCliente(key,cliente)
}

window.logout=function(){
signOut(auth).then(()=>{
localStorage.clear()
window.location.href="index.html"
})
}

async function cargarTodosClientes(){
const snap=await get(ref(db,"clientes"))
contenidoDiv.innerHTML=""
if(!snap.exists())return
snap.forEach(c=>mostrarCliente(c.key,c.val()))
}

function mostrarCliente(key,cliente){
const div=document.createElement("div")
div.classList.add("cliente-card")

div.innerHTML=`
<h3>${cliente.nombre}</h3>
<p><b>Email:</b> ${cliente.email}</p>
`

if(cliente.vehiculos){
Object.entries(cliente.vehiculos).forEach(([vehiculoId,v])=>{

const vehiculoDiv=document.createElement("div")
vehiculoDiv.style.marginTop="20px"
vehiculoDiv.style.padding="15px"
vehiculoDiv.style.border="1px solid #eee"
vehiculoDiv.style.borderRadius="12px"

vehiculoDiv.innerHTML=`
<h4>${v.marca||""} ${v.modelo} (${v.placa})</h4>
<p><b>Kilometraje:</b> ${v.kilometraje||0} km</p>
<img src="imagenes/${v.imagen}" style="max-width:250px;border-radius:12px;margin:10px 0">
<div id="servicios-${vehiculoId}"></div>
`

div.appendChild(vehiculoDiv)

cargarServicios(key,vehiculoId)
})
}

if(esAdmin){
const btnEditar=document.createElement("button")
btnEditar.innerText="Editar Cliente"
btnEditar.onclick=()=>editarCliente(key,cliente)

const btnEliminar=document.createElement("button")
btnEliminar.innerText="Eliminar Cliente"
btnEliminar.classList.add("danger")
btnEliminar.onclick=()=>eliminarCliente(key)

div.appendChild(btnEditar)
div.appendChild(btnEliminar)
}

contenidoDiv.appendChild(div)
}

function calcularEstado(fechaStr){
if(!fechaStr)return{color:"#ccc",texto:"Sin fecha"}
const fecha=new Date(fechaStr)
const hoy=new Date()
const diffMeses=(hoy-fecha)/(1000*60*60*24*30)
if(diffMeses<=2)return{color:"green",texto:"Cambio en buen estado"}
if(diffMeses<=3)return{color:"orange",texto:"El cambio deberá realizarse pronto"}
return{color:"red",texto:"Se necesita realizar el cambio"}
}

async function cargarServicios(clienteKey,vehiculoId){
const cont=document.getElementById("servicios-"+vehiculoId)
cont.innerHTML=""

const snap=await get(ref(db,`clientes/${clienteKey}/vehiculos/${vehiculoId}/servicios`))

cont.innerHTML="<h5>Historial de servicios</h5>"

if(esAdmin){
const btn=document.createElement("button")
btn.innerText="Agregar Servicio"
btn.style.marginBottom="10px"
btn.onclick=()=>agregarServicio(clienteKey,vehiculoId)
cont.appendChild(btn)
}

if(!snap.exists()){
cont.innerHTML+="<p>No hay servicios registrados.</p>"
return
}

const servicios=[]
snap.forEach(s=>servicios.push(s.val()))

servicios.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))

servicios.forEach(serv=>{
const estado=calcularEstado(serv.fecha)

const card=document.createElement("div")
card.className="servicio-card"

card.innerHTML=`
<h4>${serv.nombre}</h4>
<small style="color:${estado.color};font-weight:600;">
${serv.fecha} - ${estado.texto}
</small>
<p>${serv.descripcion||""}</p>
<b>$${serv.costo}</b>
`

cont.appendChild(card)
})
}

async function agregarServicio(clienteKey,vehiculoId){
const nombre=prompt("Nombre del servicio:")
const fecha=prompt("Fecha (YYYY-MM-DD):")
const descripcion=prompt("Descripción:")
const costo=prompt("Costo:")
const kilometraje=prompt("Kilometraje actual:")

if(!nombre||!fecha||!descripcion||!costo||!kilometraje)return

await push(ref(db,`clientes/${clienteKey}/vehiculos/${vehiculoId}/servicios`),{
nombre,fecha,descripcion,costo,kilometraje
})

await update(ref(db,`clientes/${clienteKey}/vehiculos/${vehiculoId}`),{
kilometraje
})

cargarServicios(clienteKey,vehiculoId)
}

function editarCliente(key,cliente){
clienteEditandoKey=key
document.getElementById("editNombre").value=cliente.nombre
document.getElementById("editCorreo").value=cliente.email
document.getElementById("modalEditar").style.display="flex"
}

window.guardarEdicionCliente=async function(event){
event.preventDefault()
if(!clienteEditandoKey)return

const nombre=document.getElementById("editNombre").value.trim()
const email=document.getElementById("editCorreo").value.trim()

await update(ref(db,"clientes/"+clienteEditandoKey),{
nombre,
email
})

document.getElementById("modalEditar").style.display="none"
clienteEditandoKey=null
cargarTodosClientes()
}

window.closeModal=function(){
document.getElementById("modalEditar").style.display="none"
clienteEditandoKey=null
}

async function eliminarCliente(key){
if(confirm("¿Eliminar este cliente y todos sus vehículos?")){
await remove(ref(db,"clientes/"+key))
cargarTodosClientes()
}
}
