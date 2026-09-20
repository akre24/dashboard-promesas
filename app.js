const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1hSI6MpGQl3_3V6s_6a-wvCDfSxQLCEkpJppJt72ncrT0SuAFwbXL6tAfXJn6QoWdA_y9_aHrEBMf/pub?output=csv";

let rows = [], dailyChart, funnelChart;

const norm = v => String(v ?? "").trim();
const key = s => norm(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
const money = n => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(Number(n)||0);
const pct = (a,b) => b ? ((a/b)*100).toFixed(1)+"%" : "0%";

function parseNumber(v){
  if(v===null||v===undefined||v==="") return 0;
  let s=String(v).replace(/[,$\s]/g,"").replace(/[^\d.-]/g,"");
  const n=Number(s); return Number.isFinite(n)?n:0;
}
function parseDate(v){
  if(!v) return null;
  let s=String(v).trim();
  let d;
  if(/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)){
    const [a,b,c]=s.split(/[\/\s]/); d=new Date(Number(c),Number(b)-1,Number(a));
  } else if(/^\d{4}-\d{2}-\d{2}/.test(s)) d=new Date(s.slice(0,10)+"T12:00:00");
  else d=new Date(s);
  return isNaN(d)?null:d;
}
function isoDate(d){return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`:""}
function first(r,...names){
  for(const n of names){if(Object.prototype.hasOwnProperty.call(r,n)&&norm(r[n])) return r[n]}
  const wanted=names.map(key);
  for(const k of Object.keys(r)){if(wanted.includes(key(k))&&norm(r[k]))return r[k]}
  return "";
}

function classify(r){
  const check=key(first(r,"Check"));
  const valid=key(first(r,"Validacion","Validación"));
  const payments=parseNumber(first(r,"Pagos_Realizados","Pagos Realizados"));
  const resta=parseNumber(first(r,"Resta"));
  const compromiso=parseDate(first(r,"Fecha compromiso (Solo en caso de ser promesa)","Fecha_Compromiso","Fecha compromiso"));
  const promise=!!compromiso || ["PROMESA","SI","SÍ","1","CORRECTA"].some(x=>check===x||valid===x);

  const correct = check==="CORRECTA";

  const effective = valid==="EFECTIVA";
  const amount=parseNumber(first(r,"Monto a pagar (Ingresa solo la cantidad sin ningun caracter especial o letra)","Monto a pagar","Monto"));
  const paid=parseNumber(first(r,"Pagos_Realizados","Pagos Realizados"));
  return {...r,_date:parseDate(first(r,"Marca temporal")),_promise:promise,_correct:correct,_effective:effective,_amount:amount,_paid:paid,_commit:compromiso};
}

function populateFilters(){
  const configs=[
    ["advisorFilter","Asesor"],["contactFilter","Tipo de contacto"],["supervisorFilter","SUPERVISOR"]
  ];
  configs.forEach(([id,col])=>{
    const el=document.getElementById(id); const vals=[...new Set(rows.map(r=>norm(first(r,col))).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
    el.innerHTML='<option value="">Todos</option>'+vals.map(v=>`<option>${escapeHtml(v)}</option>`).join("");
  });
  const bannerVals=[...new Set(rows.map(r=>norm(first(r,"Banner"))).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
  bannerList.innerHTML=bannerVals.map(v=>`<option value="${escapeHtml(v)}">`).join("");
  const moraVals=[...new Set(rows.map(r=>norm(first(r,"MORA INICIAL"))).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
  moraFilter.innerHTML=moraVals.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  const dates=rows.map(r=>r._date).filter(Boolean).map(isoDate).sort();
  if(dates.length){dateFrom.value=dates[0];dateTo.value=dates.at(-1)}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function filtered(){
  const from=dateFrom.value,to=dateTo.value, advisor=key(advisorFilter.value),contact=key(contactFilter.value),sup=key(supervisorFilter.value),banner=key(bannerFilter.value.trim());
  const moras=[...moraFilter.selectedOptions].map(o=>key(o.value));
  return rows.filter(r=>{
    if(from&&isoDate(r._date)<from)return false;if(to&&isoDate(r._date)>to)return false;
    if(advisor&&key(first(r,"Asesor"))!==advisor)return false;
    if(contact&&key(first(r,"Tipo de contacto"))!==contact)return false;
    if(sup&&key(first(r,"SUPERVISOR"))!==sup)return false;
    if(banner&&!key(first(r,"Banner")).includes(banner))return false;
    if(moras.length&&!moras.includes(key(first(r,"MORA INICIAL"))))return false;
    return true;
  });
}
function aggregate(data, field){
  const m=new Map();
  data.filter(r=>r._promise).forEach(r=>{
    const v=norm(first(r,field))||"Sin dato";
    if(!m.has(v))m.set(v,{name:v,p:0,c:0,i:0,e:0,a:0});
    const x=m.get(v);x.p++;r._correct?x.c++:x.i++;if(r._effective){x.e++;x.a+=r._amount}
  });
  return [...m.values()].sort((a,b)=>b.p-a.p);
}
function render(){
  const data=filtered(), promises=data.filter(r=>r._promise), correct=promises.filter(r=>r._correct), incorrect=promises.filter(r=>!r._correct), effective=correct.filter(r=>r._effective), noEff=correct.filter(r=>!r._effective);
  kpiPromises.textContent=promises.length.toLocaleString("es-MX");
  kpiCorrect.textContent=correct.length.toLocaleString("es-MX");kpiCorrectPct.textContent=pct(correct.length,promises.length);
  kpiIncorrect.textContent=incorrect.length.toLocaleString("es-MX");kpiIncorrectPct.textContent=pct(incorrect.length,promises.length);
  kpiEffective.textContent=effective.length.toLocaleString("es-MX");kpiEffectivePct.textContent=pct(effective.length,correct.length);
  kpiAmount.textContent=money(effective.reduce((s,r)=>s+r._amount,0));kpiPaid.textContent=money(effective.reduce((s,r)=>s+r._paid,0));
  sPaid.textContent=promises.filter(r=>r._paid>0||r._effective&&r._amount>0&&r._amount-r._paid<=0).length.toLocaleString("es-MX");
  sPending.textContent=promises.filter(r=>r._paid<=0&&r._commit&&r._commit>=new Date()).length.toLocaleString("es-MX");
  sOverdue.textContent=promises.filter(r=>r._paid<=0&&r._commit&&r._commit<new Date()).length.toLocaleString("es-MX");
  sNoPayment.textContent=promises.filter(r=>r._paid<=0).length.toLocaleString("es-MX");
  renderDaily(data);renderAdvisor(data);renderContact(data);renderCharts(promises,correct,incorrect,effective,noEff);
}
function renderDaily(data){
  const m=new Map();data.filter(r=>r._promise&&r._date).forEach(r=>{const d=isoDate(r._date);if(!m.has(d))m.set(d,{p:0,c:0,i:0,e:0,a:0});const x=m.get(d);x.p++;r._correct?x.c++:x.i++;if(r._effective){x.e++;x.a+=r._amount}});
  const vals=[...m.entries()].sort();dailyTable.querySelector("tbody").innerHTML=vals.map(([d,x])=>`<tr><td>${new Date(d+"T12:00:00").toLocaleDateString("es-MX")}</td><td>${x.p}</td><td>${x.c}</td><td>${x.i}</td><td>${x.e}</td><td>${x.c-x.e}</td><td>${pct(x.e,x.c)}</td><td>${money(x.a)}</td></tr>`).join("")||'<tr><td colspan="8">Sin información</td></tr>';
  return vals;
}
function renderAdvisor(data){
  const vals=aggregate(data,"Asesor");
  advisorTable.querySelector("tbody").innerHTML=vals.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${x.p}</td><td>${x.c}</td><td>${x.i}</td><td>${x.e}</td><td>${pct(x.e,x.c)}</td><td>${money(x.a)}</td></tr>`).join("")||'<tr><td colspan="7">Sin información</td></tr>';
}
function renderContact(data){
  const vals=aggregate(data,"Tipo de contacto");
  contactTable.querySelector("tbody").innerHTML=vals.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${x.p}</td><td>${x.c}</td><td>${x.i}</td><td>${x.e}</td><td>${pct(x.e,x.c)}</td></tr>`).join("")||'<tr><td colspan="6">Sin información</td></tr>';
}
function renderCharts(promises,correct,incorrect,effective,noEff){
  const vals=renderDaily(promises);
  if(dailyChart)dailyChart.destroy();
  dailyChart=new Chart(document.getElementById("dailyChart"),{type:"line",data:{labels:vals.map(x=>new Date(x[0]+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short"})),datasets:[{label:"Promesas",data:vals.map(x=>x[1].p),tension:.25},{label:"Efectivas",data:vals.map(x=>x[1].e),tension:.25}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true}}}});
  if(funnelChart)funnelChart.destroy();
  funnelChart=new Chart(document.getElementById("funnelChart"),{type:"bar",data:{labels:["Promesas","Correctas","Incorrectas","Efectivas","No efectivas"],datasets:[{label:"Registros",data:[promises.length,correct.length,incorrect.length,effective.length,noEff.length]}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}});
}
async function load(){
  status.textContent="Conectando con Google Sheets…";
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try{
    const sep=CSV_URL.includes("?")?"&":"?";
    const res=await fetch(CSV_URL+sep+"_="+Date.now(),{signal:controller.signal,cache:"no-store"});
    clearTimeout(timeout);
    if(!res.ok) throw new Error("HTTP "+res.status);
    const text=await res.text();
    const parsed=Papa.parse(text,{header:true,skipEmptyLines:true});
    rows=parsed.data.map(classify).filter(r=>r._date||r._promise);
    populateFilters();render();
    lastUpdate.textContent=new Date().toLocaleString("es-MX");
    status.textContent=`${rows.length.toLocaleString("es-MX")} registros cargados correctamente.`;
  }catch(e){
    clearTimeout(timeout);
    console.error(e);
    if(e.name==="AbortError") status.textContent="La conexión con Google Sheets tardó demasiado. Reintenta o revisa tu conexión.";
    else status.textContent="No fue posible leer Google Sheets. Revisa que la publicación CSV esté activa y que no haya bloqueo de red (CORS).";
  }
}
document.querySelectorAll("select,input").forEach(e=>e.addEventListener("change",render));
bannerFilter.addEventListener("input",render);
resetBtn.addEventListener("click",()=>{dateFrom.value="";dateTo.value="";advisorFilter.value="";contactFilter.value="";supervisorFilter.value="";bannerFilter.value="";[...moraFilter.options].forEach(o=>o.selected=false);render()});
load();
