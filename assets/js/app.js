/* NEXT COP Readiness Board — application
   Standard: NEXT plc Supplier Auditing Standards, June 2025
   Credit partner: Industry Compliance & Sustainability Platform
   Technology partner: guulba — technology for better performance */
'use strict';
/* ===================================================================== state */
const CFG = (typeof window !== "undefined" && window.BOARD_CONFIG) || {};
const APPS_SCRIPT_URL = CFG.appsScriptUrl || "";

const STATUSES = ["Not started","In progress","Blocked","Awaiting verification","Verified","Closed"];
const GRADES   = ["MINOR","MAJOR","CAT 4","CAT 5","CAT 6"];
const TASK_TYPES = ["Remediation","Document","Training","Purchase","Inspection","Licence","Engineering"];

let S = JSON.parse(JSON.stringify(NEXT_SEED));
if(!S.tasks) S.tasks = [];
if(!S.projectStart) S.projectStart = todayISO();
let view = "overview";
let filters = {sec:"", grade:"", status:"", ws:"", q:""};
let taskFilters = {status:"", owner:"", q:"", late:false};

const VIEWS = [
  ["overview","Overview","Where the audit exposure sits today"],
  ["checklist","COP Checklist","All 255 clauses of the June 2025 standard"],
  ["tasks","Task Board","Add, schedule, update, replace and close work"],
  ["orsvai","ORSVAI","Who owns, does, verifies and signs off each section"],
  ["plan","Project Plan","Twenty weeks from mobilisation to audit readiness"],
  ["performance","Progress & Performance","Management view: delivery, ageing, department scorecard"],
  ["register","Evidence Register","Licences, certificates and the audit-day document pack"],
];

/* ==================================================================== utils */
function todayISO(){
  const tz=CFG.timezone;
  if(tz){ try{
    const p=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"});
    return p.format(new Date());
  }catch(e){/* fall through to UTC */} }
  return new Date().toISOString().slice(0,10);
}
function d(s){return s? new Date(s+"T00:00:00") : null}
function days(a,b){return Math.round((b-a)/86400000)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function el(h){const t=document.createElement("template");t.innerHTML=h.trim();return t.content.firstElementChild}
function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("on");clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove("on"),2400)}
function isClosed(x){return x.status==="Closed"}
function statusPill(s){
  const m={"Not started":"p-not","In progress":"p-prog","Blocked":"p-block","Awaiting verification":"p-verify","Verified":"p-verify","Closed":"p-done"};
  return `<span class="pill ${m[s]||"p-not"}">${esc(s)}</span>`;
}
function gradeChip(g){return `<span class="g" data-g="${esc(g)}"><i></i>${esc(g)}</span>`}

/* delay logic — one place, used by clauses and tasks alike */
function timing(x){
  const due = x.revisedDueDate || x.dueDate;
  if(isClosed(x)){
    if(x.completedDate && due){
      const slip = days(d(due), d(x.completedDate));
      if(slip>0) return {key:"late-closed", label:`Closed ${slip}d late`, cls:"p-repl", slip};
    }
    return {key:"closed", label:"Closed on time", cls:"p-done", slip:0};
  }
  if(!due) return {key:"undated", label:"No date set", cls:"p-not", slip:0};
  const n = days(d(todayISO()), d(due));
  if(n<0)  return {key:"overdue", label:`${-n}d overdue`, cls:"p-late", slip:-n};
  if(n<=7) return {key:"due-soon", label:`Due in ${n}d`, cls:"p-soon", slip:0};
  return {key:"on-track", label:`Due in ${n}d`, cls:"p-ok", slip:0};
}

/* ================================================================= metrics */
function metrics(){
  const it=S.items, n=it.length;
  const closed=it.filter(isClosed);
  const openBy=g=>it.filter(x=>x.grade===g&&!isClosed(x)).length;
  const wOpen=it.filter(x=>!isClosed(x)).reduce((a,x)=>a+x.weight,0);
  const wAll =it.reduce((a,x)=>a+x.weight,0);
  const overdue=it.filter(x=>timing(x).key==="overdue").length;
  const soon=it.filter(x=>timing(x).key==="due-soon").length;
  const progress = n? it.reduce((a,x)=>a+(isClosed(x)?100:(x.progress||0)),0)/n : 0;
  return {
    n, closed:closed.length, pctClosed: n? closed.length/n*100:0,
    progress,
    readiness: wAll? (1-wOpen/wAll)*100 : 0,
    c6:openBy("CAT 6"), c5:openBy("CAT 5"), c4:openBy("CAT 4"),
    maj:openBy("MAJOR"), min:openBy("MINOR"),
    overdue, soon,
    gateClear: openBy("CAT 6")===0 && openBy("CAT 5")===0,
    tasks:S.tasks.length,
    tasksOpen:S.tasks.filter(t=>!isClosed(t)).length,
    tasksLate:S.tasks.filter(t=>timing(t).key==="overdue").length,
  };
}
function sectionStats(key){
  const it=S.items.filter(x=>x.sectionKey===key);
  const closed=it.filter(isClosed).length;
  return {total:it.length, closed, pct: it.length? closed/it.length*100:0,
          c6:it.filter(x=>x.grade==="CAT 6"&&!isClosed(x)).length,
          overdue:it.filter(x=>timing(x).key==="overdue").length};
}

/* =================================================================== render */
function render(){
  const v=VIEWS.find(x=>x[0]===view);
  document.getElementById("vTitle").textContent=v[1];
  document.getElementById("vSub").textContent=v[2];
  document.getElementById("nav").innerHTML=VIEWS.map((x,i)=>
    `<button data-v="${x[0]}" class="${x[0]===view?"on":""}"><span class="idx mono">${String(i+1).padStart(2,"0")}</span>${x[1]}</button>`).join("");
  document.getElementById("nav").querySelectorAll("button").forEach(b=>
    b.onclick=()=>{view=b.dataset.v;window.scrollTo(0,0);render()});
  document.getElementById("footMeta").innerHTML=
    `<span class="mono">${S.meta.standard} · ${S.meta.issued} · ${S.items.length} clauses · ${S.tasks.length} tasks</span>`;
  document.getElementById("view").innerHTML = ({
    overview:vOverview, checklist:vChecklist, tasks:vTasks, orsvai:vOrsvai,
    plan:vPlan, performance:vPerf, register:vRegister
  })[view]();
  wire();
}

/* ---------------------------------------------------------------- overview */
function vOverview(){
  const m=metrics();
  const segs=[["CAT 6",m.c6,"seg-c6"],["CAT 5",m.c5,"seg-c5"],["CAT 4",m.c4,"seg-c4"],["MAJOR",m.maj,"seg-maj"],["MINOR",m.min,"seg-min"]];
  const tot=segs.reduce((a,s)=>a+s[1],0)||1;
  return `
  <div class="ladder">
    <div class="top">
      <div>
        <div class="lab">Open non-conformity exposure</div>
        <div class="big">${segs.reduce((a,s)=>a+s[1],0)}<small>of ${m.n} clauses still open</small></div>
      </div>
      <div class="spacer"></div>
      <div>
        <div class="lab">Readiness index — severity weighted</div>
        <div class="big">${m.readiness.toFixed(0)}<small>%</small></div>
      </div>
    </div>
    <div class="ladderbar">
      ${segs.map(([g,c,cls])=>c?`<div class="${cls}" style="flex:${c}" title="${g}: ${c} open">${c>=Math.max(3,tot*0.04)?c:""}</div>`:"").join("")}
      ${segs.every(s=>!s[1])?`<div class="seg-min" style="flex:1">All clauses closed</div>`:""}
    </div>
    <div class="ladderkey">
      ${segs.map(([g,c])=>`<span>${g} <b>${c}</b></span>`).join("")}
      <span class="spacer"></span><span>Bar width = count. Colour = how NEXT grades a failure here.</span>
    </div>
    <div class="gate">
      <span class="flag ${m.gateClear?"go":"stop"}">${m.gateClear?"GATE CLEAR":"GATE BLOCKED"}</span>
      <p>${m.gateClear
        ? "No Category 5 or 6 exposure remains open. Remaining Major and Minor findings shape the corrective action plan but do not stop the order."
        : `<b>${m.c6}</b> Category 6 and <b>${m.c5}</b> Category 5 clauses are still open. NEXT treats these as zero-tolerance — every one must be closed before the site can be declared audit ready.`}</p>
    </div>
  </div>

  <div style="height:20px"></div>
  <div class="kpis">
    <div class="kpi ${m.pctClosed>80?"good":""}"><div class="eyebrow">Clauses closed</div>
      <div class="v">${m.closed}<span style="font-size:14px;color:var(--mute)">/${m.n}</span></div>
      <div class="bar" style="margin-bottom:5px"><span style="width:${m.pctClosed}%"></span></div>
      <div class="d">${m.pctClosed.toFixed(1)}% of the standard evidenced</div></div>
    <div class="kpi"><div class="eyebrow">Weighted progress</div><div class="v">${m.progress.toFixed(0)}%</div>
      <div class="d">Counts partial work, not just closures</div></div>
    <div class="kpi ${m.overdue?"bad":"good"}"><div class="eyebrow">Overdue clauses</div><div class="v">${m.overdue}</div>
      <div class="d">Past due or revised due date</div></div>
    <div class="kpi ${m.soon?"warn":""}"><div class="eyebrow">Due within 7 days</div><div class="v">${m.soon}</div>
      <div class="d">Needs a decision this week</div></div>
    <div class="kpi ${m.tasksLate?"bad":""}"><div class="eyebrow">Tasks open</div><div class="v">${m.tasksOpen}</div>
      <div class="d">${m.tasksLate} running late</div></div>
  </div>

  <div style="height:22px"></div>
  <div class="card">
    <div class="hd"><h3>Section readiness</h3><span class="note">Click a section to open its clauses.</span></div>
    <div class="bd">
      <div class="heat">
        ${S.sections.map(s=>{const st=sectionStats(s.key);return `
          <div class="heatcell" data-sec="${s.key}">
            <div class="n mono">SECTION ${s.no}</div>
            <div class="t">${esc(s.title.replace("Health & Safety — ",""))}</div>
            <div class="row"><span class="pct" style="color:${st.pct>=90?"var(--clear)":st.pct>=50?"var(--steel)":"var(--alert)"}">${st.pct.toFixed(0)}%</span>
              <span class="mono" style="font-size:10.5px;color:var(--mute)">${st.closed}/${st.total}</span></div>
            <div class="bar ${st.pct>=100?"done":""}"><span style="width:${st.pct}%"></span></div>
            ${st.c6?`<div class="c6" style="margin-top:6px">${st.c6} Cat 6 open</div>`:st.overdue?`<div class="c6" style="margin-top:6px;color:var(--hazard-deep)">${st.overdue} overdue</div>`:`<div style="height:6px"></div>`}
          </div>`}).join("")}
      </div>
    </div>
  </div>

  <div style="height:22px"></div>
  <div class="grid2">
    <div class="card"><div class="hd"><h3>What is overdue right now</h3></div>
      ${listBlock(S.items.filter(x=>timing(x).key==="overdue").sort((a,b)=>timing(b).slip-timing(a).slip).slice(0,12),"Nothing is overdue.")}
    </div>
    <div class="card"><div class="hd"><h3>Next seven days</h3></div>
      ${listBlock(S.items.filter(x=>timing(x).key==="due-soon").slice(0,12),"Nothing falls due this week.")}
    </div>
  </div>`;
}
function listBlock(rows,emptyMsg){
  if(!rows.length) return `<div class="empty"><h4>Clear</h4><p>${emptyMsg}</p></div>`;
  return `<div class="tbl-wrap cap"><table><tbody>${rows.map(x=>{const t=timing(x);return `
    <tr class="rowopen" data-id="${x.id}" style="cursor:pointer">
      <td style="width:66px"><span class="mono" style="font-size:11px;color:var(--mute)">${x.id}</span></td>
      <td>${esc(x.clause)}<div style="font-size:11px;color:var(--mute);margin-top:2px">${esc(x.sectionTitle)}</div></td>
      <td style="width:78px">${gradeChip(x.grade)}</td>
      <td style="width:104px"><span class="pill ${t.cls}">${t.label}</span></td>
    </tr>`}).join("")}</tbody></table></div>`;
}

/* --------------------------------------------------------------- checklist */
function vChecklist(){
  const rows=S.items.filter(x=>
    (!filters.sec||x.sectionKey===filters.sec)&&
    (!filters.grade||x.grade===filters.grade)&&
    (!filters.status||x.status===filters.status)&&
    (!filters.ws||x.workstream===filters.ws)&&
    (!filters.q||(x.clause+x.requirement+x.evidence+x.responsible+x.id).toLowerCase().includes(filters.q.toLowerCase())));
  const ws=[...new Set(S.items.map(x=>x.workstream))].sort();
  return `
  <div class="filters">
    <input type="text" class="search" id="fq" placeholder="Search clause, requirement, evidence, owner…" value="${esc(filters.q)}">
    <select id="fsec"><option value="">All sections</option>${S.sections.map(s=>`<option value="${s.key}" ${filters.sec===s.key?"selected":""}>${s.no} — ${esc(s.title.replace("Health & Safety — ","H&S: "))}</option>`).join("")}</select>
    <select id="fgrade"><option value="">All grades</option>${GRADES.map(g=>`<option ${filters.grade===g?"selected":""}>${g}</option>`).join("")}</select>
    <select id="fstatus"><option value="">All statuses</option>${STATUSES.map(g=>`<option ${filters.status===g?"selected":""}>${g}</option>`).join("")}</select>
    <select id="fws"><option value="">All workstreams</option>${ws.map(g=>`<option ${filters.ws===g?"selected":""}>${g}</option>`).join("")}</select>
    <button class="btn sm" id="fclear">Clear</button>
    <span class="chipcount">${rows.length} of ${S.items.length}</span>
    <div class="spacer"></div>
    <button class="btn sm hz" id="bulkDates">Set dates from project plan</button>
    <button class="btn sm pri" id="addClause">Add clause</button>
  </div>
  <div class="card">
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th style="width:64px">Ref</th><th>Clause &amp; requirement</th><th style="width:82px">If failed</th>
        <th style="width:128px">Responsible</th><th style="width:118px">Status</th>
        <th style="width:100px">Due</th><th style="width:118px">Timing</th><th style="width:88px">Progress</th><th style="width:52px"></th>
      </tr></thead>
      <tbody>${rows.map(x=>{const t=timing(x);const due=x.revisedDueDate||x.dueDate;return `
        <tr>
          <td><span class="mono" style="font-size:11px;color:var(--mute)">${x.id}</span></td>
          <td>
            <div style="font-weight:600">${esc(x.clause)}</div>
            <div style="font-size:11.5px;color:var(--mute);margin-top:2px;line-height:1.45">${esc(x.requirement).slice(0,150)}${x.requirement.length>150?"…":""}</div>
            <div style="font-size:10.5px;color:var(--steel);margin-top:3px" class="mono">§${x.sectionNo} · ${esc(x.workstream)}${x.replacedBy?` · replaced by ${esc(x.replacedBy)}`:""}</div>
          </td>
          <td>${gradeChip(x.grade)}</td>
          <td style="font-size:12px">${esc(x.responsible)}</td>
          <td>${statusPill(x.status)}</td>
          <td class="mono" style="font-size:11.5px">${due?esc(due):"—"}${x.revisedDueDate?`<div style="font-size:10px;color:var(--hazard-deep)">revised</div>`:""}</td>
          <td><span class="pill ${t.cls}">${t.label}</span></td>
          <td><div class="bar ${isClosed(x)?"done":""}"><span style="width:${isClosed(x)?100:(x.progress||0)}%"></span></div>
              <div class="mono" style="font-size:10px;color:var(--mute);margin-top:3px">${isClosed(x)?100:(x.progress||0)}%</div></td>
          <td><button class="btn sm rowopen" data-id="${x.id}">Open</button></td>
        </tr>`}).join("")}</tbody>
    </table></div>
  </div>`;
}

/* ------------------------------------------------------------------- tasks */
function vTasks(){
  let rows=S.tasks.filter(t=>
    (!taskFilters.status||t.status===taskFilters.status)&&
    (!taskFilters.owner||t.responsible===taskFilters.owner)&&
    (!taskFilters.late||timing(t).key==="overdue")&&
    (!taskFilters.q||(t.title+t.detail+t.id+t.linkedClause).toLowerCase().includes(taskFilters.q.toLowerCase())));
  rows.sort((a,b)=>(a.revisedDueDate||a.dueDate||"9999").localeCompare(b.revisedDueDate||b.dueDate||"9999"));
  const owners=[...new Set(S.tasks.map(t=>t.responsible).filter(Boolean))].sort();
  const m=metrics();
  return `
  <div class="kpis" style="margin-bottom:16px">
    <div class="kpi"><div class="eyebrow">Total tasks</div><div class="v">${S.tasks.length}</div><div class="d">Across every workstream</div></div>
    <div class="kpi"><div class="eyebrow">Open</div><div class="v">${m.tasksOpen}</div><div class="d">Not yet closed</div></div>
    <div class="kpi ${m.tasksLate?"bad":"good"}"><div class="eyebrow">Running late</div><div class="v">${m.tasksLate}</div><div class="d">Past the current due date</div></div>
    <div class="kpi"><div class="eyebrow">Rescheduled</div><div class="v">${S.tasks.filter(t=>t.revisedDueDate).length}</div><div class="d">Carrying a revised date</div></div>
    <div class="kpi"><div class="eyebrow">Replaced</div><div class="v">${S.tasks.filter(t=>t.replacedBy).length}</div><div class="d">Superseded by a newer task</div></div>
  </div>
  <div class="filters">
    <input type="text" class="search" id="tq" placeholder="Search tasks…" value="${esc(taskFilters.q)}">
    <select id="tstatus"><option value="">All statuses</option>${STATUSES.map(g=>`<option ${taskFilters.status===g?"selected":""}>${g}</option>`).join("")}</select>
    <select id="towner"><option value="">All owners</option>${owners.map(g=>`<option ${taskFilters.owner===g?"selected":""}>${esc(g)}</option>`).join("")}</select>
    <label class="inline"><input type="checkbox" id="tlate" ${taskFilters.late?"checked":""}> Late only</label>
    <button class="btn sm" id="tclear">Clear</button>
    <span class="chipcount">${rows.length} shown</span>
    <div class="spacer"></div>
    <button class="btn sm" id="genTasks">Generate from open Cat 5 &amp; 6</button>
    <button class="btn sm pri" id="addTask">Add task</button>
  </div>
  ${rows.length? `
  <div class="card"><div class="tbl-wrap wide"><table>
    <thead><tr>
      <th style="width:76px">Ref</th><th style="min-width:270px">Task</th><th style="width:104px">Type</th>
      <th style="width:134px">Responsible</th><th style="width:118px">Status</th>
      <th style="width:98px">Start</th><th style="width:98px">Due</th><th style="width:98px">Completed</th>
      <th style="width:120px">Timing</th><th style="width:84px">Progress</th><th style="width:62px"></th>
    </tr></thead>
    <tbody>${rows.map(t=>{const ti=timing(t);return `
      <tr>
        <td><span class="mono" style="font-size:11px;color:var(--mute)">${esc(t.id)}</span></td>
        <td><div style="font-weight:600">${esc(t.title)}</div>
          <div style="font-size:11px;color:var(--mute);margin-top:2px">${esc(t.detail||"").slice(0,88)}${(t.detail||"").length>88?"…":""}</div>
          <div class="mono" style="font-size:10.5px;color:var(--steel);margin-top:3px">
            ${t.linkedClause?`clause ${esc(t.linkedClause)}`:"unlinked"}
            ${t.replacementOf?` · replaces ${esc(t.replacementOf)}`:""}
            ${t.replacedBy?` · <span style="color:#553C9A">replaced by ${esc(t.replacedBy)}</span>`:""}</div></td>
        <td style="font-size:12px">${esc(t.type||"")}</td>
        <td style="font-size:12px">${esc(t.responsible||"")}</td>
        <td>${statusPill(t.status)}</td>
        <td class="mono" style="font-size:11.5px">${esc(t.startDate||"—")}</td>
        <td class="mono" style="font-size:11.5px">${esc(t.revisedDueDate||t.dueDate||"—")}${t.revisedDueDate?`<div style="font-size:10px;color:var(--hazard-deep)">was ${esc(t.dueDate||"—")}</div>`:""}</td>
        <td class="mono" style="font-size:11.5px">${esc(t.completedDate||"—")}</td>
        <td><span class="pill ${ti.cls}">${ti.label}</span></td>
        <td><div class="bar ${isClosed(t)?"done":""}"><span style="width:${isClosed(t)?100:(t.progress||0)}%"></span></div></td>
        <td><button class="btn sm taskopen" data-id="${esc(t.id)}">Open</button></td>
      </tr>`}).join("")}</tbody>
  </table></div></div>`
  : `<div class="card"><div class="empty"><h4>No tasks yet</h4>
      <p>Add a task, or generate a starting set from every open Category 5 and 6 clause.</p>
      <div style="margin-top:14px;display:flex;gap:8px;justify-content:center">
        <button class="btn pri" id="addTask2">Add task</button>
        <button class="btn hz" id="genTasks2">Generate from open Cat 5 &amp; 6</button>
      </div></div></div>`}`;
}

/* ------------------------------------------------------------------ orsvai */
function vOrsvai(){
  const K=S.meta.orsvai;
  return `
  <div class="orsvai-key">
    ${Object.entries(K).map(([k,v])=>{const [t,dd]=v.split(" — ");
      return `<div class="ok"><b>${k}</b><span><strong>${esc(t)}</strong><br>${esc(dd)}</span></div>`}).join("")}
  </div>
  <div class="card">
    <div class="hd"><h3>Accountability matrix by section</h3>
      <span class="note">Edit any cell. Changes apply to every clause in that section.</span></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th style="width:52px">§</th><th style="width:190px">Section</th>
        <th>O — Owner</th><th>R — Responsible</th><th>S — Support</th>
        <th>V — Verify</th><th>A — Approve</th><th>I — Inform</th><th style="width:74px">Clauses</th></tr></thead>
      <tbody>${S.sections.map(s=>{
        const ex=S.items.find(x=>x.sectionKey===s.key)||{};
        const st=sectionStats(s.key);
        const cell=(f)=>`<td><input type="text" class="ors" data-sec="${s.key}" data-f="${f}" value="${esc(ex[f]||"")}"></td>`;
        return `<tr>
          <td class="mono" style="font-size:11.5px;color:var(--mute)">${s.no}</td>
          <td style="font-weight:600;font-size:12.5px">${esc(s.title)}</td>
          ${cell("owner")}${cell("responsible")}${cell("support")}${cell("verify")}${cell("approve")}${cell("inform")}
          <td><div class="mono" style="font-size:11px">${st.closed}/${st.total}</div>
              <div class="bar ${st.pct>=100?"done":""}" style="margin-top:4px"><span style="width:${st.pct}%"></span></div></td>
        </tr>`}).join("")}</tbody>
    </table></div>
  </div>
  <div style="height:20px"></div>
  <div class="card"><div class="hd"><h3>Verification load</h3>
    <span class="note">Who has to check evidence, and how much of it.</span></div>
    <div class="bd"><div class="heat">
      ${Object.entries(S.items.reduce((a,x)=>{const k=x.verify||"Unassigned";(a[k]=a[k]||{t:0,o:0});a[k].t++;if(!isClosed(x))a[k].o++;return a},{}))
        .sort((a,b)=>b[1].t-a[1].t).map(([k,v])=>`
        <div class="heatcell" style="cursor:default">
          <div class="n mono">VERIFIER</div><div class="t">${esc(k)}</div>
          <div class="row"><span class="pct">${v.o}</span><span class="mono" style="font-size:10.5px;color:var(--mute)">open of ${v.t}</span></div>
          <div class="bar ${v.o===0?"done":""}"><span style="width:${(1-v.o/v.t)*100}%"></span></div>
        </div>`).join("")}
    </div></div></div>`;
}

/* -------------------------------------------------------------------- plan */
function vPlan(){
  const WEEKS=20;
  const start=d(S.projectStart);
  const elapsed=days(start,d(todayISO()));
  const nowWeek=elapsed<0?0:Math.max(1,Math.min(WEEKS,Math.floor(elapsed/7)+1));
  return `
  <div class="filters">
    <label class="f" style="margin:0 6px 0 0;align-self:center">Project start</label>
    <input type="date" id="pstart" value="${esc(S.projectStart)}" style="width:160px">
    <span class="chipcount">Week ${nowWeek} of ${WEEKS} · audit-ready target ${addWeeks(S.projectStart,WEEKS)}</span>
    <div class="spacer"></div>
    <button class="btn sm hz" id="bulkDates2">Push phase dates onto clauses</button>
  </div>
  <div class="card">
    <div class="hd"><h3>Twenty-week implementation plan</h3>
      <span class="note">Each phase carries the clauses whose workstream lands in it.</span></div>
    <div class="bd gantt">
      <table>
        <thead><tr><th style="width:250px">Phase</th><th style="width:104px">Window</th><th style="width:78px">Clauses</th><th>Weeks 1–${WEEKS}</th></tr></thead>
        <tbody>${S.phases.map(p=>{
          const pc=phaseCount(p.key);
          const cl={length:pc.total}, done=pc.done;
          const left=(p.startWeek-1)/WEEKS*100, w=(p.endWeek-p.startWeek+1)/WEEKS*100;
          return `<tr>
            <td><div style="font-weight:700;font-size:13px"><span class="mono" style="color:var(--hazard-deep);font-size:11px">${p.key}</span> ${esc(p.title)}</div>
              <div style="font-size:11.5px;color:var(--mute);margin-top:2px;line-height:1.45">${esc(p.aim)}</div></td>
            <td class="mono" style="font-size:11.5px" title="${esc(pc.basis)}">W${p.startWeek}–W${p.endWeek}<div style="color:var(--mute);font-size:10.5px">${addWeeks(S.projectStart,p.startWeek-1)}</div></td>
            <td><div class="mono" style="font-size:11.5px">${done}/${cl.length}</div>
                <div style="font-size:9.5px;color:var(--mute);margin-top:1px">${esc(pc.basis)}</div>
                <div class="bar ${cl.length&&done===cl.length?"done":""}" style="margin-top:4px"><span style="width:${cl.length?done/cl.length*100:0}%"></span></div></td>
            <td><div class="gtrack">
              <div class="gbar ${p.key.toLowerCase()}" style="left:${left}%;width:${w}%">${cl.length?done/cl.length*100>=100?"complete":Math.round(done/cl.length*100)+"%":""}</div>
              <div class="gnow" style="left:${nowWeek/WEEKS*100}%" title="today"></div>
            </div></td></tr>`}).join("")}</tbody>
      </table>
    </div>
  </div>
  <div style="height:20px"></div>
  <div class="grid2">
    <div class="card"><div class="hd"><h3>Phase gates</h3><span class="note">What must be true to leave a phase.</span></div>
      <div class="bd"><ol style="margin:0;padding-left:18px;line-height:1.75;font-size:13px">
        <li><b>P0 → P1</b> ORSVAI matrix published and signed by the Managing Director.</li>
        <li><b>P1 → P2</b> Every one of the ${S.items.length} clauses carries a status, an owner and a due date.</li>
        <li><b>P2 → P3</b> All policy and SOP clauses closed and issued in Bangla and English.</li>
        <li><b>P3 → P4</b> Zero open Category 6 clauses in fire, electrical, structural and machine safety.</li>
        <li><b>P4 → P5</b> Payroll, attendance and production records reconcile three ways for a full month.</li>
        <li><b>P5 → P6</b> Training coverage above 95% of headcount with records complete.</li>
        <li><b>P6 → P7</b> Mock audit run under NEXT grading; every finding logged as a task.</li>
        <li><b>P7 → Audit</b> Zero open Category 4, 5 and 6 findings; evidence pack assembled.</li>
      </ol></div></div>
    <div class="card"><div class="hd"><h3>Workstream load</h3><span class="note">Where the effort actually sits.</span></div>
      <div class="bd">${Object.entries(S.items.reduce((a,x)=>{(a[x.workstream]=a[x.workstream]||{t:0,c:0});a[x.workstream].t++;if(isClosed(x))a[x.workstream].c++;return a},{}))
        .sort((a,b)=>b[1].t-a[1].t).map(([k,v])=>`
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
            <b>${esc(k)}</b><span class="mono" style="color:var(--mute)">${v.c}/${v.t}</span></div>
          <div class="bar ${v.c===v.t?"done":""}"><span style="width:${v.c/v.t*100}%"></span></div>
        </div>`).join("")}</div></div>
  </div>`;
}
function phaseCount(k){
  const all=S.items, crit=all.filter(x=>["CAT 4","CAT 5","CAT 6"].includes(x.grade));
  if(k==="P0"){const tot=S.sections.length,
      dn=S.sections.filter(s=>{const e=S.items.find(x=>x.sectionKey===s.key);return e&&e.owner&&e.responsible&&e.verify&&e.approve}).length;
    return {total:tot,done:dn,basis:"ORSVAI set"}}
  if(k==="P1") return {total:all.length,done:all.filter(x=>x.status!=="Not started").length,basis:"assessed"};
  if(k==="P6") return {total:all.length,done:all.filter(x=>["Awaiting verification","Verified","Closed"].includes(x.status)).length,basis:"re-tested"};
  if(k==="P7") return {total:crit.length,done:crit.filter(isClosed).length,basis:"Cat 4–6 closed"};
  const cl=all.filter(x=>x.phase===k);
  return {total:cl.length,done:cl.filter(isClosed).length,basis:"clauses"};
}
function addWeeks(iso,w){const x=d(iso);x.setDate(x.getDate()+w*7);return x.toISOString().slice(0,10)}

/* ------------------------------------------------------------- performance */
function vPerf(){
  const m=metrics();
  const all=[...S.items,...S.tasks];
  const closedWithDates=all.filter(x=>isClosed(x)&&x.completedDate&&(x.dueDate||x.revisedDueDate));
  const onTime=closedWithDates.filter(x=>timing(x).slip<=0).length;
  const otd=closedWithDates.length? onTime/closedWithDates.length*100 : 0;
  const avgSlip=closedWithDates.length? closedWithDates.reduce((a,x)=>a+Math.max(0,timing(x).slip),0)/closedWithDates.length : 0;

  // ageing of open items
  const buckets=[["0–30 days",0,30],["31–60",31,60],["61–90",61,90],["90+ days",91,99999]];
  const openDated=S.items.filter(x=>!isClosed(x)&&x.startDate&&days(d(x.startDate),d(todayISO()))>=0);
  const notYet=S.items.filter(x=>!isClosed(x)&&x.startDate&&days(d(x.startDate),d(todayISO()))<0).length;
  const age=buckets.map(([lab,lo,hi])=>[lab,openDated.filter(x=>{const a=days(d(x.startDate),d(todayISO()));return a>=lo&&a<=hi}).length]);

  // department scorecard by Responsible
  const dept=Object.entries(S.items.reduce((a,x)=>{
    const k=x.responsible||"Unassigned";
    a[k]=a[k]||{t:0,c:0,late:0,c6:0,w:0,wc:0};
    a[k].t++; a[k].w+=x.weight;
    if(isClosed(x)){a[k].c++;a[k].wc+=x.weight}
    if(timing(x).key==="overdue")a[k].late++;
    if(x.grade==="CAT 6"&&!isClosed(x))a[k].c6++;
    return a;},{}))
    .map(([k,v])=>({k,...v,pct:v.c/v.t*100,score:Math.max(0,(v.wc/v.w*100)-(v.late*4)-(v.c6*7))}))
    .sort((a,b)=>b.score-a.score);

  return `
  <div class="kpis">
    <div class="kpi ${m.readiness>85?"good":m.readiness>60?"warn":"bad"}"><div class="eyebrow">Readiness index</div>
      <div class="v">${m.readiness.toFixed(1)}%</div><div class="d">Closed weight ÷ total weight. Cat 6 counts 13×, Minor 1×.</div></div>
    <div class="kpi ${!closedWithDates.length?"":otd>=85?"good":otd>=65?"warn":"bad"}"><div class="eyebrow">On-time delivery</div>
      <div class="v">${closedWithDates.length?otd.toFixed(0)+"%":"—"}</div>
      <div class="d">${closedWithDates.length?onTime+" of "+closedWithDates.length+" closed on or before due":"No dated closures yet"}</div></div>
    <div class="kpi ${avgSlip>7?"bad":""}"><div class="eyebrow">Average slip</div>
      <div class="v">${closedWithDates.length?avgSlip.toFixed(1)+"d":"—"}</div><div class="d">Mean days late across closed work</div></div>
    <div class="kpi ${m.gateClear?"good":"bad"}"><div class="eyebrow">Zero-tolerance gate</div>
      <div class="v">${m.c6+m.c5}</div><div class="d">Open Cat 6 + Cat 5. Target is zero.</div></div>
    <div class="kpi"><div class="eyebrow">Reschedule rate</div>
      <div class="v">${S.items.length?(S.items.filter(x=>x.revisedDueDate).length/S.items.length*100).toFixed(0):0}%</div>
      <div class="d">Clauses carrying a revised due date</div></div>
  </div>

  <div style="height:20px"></div>
  <div class="grid2">
    <div class="card"><div class="hd"><h3>Severity burn-down</h3><span class="note">Closed vs open by grade.</span></div>
      <div class="bd">${GRADES.slice().reverse().map(g=>{
        const t=S.items.filter(x=>x.grade===g), c=t.filter(isClosed).length;
        return `<div style="margin-bottom:15px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
            ${gradeChip(g)}<span class="mono" style="font-size:11.5px;color:var(--mute)">${c} closed · ${t.length-c} open</span></div>
          <div class="bar ${c===t.length?"done":""}" style="height:8px"><span style="width:${t.length?c/t.length*100:0}%;background:${g==="CAT 6"?"var(--alert)":g==="CAT 5"||g==="CAT 4"?"var(--hazard-deep)":"var(--steel)"}"></span></div>
        </div>`}).join("")}</div></div>

    <div class="card"><div class="hd"><h3>Ageing of open clauses</h3><span class="note">Days since work started.</span></div>
      <div class="bd">${age.map(([lab,n])=>`
        <div style="margin-bottom:15px">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><b>${lab}</b><span class="mono">${n}</span></div>
          <div class="bar" style="height:8px"><span style="width:${openDated.length?n/openDated.length*100:0}%;background:${lab==="90+ days"?"var(--alert)":lab==="61–90"?"var(--hazard-deep)":"var(--steel)"}"></span></div>
        </div>`).join("")}
        ${openDated.length?"":`<p style="font-size:12.5px;color:var(--mute);margin:0">No clause has passed its start date yet${notYet?" — "+notYet+" are scheduled to begin later":""}. Ageing appears once work is under way.</p>`}
      </div></div>
  </div>

  <div style="height:20px"></div>
  <div class="card"><div class="hd"><h3>Department scorecard</h3>
    <span class="note">Score = weighted closure, less 4 points per overdue clause and 7 per open Category 6.</span></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Responsible</th><th style="width:80px">Clauses</th><th style="width:80px">Closed</th>
        <th style="width:80px">Overdue</th><th style="width:88px">Cat 6 open</th><th style="width:150px">Closure</th><th style="width:96px">Score</th></tr></thead>
      <tbody>${dept.map(r=>`<tr>
        <td style="font-weight:600;font-size:12.5px">${esc(r.k)}</td>
        <td class="mono">${r.t}</td><td class="mono">${r.c}</td>
        <td class="mono" style="color:${r.late?"var(--alert)":"inherit"}">${r.late}</td>
        <td class="mono" style="color:${r.c6?"var(--alert)":"inherit"}">${r.c6}</td>
        <td><div class="bar ${r.pct>=100?"done":""}"><span style="width:${r.pct}%"></span></div>
            <div class="mono" style="font-size:10px;color:var(--mute);margin-top:3px">${r.pct.toFixed(0)}%</div></td>
        <td><span class="pill ${r.score>=85?"p-done":r.score>=60?"p-verify":"p-block"}">${r.score.toFixed(0)}</span></td>
      </tr>`).join("")}</tbody>
    </table></div>
  </div>

  <div style="height:20px"></div>
  <div class="card"><div class="hd"><h3>Management read-out</h3><span class="note">Copy this into the monthly review pack.</span></div>
    <div class="bd" style="font-size:13.5px;line-height:1.75">
      <p style="margin-top:0">The site stands at <b>${m.readiness.toFixed(1)}%</b> severity-weighted readiness against the NEXT Supplier Auditing Standards issued June 2025,
      with <b>${m.closed}</b> of <b>${m.n}</b> clauses evidenced and closed.</p>
      <p>${m.gateClear
        ? "No Category 5 or 6 exposure remains. The site meets the zero-tolerance gate and can be put forward for audit."
        : `<b style="color:var(--alert)">The zero-tolerance gate is not met.</b> ${m.c6} Category 6 and ${m.c5} Category 5 clauses remain open — these are the only findings that can stop the order, and they take priority over everything else on this board.`}</p>
      <p>Delivery discipline is running at <b>${otd.toFixed(0)}%</b> on-time closure with an average slip of <b>${avgSlip.toFixed(1)} days</b>.
      ${m.overdue?`<b>${m.overdue}</b> clauses are currently overdue`:"No clause is currently overdue"}, and
      ${dept.filter(r=>r.late>0).length? `the largest concentration sits with ${esc(dept.slice().sort((a,b)=>b.late-a.late)[0].k)}.` : "the load is evenly held across departments."}</p>
    </div></div>`;
}

/* ---------------------------------------------------------------- register */
function vRegister(){
  const lic=S.items.filter(x=>x.workstream==="Licence");
  const pol=S.items.filter(x=>x.workstream==="Policy");
  const rec=S.items.filter(x=>x.workstream==="Records");
  const trn=S.items.filter(x=>x.workstream==="Training");
  const block=(title,note,rows)=>`
    <div class="card" style="margin-bottom:20px">
      <div class="hd"><h3>${title}</h3><span class="note">${note}</span>
        <div class="spacer"></div><span class="chipcount">${rows.filter(isClosed).length}/${rows.length} in place</span></div>
      <div class="tbl-wrap cap" style="max-height:400px"><table>
        <thead><tr><th style="width:62px">Ref</th><th>Document or record</th><th style="width:78px">If missing</th>
          <th style="width:130px">Holder</th><th style="width:112px">Status</th><th style="width:52px"></th></tr></thead>
        <tbody>${rows.map(x=>`<tr>
          <td><span class="mono" style="font-size:11px;color:var(--mute)">${x.id}</span></td>
          <td><div style="font-weight:600">${esc(x.clause)}</div>
            <div style="font-size:11.5px;color:var(--mute);margin-top:2px">${esc(x.evidence)}</div></td>
          <td>${gradeChip(x.grade)}</td>
          <td style="font-size:12px">${esc(x.responsible)}</td>
          <td>${statusPill(x.status)}</td>
          <td><button class="btn sm rowopen" data-id="${x.id}">Open</button></td>
        </tr>`).join("")}</tbody></table></div></div>`;
  return `
  <div class="card" style="margin-bottom:20px"><div class="hd"><h3>Audit-day pack</h3>
    <span class="note">What the auditor asks for in the opening meeting.</span></div>
    <div class="bd"><div class="kpis">
      <div class="kpi"><div class="eyebrow">Licences &amp; certificates</div><div class="v">${lic.filter(isClosed).length}/${lic.length}</div><div class="d">Fire, boiler, ETP, factory, trade</div></div>
      <div class="kpi"><div class="eyebrow">Policies</div><div class="v">${pol.filter(isClosed).length}/${pol.length}</div><div class="d">Signed, dated, in Bangla and English</div></div>
      <div class="kpi"><div class="eyebrow">Records &amp; registers</div><div class="v">${rec.filter(isClosed).length}/${rec.length}</div><div class="d">Payroll, hours, age, medical, maintenance</div></div>
      <div class="kpi"><div class="eyebrow">Training evidence</div><div class="v">${trn.filter(isClosed).length}/${trn.length}</div><div class="d">Module, attendance, competency check</div></div>
    </div></div></div>
  ${block("Licences, certificates and permits","Missing or expired paperwork here is graded hardest.",lic)}
  ${block("Policies","NEXT expects each of these to exist, be signed and be communicated.",pol)}
  ${block("Records and registers","The auditor cross-checks these against each other.",rec)}
  ${block("Training evidence","Date, content, trainer and attendees on every record.",trn)}`;
}

/* ==================================================================== modal */
function openClause(id){
  const x=S.items.find(i=>i.id===id); if(!x) return;
  const t=timing(x);
  document.getElementById("modal").innerHTML=`
    <div class="mh"><span class="mono" style="font-size:11.5px;color:var(--mute)">${x.id}</span>
      <h3>${esc(x.clause)}</h3>${gradeChip(x.grade)}<button class="btn sm" id="mx">Close</button></div>
    <div class="mb">
      <div class="req"><span class="lb">Section ${x.sectionNo} — ${esc(x.sectionTitle)}</span>${esc(x.requirement)}</div>
      <div class="req" style="border-left-color:var(--hazard)"><span class="lb">Evidence the auditor will ask for</span>${esc(x.evidence)}</div>
      <div class="req" style="border-left-color:var(--alert)"><span class="lb">Grade if this fails</span>
        NEXT would raise this as <b>${esc(x.grade)}</b>${["CAT 5","CAT 6"].includes(x.grade)?" — a zero-tolerance finding that must be closed before audit.":x.grade==="CAT 4"?" — a finding requiring immediate corrective action.":"."}</div>

      <div class="grid3">
        <div class="field"><label class="f">Status</label><select class="ce" data-f="status">${STATUSES.map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}</select></div>
        <div class="field"><label class="f">Progress %</label><input type="number" min="0" max="100" class="ce" data-f="progress" value="${x.progress||0}"></div>
        <div class="field"><label class="f">Workstream</label><input type="text" class="ce" data-f="workstream" value="${esc(x.workstream)}"></div>
      </div>
      <div class="grid3">
        <div class="field"><label class="f">Start date</label><input type="date" class="ce" data-f="startDate" value="${esc(x.startDate)}"></div>
        <div class="field"><label class="f">Original due date</label><input type="date" class="ce" data-f="dueDate" value="${esc(x.dueDate)}"></div>
        <div class="field"><label class="f">Revised due date</label><input type="date" class="ce" data-f="revisedDueDate" value="${esc(x.revisedDueDate)}"></div>
      </div>
      <div class="grid3">
        <div class="field"><label class="f">Completion date</label><input type="date" class="ce" data-f="completedDate" value="${esc(x.completedDate)}"></div>
        <div class="field"><label class="f">Replacement of</label><input type="text" class="ce" data-f="replacementOf" value="${esc(x.replacementOf)}" placeholder="e.g. NX-012"></div>
        <div class="field"><label class="f">Replaced by</label><input type="text" class="ce" data-f="replacedBy" value="${esc(x.replacedBy)}" placeholder="e.g. NX-260"></div>
      </div>
      <div style="margin-bottom:14px"><span class="pill ${t.cls}">${t.label}</span>
        ${x.revisedDueDate?`<span class="pill p-repl" style="margin-left:6px">Rescheduled from ${esc(x.dueDate||"undated")}</span>`:""}</div>

      <div class="eyebrow" style="margin:18px 0 9px">ORSVAI accountability</div>
      <div class="grid3">
        <div class="field"><label class="f">O — Owner</label><input type="text" class="ce" data-f="owner" value="${esc(x.owner)}"></div>
        <div class="field"><label class="f">R — Responsible</label><input type="text" class="ce" data-f="responsible" value="${esc(x.responsible)}"></div>
        <div class="field"><label class="f">S — Support</label><input type="text" class="ce" data-f="support" value="${esc(x.support)}"></div>
      </div>
      <div class="grid3">
        <div class="field"><label class="f">V — Verify</label><input type="text" class="ce" data-f="verify" value="${esc(x.verify)}"></div>
        <div class="field"><label class="f">A — Approve</label><input type="text" class="ce" data-f="approve" value="${esc(x.approve)}"></div>
        <div class="field"><label class="f">I — Inform</label><input type="text" class="ce" data-f="inform" value="${esc(x.inform)}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label class="f">Verified by</label><input type="text" class="ce" data-f="verifiedBy" value="${esc(x.verifiedBy)}"></div>
        <div class="field"><label class="f">Approved by</label><input type="text" class="ce" data-f="approvedBy" value="${esc(x.approvedBy)}"></div>
      </div>

      <div class="field"><label class="f">Add an update</label>
        <textarea id="upd" placeholder="What changed, what is blocking it, what happens next."></textarea></div>
      ${x.updateNote?`<div class="eyebrow" style="margin:14px 0 7px">Update log</div><div class="log">${renderLog(x.updateNote)}</div>`:""}
    </div>
    <div class="mf">
      <button class="btn dgr" id="mdel">Delete clause</button>
      <div class="spacer" style="flex:1"></div>
      <button class="btn" id="mcancel">Cancel</button>
      <button class="btn hz" id="mclose">Mark closed today</button>
      <button class="btn pri" id="msave">Save</button>
    </div>`;
  showModal();
  const grab=()=>{document.querySelectorAll(".ce").forEach(i=>{
      let v=i.value; if(i.dataset.f==="progress")v=Math.max(0,Math.min(100,+v||0)); x[i.dataset.f]=v;});
    const u=document.getElementById("upd").value.trim();
    if(u) x.updateNote=(x.updateNote?x.updateNote+"\n":"")+todayISO()+"|"+u;
    x.lastUpdated=todayISO();};
  document.getElementById("msave").onclick=()=>{grab();hideModal();render();toast(x.id+" saved")};
  document.getElementById("mclose").onclick=()=>{grab();x.status="Closed";x.progress=100;x.completedDate=todayISO();
    x.updateNote=(x.updateNote?x.updateNote+"\n":"")+todayISO()+"|Closed and evidence filed.";hideModal();render();toast(x.id+" closed")};
  document.getElementById("mdel").onclick=()=>{if(confirm("Delete "+x.id+" permanently?")){S.items=S.items.filter(i=>i.id!==x.id);hideModal();render();toast("Clause deleted")}};
  document.getElementById("mcancel").onclick=hideModal;
  document.getElementById("mx").onclick=hideModal;
}
function renderLog(s){
  return s.split("\n").filter(Boolean).reverse().map(l=>{
    const i=l.indexOf("|"); const dt=i>0?l.slice(0,i):""; const tx=i>0?l.slice(i+1):l;
    return `<div class="e"><time>${esc(dt)}</time>${esc(tx)}</div>`}).join("");
}

function openTask(id){
  const isNew = id===null;
  let t = isNew ? {id:nextTaskId(),title:"",detail:"",type:"Remediation",linkedClause:"",
        owner:"",responsible:"",support:"",verify:"",approve:"",inform:"",
        status:"Not started",progress:0,startDate:todayISO(),dueDate:"",revisedDueDate:"",completedDate:"",
        replacementOf:"",replacedBy:"",cost:0,updateNote:"",lastUpdated:""}
      : S.tasks.find(x=>x.id===id);
  if(!t) return;
  const ti=timing(t);
  document.getElementById("modal").innerHTML=`
    <div class="mh"><span class="mono" style="font-size:11.5px;color:var(--mute)">${esc(t.id)}</span>
      <h3>${isNew?"New task":esc(t.title)}</h3>${isNew?"":`<span class="pill ${ti.cls}">${ti.label}</span>`}
      <button class="btn sm" id="mx">Close</button></div>
    <div class="mb">
      <div class="field"><label class="f">Task</label><input type="text" class="te" data-f="title" value="${esc(t.title)}" placeholder="Install photoluminescent exit signage on all four floors"></div>
      <div class="field"><label class="f">Detail</label><textarea class="te" data-f="detail" placeholder="Scope, quantity, contractor, acceptance criteria.">${esc(t.detail)}</textarea></div>
      <div class="grid3">
        <div class="field"><label class="f">Type</label><select class="te" data-f="type">${TASK_TYPES.map(x=>`<option ${t.type===x?"selected":""}>${x}</option>`).join("")}</select></div>
        <div class="field"><label class="f">Linked clause</label><input type="text" class="te" data-f="linkedClause" value="${esc(t.linkedClause)}" placeholder="NX-045"></div>
        <div class="field"><label class="f">Status</label><select class="te" data-f="status">${STATUSES.map(s=>`<option ${t.status===s?"selected":""}>${s}</option>`).join("")}</select></div>
      </div>
      <div class="grid3">
        <div class="field"><label class="f">Start date</label><input type="date" class="te" data-f="startDate" value="${esc(t.startDate)}"></div>
        <div class="field"><label class="f">Due date</label><input type="date" class="te" data-f="dueDate" value="${esc(t.dueDate)}"></div>
        <div class="field"><label class="f">Revised due date</label><input type="date" class="te" data-f="revisedDueDate" value="${esc(t.revisedDueDate)}"></div>
      </div>
      <div class="grid3">
        <div class="field"><label class="f">Completion date</label><input type="date" class="te" data-f="completedDate" value="${esc(t.completedDate)}"></div>
        <div class="field"><label class="f">Progress %</label><input type="number" min="0" max="100" class="te" data-f="progress" value="${t.progress||0}"></div>
        <div class="field"><label class="f">Cost (BDT)</label><input type="number" min="0" class="te" data-f="cost" value="${t.cost||0}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label class="f">Replacement of</label><input type="text" class="te" data-f="replacementOf" value="${esc(t.replacementOf)}" placeholder="Task this one supersedes"></div>
        <div class="field"><label class="f">Replaced by</label><input type="text" class="te" data-f="replacedBy" value="${esc(t.replacedBy)}" placeholder="Task that supersedes this one"></div>
      </div>
      <div class="eyebrow" style="margin:18px 0 9px">ORSVAI accountability</div>
      <div class="grid3">
        <div class="field"><label class="f">O — Owner</label><input type="text" class="te" data-f="owner" value="${esc(t.owner)}"></div>
        <div class="field"><label class="f">R — Responsible</label><input type="text" class="te" data-f="responsible" value="${esc(t.responsible)}"></div>
        <div class="field"><label class="f">S — Support</label><input type="text" class="te" data-f="support" value="${esc(t.support)}"></div>
      </div>
      <div class="grid3">
        <div class="field"><label class="f">V — Verify</label><input type="text" class="te" data-f="verify" value="${esc(t.verify)}"></div>
        <div class="field"><label class="f">A — Approve</label><input type="text" class="te" data-f="approve" value="${esc(t.approve)}"></div>
        <div class="field"><label class="f">I — Inform</label><input type="text" class="te" data-f="inform" value="${esc(t.inform)}"></div>
      </div>
      <div class="field"><label class="f">Add an update</label><textarea id="tupd" placeholder="Progress, obstacle, decision needed."></textarea></div>
      ${t.updateNote?`<div class="eyebrow" style="margin:14px 0 7px">Update log</div><div class="log">${renderLog(t.updateNote)}</div>`:""}
    </div>
    <div class="mf">
      ${isNew?"":`<button class="btn dgr" id="tdel">Delete task</button>
                  <button class="btn" id="trepl">Replace with new task</button>`}
      <div class="spacer" style="flex:1"></div>
      <button class="btn" id="mcancel">Cancel</button>
      ${isNew?"":`<button class="btn hz" id="tclose">Mark closed today</button>`}
      <button class="btn pri" id="tsave">${isNew?"Add task":"Save"}</button>
    </div>`;
  showModal();
  const grab=()=>{document.querySelectorAll(".te").forEach(i=>{
      let v=i.value;
      if(i.dataset.f==="progress")v=Math.max(0,Math.min(100,+v||0));
      if(i.dataset.f==="cost")v=+v||0;
      t[i.dataset.f]=v;});
    const u=document.getElementById("tupd").value.trim();
    if(u) t.updateNote=(t.updateNote?t.updateNote+"\n":"")+todayISO()+"|"+u;
    t.lastUpdated=todayISO();};
  document.getElementById("tsave").onclick=()=>{
    grab();
    if(!t.title.trim()){toast("Give the task a name first");return}
    if(isNew) S.tasks.push(t);
    hideModal();render();toast(isNew?"Task "+t.id+" added":"Task saved")};
  document.getElementById("mcancel").onclick=hideModal;
  document.getElementById("mx").onclick=hideModal;
  if(!isNew){
    document.getElementById("tclose").onclick=()=>{grab();t.status="Closed";t.progress=100;t.completedDate=todayISO();
      t.updateNote=(t.updateNote?t.updateNote+"\n":"")+todayISO()+"|Completed and evidence filed.";hideModal();render();toast(t.id+" closed")};
    document.getElementById("tdel").onclick=()=>{if(confirm("Delete "+t.id+"?")){S.tasks=S.tasks.filter(x=>x.id!==t.id);hideModal();render();toast("Task deleted")}};
    document.getElementById("trepl").onclick=()=>{
      grab();
      const n={...JSON.parse(JSON.stringify(t)),id:nextTaskId(),status:"Not started",progress:0,
        completedDate:"",revisedDueDate:"",replacementOf:t.id,replacedBy:"",
        startDate:todayISO(),updateNote:todayISO()+"|Raised to replace "+t.id+"."};
      t.replacedBy=n.id; t.status="Closed"; t.completedDate=todayISO();
      t.updateNote=(t.updateNote?t.updateNote+"\n":"")+todayISO()+"|Superseded by "+n.id+".";
      S.tasks.push(n); hideModal(); render(); openTask(n.id); toast(t.id+" replaced by "+n.id);
    };
  }
}
function nextTaskId(){
  let n=1; while(S.tasks.some(t=>t.id==="TSK-"+String(n).padStart(3,"0"))) n++;
  return "TSK-"+String(n).padStart(3,"0");
}
function openNewClause(){
  const n=S.items.length+1;
  const x={id:"NX-"+String(900+S.items.filter(i=>i.id.startsWith("NX-9")).length+1),
    sectionKey:S.sections[0].key,sectionNo:S.sections[0].no,sectionTitle:S.sections[0].title,
    clause:"",requirement:"",evidence:"",grade:"MAJOR",weight:3,workstream:"Records",phase:"P4",
    owner:"",responsible:"",support:"",verify:"",approve:"",inform:"",
    status:"Not started",progress:0,startDate:todayISO(),dueDate:"",completedDate:"",revisedDueDate:"",
    replacementOf:"",replacedBy:"",lastUpdated:todayISO(),updateNote:"",verifiedBy:"",approvedBy:"",cost:0,notes:""};
  document.getElementById("modal").innerHTML=`
    <div class="mh"><h3>Add a clause</h3><button class="btn sm" id="mx">Close</button></div>
    <div class="mb">
      <div class="field"><label class="f">Clause title</label><input type="text" id="nc_clause" placeholder="Short name for the control"></div>
      <div class="field"><label class="f">Requirement</label><textarea id="nc_req" placeholder="What the standard actually asks for."></textarea></div>
      <div class="field"><label class="f">Evidence</label><textarea id="nc_ev" placeholder="What the auditor will want to see."></textarea></div>
      <div class="grid3">
        <div class="field"><label class="f">Section</label><select id="nc_sec">${S.sections.map(s=>`<option value="${s.key}">${s.no} — ${esc(s.title)}</option>`).join("")}</select></div>
        <div class="field"><label class="f">Grade if failed</label><select id="nc_grade">${GRADES.map(g=>`<option ${g==="MAJOR"?"selected":""}>${g}</option>`).join("")}</select></div>
        <div class="field"><label class="f">Workstream</label><select id="nc_ws">${["Policy","Records","Practice","Facility","Engineering","Training","Licence"].map(w=>`<option ${w==="Records"?"selected":""}>${w}</option>`).join("")}</select></div>
      </div>
      <div class="grid2">
        <div class="field"><label class="f">Responsible</label><input type="text" id="nc_resp"></div>
        <div class="field"><label class="f">Due date</label><input type="date" id="nc_due"></div>
      </div>
    </div>
    <div class="mf"><button class="btn" id="mcancel">Cancel</button><button class="btn pri" id="nc_save">Add clause</button></div>`;
  showModal();
  document.getElementById("mcancel").onclick=hideModal;
  document.getElementById("mx").onclick=hideModal;
  document.getElementById("nc_save").onclick=()=>{
    const c=document.getElementById("nc_clause").value.trim();
    if(!c){toast("Give the clause a title");return}
    const sk=document.getElementById("nc_sec").value;
    const s=S.sections.find(z=>z.key===sk);
    const tmpl=S.items.find(i=>i.sectionKey===sk)||{};
    const g=document.getElementById("nc_grade").value;
    Object.assign(x,{clause:c,requirement:document.getElementById("nc_req").value,
      evidence:document.getElementById("nc_ev").value,sectionKey:sk,sectionNo:s.no,sectionTitle:s.title,
      grade:g,weight:S.meta.gradeWeight[g],workstream:document.getElementById("nc_ws").value,
      responsible:document.getElementById("nc_resp").value||tmpl.responsible||"",
      owner:tmpl.owner||"",support:tmpl.support||"",verify:tmpl.verify||"",approve:tmpl.approve||"",inform:tmpl.inform||"",
      dueDate:document.getElementById("nc_due").value});
    S.items.push(x); s.count=(s.count||0)+1; hideModal(); render(); toast("Clause "+x.id+" added");
  };
}
function showModal(){document.getElementById("scrim").classList.add("on")}
function hideModal(){document.getElementById("scrim").classList.remove("on")}
document.getElementById("scrim").onclick=e=>{if(e.target.id==="scrim")hideModal()};
document.addEventListener("keydown",e=>{if(e.key==="Escape")hideModal()});

/* ==================================================================== wire */
function wire(){
  document.querySelectorAll(".rowopen").forEach(b=>b.onclick=e=>{e.stopPropagation();openClause(b.dataset.id)});
  document.querySelectorAll(".taskopen").forEach(b=>b.onclick=()=>openTask(b.dataset.id));
  document.querySelectorAll(".heatcell[data-sec]").forEach(c=>c.onclick=()=>{
    filters={sec:c.dataset.sec,grade:"",status:"",ws:"",q:""};view="checklist";window.scrollTo(0,0);render()});

  const bind=(id,fn)=>{const e=document.getElementById(id); if(e) fn(e)};
  bind("fq",e=>{e.oninput=()=>{filters.q=e.value;const p=e.selectionStart;render();
    const n=document.getElementById("fq");if(n){n.focus();n.setSelectionRange(p,p)}}});
  bind("fsec",e=>e.onchange=()=>{filters.sec=e.value;render()});
  bind("fgrade",e=>e.onchange=()=>{filters.grade=e.value;render()});
  bind("fstatus",e=>e.onchange=()=>{filters.status=e.value;render()});
  bind("fws",e=>e.onchange=()=>{filters.ws=e.value;render()});
  bind("fclear",e=>e.onclick=()=>{filters={sec:"",grade:"",status:"",ws:"",q:""};render()});
  bind("addClause",e=>e.onclick=openNewClause);
  bind("bulkDates",e=>e.onclick=applyPlanDates);
  bind("bulkDates2",e=>e.onclick=applyPlanDates);

  bind("tq",e=>{e.oninput=()=>{taskFilters.q=e.value;const p=e.selectionStart;render();
    const n=document.getElementById("tq");if(n){n.focus();n.setSelectionRange(p,p)}}});
  bind("tstatus",e=>e.onchange=()=>{taskFilters.status=e.value;render()});
  bind("towner",e=>e.onchange=()=>{taskFilters.owner=e.value;render()});
  bind("tlate",e=>e.onchange=()=>{taskFilters.late=e.checked;render()});
  bind("tclear",e=>e.onclick=()=>{taskFilters={status:"",owner:"",q:"",late:false};render()});
  bind("addTask",e=>e.onclick=()=>openTask(null));
  bind("addTask2",e=>e.onclick=()=>openTask(null));
  bind("genTasks",e=>e.onclick=generateTasks);
  bind("genTasks2",e=>e.onclick=generateTasks);

  bind("pstart",e=>e.onchange=()=>{S.projectStart=e.value;render()});
  document.querySelectorAll("input.ors").forEach(i=>i.onchange=()=>{
    S.items.filter(x=>x.sectionKey===i.dataset.sec).forEach(x=>x[i.dataset.f]=i.value);
    toast("Applied to every clause in section "+i.dataset.sec)});
}

/* -------------------------------------------------------------- bulk tools */
function applyPlanDates(){
  const map={}; S.phases.forEach(p=>map[p.key]=p);
  let n=0;
  S.items.forEach(x=>{
    const p=map[x.phase]; if(!p) return;
    if(!x.startDate){x.startDate=addWeeks(S.projectStart,p.startWeek-1);n++}
    if(!x.dueDate){x.dueDate=addWeeks(S.projectStart,p.endWeek);n++}
  });
  render(); toast(n+" dates written from the project plan");
}
function generateTasks(){
  const src=S.items.filter(x=>!isClosed(x)&&["CAT 5","CAT 6"].includes(x.grade)&&!S.tasks.some(t=>t.linkedClause===x.id));
  if(!src.length){toast("Every open Cat 5 and 6 clause already has a task");return}
  src.forEach(x=>{
    S.tasks.push({id:nextTaskId(),title:"Close "+x.clause,detail:x.requirement,
      type:({Engineering:"Engineering",Facility:"Remediation",Licence:"Licence",Training:"Training",
             Policy:"Document",Records:"Document",Practice:"Inspection"})[x.workstream]||"Remediation",
      linkedClause:x.id,owner:x.owner,responsible:x.responsible,support:x.support,
      verify:x.verify,approve:x.approve,inform:x.inform,
      status:"Not started",progress:0,startDate:todayISO(),
      dueDate:x.revisedDueDate||x.dueDate||"",revisedDueDate:"",completedDate:"",
      replacementOf:"",replacedBy:"",cost:0,lastUpdated:todayISO(),
      updateNote:todayISO()+"|Raised from "+x.grade+" clause "+x.id+"."});
  });
  render(); toast(src.length+" tasks generated");
}

/* ------------------------------------------------------------------- io ---- */
document.getElementById("btnExport").onclick=()=>{
  const b=new Blob([JSON.stringify(S,null,1)],{type:"application/json"});
  dl(b,"next-cop-board-"+todayISO()+".json"); toast("Board exported");
};
document.getElementById("btnCsv").onclick=()=>{
  const cols=["id","sectionNo","sectionTitle","clause","requirement","evidence","grade","weight","workstream","phase",
    "owner","responsible","support","verify","approve","inform","status","progress",
    "startDate","dueDate","revisedDueDate","completedDate","replacementOf","replacedBy","verifiedBy","approvedBy","lastUpdated"];
  const q=v=>'"'+String(v??"").replace(/"/g,'""').replace(/\n/g," ⏎ ")+'"';
  let csv=cols.join(",")+"\n"+S.items.map(x=>cols.map(c=>q(x[c])).join(",")).join("\n");
  csv+="\n\n"+["id","title","detail","type","linkedClause","status","progress","startDate","dueDate","revisedDueDate",
    "completedDate","replacementOf","replacedBy","owner","responsible","verify","approve","cost"].join(",")+"\n"
    +S.tasks.map(t=>["id","title","detail","type","linkedClause","status","progress","startDate","dueDate","revisedDueDate",
      "completedDate","replacementOf","replacedBy","owner","responsible","verify","approve","cost"].map(c=>q(t[c])).join(",")).join("\n");
  dl(new Blob([csv],{type:"text/csv"}),"next-cop-board-"+todayISO()+".csv"); toast("CSV exported");
};
document.getElementById("btnImport").onclick=()=>document.getElementById("fileIn").click();
document.getElementById("fileIn").onchange=e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{try{const j=JSON.parse(r.result);
      if(!j.items) throw new Error("no items");
      S=j; if(!S.tasks)S.tasks=[]; if(!S.projectStart)S.projectStart=todayISO();
      render(); toast("Board loaded — "+S.items.length+" clauses, "+S.tasks.length+" tasks");
    }catch(err){toast("That file is not a board export")}};
  r.readAsText(f); e.target.value="";
};
document.getElementById("btnSync").onclick=async()=>{
  if(!APPS_SCRIPT_URL){
    toast("Paste your Apps Script /exec URL into APPS_SCRIPT_URL first"); return;
  }
  try{
    const r=await fetch(APPS_SCRIPT_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:"save",payload:S})});
    const j=await r.json();
    toast(j.ok? "Synced to Google Sheet" : "Sync failed: "+(j.error||"unknown"));
  }catch(err){toast("Sync failed — check the Apps Script deployment")}
};
function dl(blob,name){
  const u=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=u; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(u),1500);
}

/* ---------------------------------------------------------------- boot ---- */
function applyConfig(){
  const c=CFG.creditPartner||"Industry Compliance & Sustainability Platform";
  const t=CFG.technologyPartner||"guulba — technology for better performance";
  const rail=document.getElementById("railPartners");
  if(rail) rail.innerHTML=`<b>Credit partner</b>${esc(c)}<br><br><b>Technology partner</b>${esc(t)}`;
  const fc=document.getElementById("footCredit"); if(fc) fc.textContent=c;
  const ft=document.getElementById("footTech");   if(ft) ft.textContent=t;
  const sn=document.getElementById("siteName");
  if(sn && CFG.siteName){ sn.textContent=CFG.siteName; sn.style.display="block"; }
  if(!APPS_SCRIPT_URL){
    const b=document.getElementById("btnSync");
    if(b){ b.classList.remove("pri");
           b.title="Set appsScriptUrl in assets/js/config.js to enable syncing"; }
  }
}

applyConfig();
render();
