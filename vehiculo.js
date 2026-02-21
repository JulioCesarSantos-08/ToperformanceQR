import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js"
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"

const db=getDatabase()
const auth=getAuth()

const infoDiv=document.getElementById("infoCliente")
const listaServicios=document.getElementById("listaServicios")
const btnNuevoServicio=document.getElementById("btnNuevoServicio")
const nombreUsuario=document.getElementById("nombreUsuario")
const logoutBtn=document.getElementById("logoutBtn")
const estadoGeneral=document.getElementById("estadoGeneral")

logoutBtn.onclick=()=>{signOut(auth).then(()=>window.location.href="login.html")}

onAuthStateChanged(auth,async user=>{
if(!user){window.location.href="login.html";return}

nombreUsuario.textContent=user.email

const adminSnap=await get(ref(db,"admins/"+user.uid))
const esAdmin=adminSnap.exists()

const emailKey=user.email.replace(/[.#$[\]@]/g,"_")
const snap=await get(ref(db,"clientes/"+emailKey))
if(!snap.exists()){
infoDiv.innerHTML="<p>No se encontró información del cliente.</p>"
return
}

const data=snap.val()

infoDiv.innerHTML=`
<h2>${data.nombre}</h2>
<p>${data.email}</p>
<p>${data.telefono||""}</p>
<p>${data.vehiculo?.marca||""} ${data.vehiculo?.modelo||""} (${data.vehiculo?.placa||""})</p>
<p><b>Kilometraje actual:</b> ${data.vehiculo?.kilometraje||0} km</p>
${data.vehiculo?.imagen?`<img src="imagenes/${data.vehiculo.imagen}" style="max-width:100%;border-radius:10px;margin-top:10px">`:""}
`

mostrarServicios(emailKey,data.servicios||{},esAdmin)

if(esAdmin){
btnNuevoServicio.style.display="block"
btnNuevoServicio.onclick=()=>agregarServicio(emailKey)
}
})

function mostrarServicios(emailKey,servicios,esAdmin){
listaServicios.innerHTML=""
const keys=Object.keys(servicios)
if(keys.length===0){
listaServicios.innerHTML="<p>No hay servicios registrados.</p>"
return
}

keys.sort((a,b)=>new Date(servicios[b].fecha)-new Date(servicios[a].fecha))

let ultimoKm=null
let estadoGlobal=""

keys.forEach(k=>{
const s=servicios[k]
let diff=""
if(ultimoKm!==null) diff=` (+${s.kilometraje-ultimoKm} km)`
ultimoKm=s.kilometraje

const estado=estadoFecha(s.fecha)
if(!estadoGlobal) estadoGlobal=estado.texto

const card=document.createElement("div")
card.className="servicio-card"

card.innerHTML=`
<h4>${s.nombre}</h4>
<small>${s.fecha}</small>
<p>${s.descripcion||""}</p>
<p><b>$${s.costo}</b></p>
<p>${s.kilometraje||0} km${diff}</p>
<span style="color:${estado.color};font-weight:600">${estado.texto}</span>
<div id="acciones-${k}"></div>
`

if(esAdmin){
const btn=document.createElement("button")
btn.textContent="Editar"
btn.onclick=()=>editarServicio(emailKey,k,s)
card.querySelector(`#acciones-${k}`).appendChild(btn)
}

listaServicios.appendChild(card)
})

if(estadoGeneral){
estadoGeneral.textContent=estadoGlobal
estadoGeneral.style.display="inline-block"
}
}

async function agregarServicio(emailKey){
const nombre=prompt("Nombre del servicio:")
const descripcion=prompt("Descripción:")
const costo=prompt("Costo:")
const fecha=prompt("Fecha:",new Date().toISOString().split("T")[0])
const kilometraje=prompt("Kilometraje actual:")

if(!nombre||!fecha||!costo||!kilometraje)return

const refServ=ref(db,"clientes/"+emailKey+"/servicios")
const snap=await get(refServ)
const servicios=snap.exists()?snap.val():{}
const id="s"+Date.now()

servicios[id]={nombre,descripcion,costo,fecha,kilometraje}

const vehSnap=await get(ref(db,"clientes/"+emailKey+"/vehiculo"))

await update(ref(db,"clientes/"+emailKey),{
servicios,
vehiculo:{...(vehSnap.exists()?vehSnap.val():{}),kilometraje}
})

location.reload()
}

function editarServicio(emailKey,key,data){
const nombre=prompt("Nombre:",data.nombre)
const fecha=prompt("Fecha:",data.fecha)
const descripcion=prompt("Descripción:",data.descripcion)
const costo=prompt("Costo:",data.costo)
const kilometraje=prompt("Kilometraje:",data.kilometraje||0)

if(!nombre||!fecha||!costo||!kilometraje)return

update(ref(db,"clientes/"+emailKey+"/servicios/"+key),{
nombre,fecha,descripcion,costo,kilometraje
}).then(()=>location.reload())
}

function estadoFecha(fechaStr){
const f=new Date(fechaStr)
const h=new Date()
const meses=(h-f)/(1000*60*60*24*30)
if(meses<=2)return{color:"green",texto:"Cambio en buen estado"}
if(meses<=3)return{color:"orange",texto:"Servicio próximo"}
return{color:"red",texto:"Se necesita servicio"}
}
