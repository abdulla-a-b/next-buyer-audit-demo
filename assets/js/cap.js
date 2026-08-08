/* NEXT COP Readiness Board — Corrective Action Plan (CAP)
 *
 * A CAP is what NEXT asks for after a finding: what was found, why it happened,
 * what stops it now, what stops it recurring, who verified it, and whether the
 * fix actually held. This module carries that whole lifecycle in the browser so
 * the plan is developed here rather than in a workbook that goes stale.
 *
 * Lifecycle: Draft → Open → In progress → Awaiting verification → Verified →
 *            Closed, with an effectiveness review after closure.
 *
 * Credit partner    : Industry Compliance & Sustainability Platform
 * Technology partner: guulba — technology for better performance
 */
'use strict';

window.BOARD_EXT = window.BOARD_EXT || { views: [], render: {}, wire: [] };
window.GRID_DATASETS = window.GRID_DATASETS || {};

const CAP_STATUS = ["Draft","Open","In progress","Awaiting verification","Verified","Closed"];
const CAP_SOURCE = ["Internal gap assessment","Internal audit","Mock audit","NEXT audit",
                    "Buyer visit","Worker grievance","Incident","Self-assessment"];
const CAP_CAUSE  = ["Management system","Method / procedure","Machine / equipment",
                    "Material / supply","Manpower / competence","Measurement / monitoring",
                    "Environment / facility","Budget / resource"];
const CAP_VERIFY = ["Document review","Physical inspection","Worker interview",
                    "Record sampling","Re-test / measurement","Third-party certificate"];
const CAP_EFFECT = ["Not assessed","Effective","Partially effective","Not effective"];

let capFilters = {status:"", grade:"", owner:"", q:"", late:false};

function caps(){ if(!S.caps) S.caps = []; return S.caps; }
function capClosed(c){ return c.status === "Closed"; }
function capOpen(c){ return !capClosed(c); }
function nextCapId(){
  let n = 1;
  while(caps().some(c => c.id === "CAP-" + String(n).padStart(3, "0"))) n++;
  return "CAP-" + String(n).padStart(3, "0");
}
function capClause(c){ return S.items.find(x => x.id === c.clauseId) || null; }
function capWeight(c){ return (S.meta.gradeWeight || {})[c.grade] || 1; }

/* CAP timing reuses the board's single delay rule. */
function capTiming(c){
  return timing({status: capClosed(c) ? "Closed" : c.status,
                 dueDate: c.targetDate, revisedDueDate: c.revisedTargetDate,
                 completedDate: c.completedDate});
}

function capMetrics(){
  const all = caps();
  const open = all.filter(capOpen);
  const wAll = all.reduce((a, c) => a + capWeight(c), 0);
  const wClosed = all.filter(capClosed).reduce((a, c) => a + capWeight(c), 0);
  const closedDated = all.filter(c => capClosed(c) && c.completedDate &&
                                      (c.revisedTargetDate || c.targetDate));
  const onTime = closedDated.filter(c => capTiming(c).slip <= 0).length;
  const assessed = all.filter(c => capClosed(c) && c.effectiveness && c.effectiveness !== "Not assessed");
  return {
    total: all.length,
    open: open.length,
    closed: all.length - open.length,
    completion: wAll ? wClosed / wAll * 100 : 0,
    overdue: all.filter(c => capTiming(c).key === "overdue").length,
    awaiting: all.filter(c => c.status === "Awaiting verification").length,
    draft: all.filter(c => c.status === "Draft").length,
    zeroTol: open.filter(c => c.grade === "CAT 6" || c.grade === "CAT 5").length,
    noRootCause: open.filter(c => !String(c.rootCause || "").trim()).length,
    noPreventive: open.filter(c => !String(c.preventiveAction || "").trim()).length,
    onTimePct: closedDated.length ? onTime / closedDated.length * 100 : null,
    assessed: assessed.length,
    effective: assessed.filter(c => c.effectiveness === "Effective").length,
    ineffective: assessed.filter(c => c.effectiveness === "Not effective").length,
    cost: all.reduce((a, c) => a + (Number(c.cost) || 0), 0),
  };
}

/* -------------------------------------------------------------------- view */
function vCap(){
  const m = capMetrics();
  let rows = caps().filter(c =>
    (!capFilters.status || c.status === capFilters.status) &&
    (!capFilters.grade  || c.grade === capFilters.grade) &&
    (!capFilters.owner  || c.responsible === capFilters.owner) &&
    (!capFilters.late   || capTiming(c).key === "overdue") &&
    (!capFilters.q || (c.id + c.clauseId + c.finding + c.correctiveAction + c.rootCause)
       .toLowerCase().includes(capFilters.q.toLowerCase())));
  rows.sort((a, b) => (GRADES.indexOf(b.grade) - GRADES.indexOf(a.grade))
                   || String(a.revisedTargetDate || a.targetDate || "9999")
                      .localeCompare(b.revisedTargetDate || b.targetDate || "9999"));
  const owners = [...new Set(caps().map(c => c.responsible).filter(Boolean))].sort();

  if(!caps().length){
    return `<div class="card"><div class="empty">
      <h4>No corrective action plans yet</h4>
      <p style="max-width:560px;margin:6px auto 0">A CAP is raised against a finding, not against
      a clause in the abstract. Generate one for every open zero-tolerance clause to start, then
      add root cause and preventive action as the investigation proceeds.</p>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn hz" id="capGenZT">Raise CAPs for open Cat 5 &amp; 6</button>
        <button class="btn" id="capGenAll">Raise CAPs for every open clause</button>
        <button class="btn pri" id="capNew">New CAP</button>
      </div></div></div>`;
  }

  return `
  <div class="kpis" style="margin-bottom:16px">
    <div class="kpi ${m.completion>85?"good":m.completion>50?"":"warn"}">
      <div class="eyebrow">CAP completion</div><div class="v">${m.completion.toFixed(0)}%</div>
      <div class="bar ${m.completion>=100?"done":""}" style="margin-bottom:5px"><span style="width:${m.completion}%"></span></div>
      <div class="d">Severity weighted, not a plan count</div></div>
    <div class="kpi"><div class="eyebrow">Open CAPs</div><div class="v">${m.open}</div>
      <div class="d">${m.closed} closed of ${m.total}</div></div>
    <div class="kpi ${m.zeroTol?"bad":"good"}"><div class="eyebrow">Zero-tolerance open</div>
      <div class="v">${m.zeroTol}</div><div class="d">Cat 5 and Cat 6 CAPs still running</div></div>
    <div class="kpi ${m.overdue?"bad":""}"><div class="eyebrow">Overdue</div><div class="v">${m.overdue}</div>
      <div class="d">Past target or revised target</div></div>
    <div class="kpi ${m.awaiting?"warn":""}"><div class="eyebrow">Awaiting verification</div>
      <div class="v">${m.awaiting}</div><div class="d">Work done, evidence not yet checked</div></div>
    <div class="kpi ${m.ineffective?"bad":""}"><div class="eyebrow">Effectiveness</div>
      <div class="v">${m.assessed?`${m.effective}/${m.assessed}`:"—"}</div>
      <div class="d">${m.assessed?`${m.ineffective} found not effective`:"No closure reviewed yet"}</div></div>
  </div>

  ${(m.noRootCause || m.noPreventive) ? `
  <div class="card" style="margin-bottom:16px;border-left:3px solid var(--hazard)">
    <div class="bd" style="font-size:13px">
      <b>Plan quality.</b>
      ${m.noRootCause ? `<b>${m.noRootCause}</b> open CAPs have no root cause recorded. ` : ""}
      ${m.noPreventive ? `<b>${m.noPreventive}</b> have no preventive action. ` : ""}
      NEXT accepts a corrective action that fixes the instance, but a repeat finding at the next
      audit is graded harder. The preventive action is what stops the repeat.
    </div></div>` : ""}

  <div class="filters">
    <input type="text" class="search" id="capq" placeholder="Search finding, cause, action…" value="${esc(capFilters.q)}">
    <select id="capstatus"><option value="">All statuses</option>${CAP_STATUS.map(s=>`<option ${capFilters.status===s?"selected":""}>${s}</option>`).join("")}</select>
    <select id="capgrade"><option value="">All grades</option>${GRADES.slice().reverse().map(g=>`<option ${capFilters.grade===g?"selected":""}>${g}</option>`).join("")}</select>
    <select id="capowner"><option value="">All owners</option>${owners.map(o=>`<option ${capFilters.owner===o?"selected":""}>${esc(o)}</option>`).join("")}</select>
    <label class="inline"><input type="checkbox" id="caplate" ${capFilters.late?"checked":""}> Overdue only</label>
    <button class="btn sm" id="capclear">Clear</button>
    <span class="chipcount">${rows.length} of ${caps().length}</span>
    <div class="spacer"></div>
    <button class="btn sm" id="capGenZT">Raise for open Cat 5 &amp; 6</button>
    <button class="btn sm" id="capExport">Export CAP</button>
    <button class="btn sm pri" id="capNew">New CAP</button>
  </div>

  <div class="card"><div class="tbl-wrap xwide"><table>
    <thead><tr>
      <th style="width:74px">CAP</th><th style="width:70px">Clause</th><th style="width:78px">Grade</th>
      <th style="min-width:260px">Finding &amp; corrective action</th>
      <th style="width:150px">Root cause</th><th style="width:130px">Responsible</th>
      <th style="width:132px">Status</th><th style="width:112px">Target</th>
      <th style="width:112px">Timing</th><th style="width:110px">Effectiveness</th><th style="width:58px"></th>
    </tr></thead>
    <tbody>${rows.map(c => {
      const t = capTiming(c);
      const stage = CAP_STATUS.indexOf(c.status);
      return `<tr>
        <td><span class="mono" style="font-size:11px;font-weight:600">${esc(c.id)}</span>
          <div class="capstage">${CAP_STATUS.map((s,i)=>`<i class="${i<=stage?"on":""}${c.status==="Closed"?" done":""}"></i>`).join("")}</div></td>
        <td><span class="mono" style="font-size:11px;color:var(--steel)">${esc(c.clauseId||"—")}</span></td>
        <td>${gradeChip(c.grade)}</td>
        <td><div style="font-weight:600">${esc(c.finding||"(finding not written)")}</div>
          <div style="font-size:11.5px;color:var(--mute);margin-top:3px;line-height:1.45">
            ${c.correctiveAction ? esc(c.correctiveAction).slice(0,150) : `<span style="color:var(--alert)">No corrective action written yet</span>`}</div></td>
        <td style="font-size:11.5px">${c.rootCause
            ? `<span class="pill p-prog">${esc(c.rootCauseCategory||"Cause set")}</span>`
            : `<span class="pill p-block">Not analysed</span>`}</td>
        <td style="font-size:12px">${esc(c.responsible||"")}</td>
        <td>${statusPill(c.status==="Draft"?"Not started":c.status)}
          ${c.status==="Draft"?`<div style="font-size:10px;color:var(--mute);margin-top:2px">draft</div>`:""}</td>
        <td class="mono" style="font-size:11.5px">${esc(c.revisedTargetDate||c.targetDate||"—")}
          ${c.revisedTargetDate?`<div style="font-size:10px;color:var(--hazard-deep)">was ${esc(c.targetDate||"—")}</div>`:""}</td>
        <td><span class="pill ${t.cls}">${t.label}</span></td>
        <td>${c.effectiveness && c.effectiveness!=="Not assessed"
            ? `<span class="pill ${c.effectiveness==="Effective"?"p-done":c.effectiveness==="Not effective"?"p-block":"p-verify"}">${esc(c.effectiveness)}</span>`
            : `<span style="font-size:11px;color:var(--mute)">—</span>`}</td>
        <td><button class="btn sm capopen" data-id="${esc(c.id)}">Open</button></td>
      </tr>`}).join("")}</tbody>
  </table></div></div>`;
}

/* ------------------------------------------------------------- CAP editor */
function openCap(id){
  const isNew = id === null;
  let c = isNew ? capBlank() : caps().find(x => x.id === id);
  if(!c) return;
  const cl = capClause(c);
  const t = capTiming(c);
  const stage = CAP_STATUS.indexOf(c.status);

  document.getElementById("modal").innerHTML = `
    <div class="mh"><span class="mono" style="font-size:11.5px;color:var(--mute)">${esc(c.id)}</span>
      <h3>${isNew ? "New corrective action plan" : esc(c.finding || c.id)}</h3>
      ${gradeChip(c.grade)}${isNew ? "" : `<span class="pill ${t.cls}">${t.label}</span>`}
      <button class="btn sm" id="mx">Close</button></div>
    <div class="mb">
      <div class="capbar">${CAP_STATUS.map((s, i) =>
        `<div class="${i <= stage ? "on" : ""}"><b>${i + 1}</b><span>${s}</span></div>`).join("")}</div>

      ${cl ? `<div class="req"><span class="lb">Clause ${esc(cl.id)} · Section ${esc(cl.sectionNo)} — ${esc(cl.sectionTitle)}</span>
        ${esc(cl.requirement)}</div>
        <div class="req" style="border-left-color:var(--hazard)"><span class="lb">Evidence the auditor will ask for</span>
        ${esc(cl.evidence)}</div>` : ""}

      <div class="eyebrow" style="margin:4px 0 9px">1 · The finding</div>
      <div class="grid3">
        <div class="field"><label class="f">Linked clause</label>
          <input type="text" class="ce2" data-f="clauseId" value="${esc(c.clauseId)}" placeholder="NX-048"></div>
        <div class="field"><label class="f">Grade</label>
          <select class="ce2" data-f="grade">${GRADES.slice().reverse().map(g=>`<option ${c.grade===g?"selected":""}>${g}</option>`).join("")}</select></div>
        <div class="field"><label class="f">Raised from</label>
          <select class="ce2" data-f="source">${CAP_SOURCE.map(s=>`<option ${c.source===s?"selected":""}>${s}</option>`).join("")}</select></div>
      </div>
      <div class="field"><label class="f">What was actually found</label>
        <textarea class="ce2" data-f="finding" placeholder="State the observation, where it was seen and how many instances. Not the requirement — the gap.">${esc(c.finding)}</textarea></div>
      <div class="grid2">
        <div class="field"><label class="f">Raised on</label><input type="date" class="ce2" data-f="raisedOn" value="${esc(c.raisedOn)}"></div>
        <div class="field"><label class="f">Instances found</label><input type="number" min="0" class="ce2" data-f="instances" value="${c.instances||0}"></div>
      </div>

      <div class="eyebrow" style="margin:18px 0 9px">2 · Why it happened</div>
      <div class="field"><label class="f">Root cause</label>
        <textarea class="ce2" data-f="rootCause" placeholder="Ask why until the answer is a system, not a person. 'Operator forgot' is not a root cause; 'no shift-handover check exists' is.">${esc(c.rootCause)}</textarea></div>
      <div class="field"><label class="f">Root cause category</label>
        <select class="ce2" data-f="rootCauseCategory"><option value="">Not categorised</option>${CAP_CAUSE.map(x=>`<option ${c.rootCauseCategory===x?"selected":""}>${x}</option>`).join("")}</select></div>

      <div class="eyebrow" style="margin:18px 0 9px">3 · What is being done</div>
      <div class="field"><label class="f">Containment — what stops the harm today</label>
        <textarea class="ce2" data-f="containment" placeholder="The immediate step taken before the permanent fix lands.">${esc(c.containment)}</textarea></div>
      <div class="field"><label class="f">Corrective action — what fixes this instance</label>
        <textarea class="ce2" data-f="correctiveAction" placeholder="Specific, dated and assignable. 'Improve awareness' is not an action.">${esc(c.correctiveAction)}</textarea></div>
      <div class="field"><label class="f">Preventive action — what stops it recurring</label>
        <textarea class="ce2" data-f="preventiveAction" placeholder="A change to the system: a check added to a checklist, a step in the SOP, a control in the PM schedule.">${esc(c.preventiveAction)}</textarea></div>

      <div class="eyebrow" style="margin:18px 0 9px">4 · Who and when</div>
      <div class="grid3">
        <div class="field"><label class="f">O — Owner</label><input type="text" class="ce2" data-f="owner" value="${esc(c.owner)}"></div>
        <div class="field"><label class="f">R — Responsible</label><input type="text" class="ce2" data-f="responsible" value="${esc(c.responsible)}"></div>
        <div class="field"><label class="f">A — Approve</label><input type="text" class="ce2" data-f="approve" value="${esc(c.approve)}"></div>
      </div>
      <div class="grid3">
        <div class="field"><label class="f">Target date</label><input type="date" class="ce2" data-f="targetDate" value="${esc(c.targetDate)}"></div>
        <div class="field"><label class="f">Revised target</label><input type="date" class="ce2" data-f="revisedTargetDate" value="${esc(c.revisedTargetDate)}"></div>
        <div class="field"><label class="f">Completed on</label><input type="date" class="ce2" data-f="completedDate" value="${esc(c.completedDate)}"></div>
      </div>
      <div class="grid3">
        <div class="field"><label class="f">Status</label>
          <select class="ce2" data-f="status">${CAP_STATUS.map(s=>`<option ${c.status===s?"selected":""}>${s}</option>`).join("")}</select></div>
        <div class="field"><label class="f">Progress %</label><input type="number" min="0" max="100" class="ce2" data-f="progress" value="${c.progress||0}"></div>
        <div class="field"><label class="f">Cost (BDT)</label><input type="number" min="0" class="ce2" data-f="cost" value="${c.cost||0}"></div>
      </div>

      <div class="eyebrow" style="margin:18px 0 9px">5 · Verification</div>
      <div class="grid3">
        <div class="field"><label class="f">V — Verified by</label><input type="text" class="ce2" data-f="verifiedBy" value="${esc(c.verifiedBy)}"></div>
        <div class="field"><label class="f">Method</label>
          <select class="ce2" data-f="verificationMethod"><option value="">Not set</option>${CAP_VERIFY.map(x=>`<option ${c.verificationMethod===x?"selected":""}>${x}</option>`).join("")}</select></div>
        <div class="field"><label class="f">Verified on</label><input type="date" class="ce2" data-f="verifiedOn" value="${esc(c.verifiedOn)}"></div>
      </div>
      <div class="field"><label class="f">Evidence filed</label>
        <textarea class="ce2" data-f="evidenceFiled" placeholder="Name the documents, photographs and records, with dates. This is what gets produced on audit day.">${esc(c.evidenceFiled)}</textarea></div>

      <div class="eyebrow" style="margin:18px 0 9px">6 · Did it hold</div>
      <div class="grid2">
        <div class="field"><label class="f">Effectiveness review</label>
          <select class="ce2" data-f="effectiveness">${CAP_EFFECT.map(x=>`<option ${c.effectiveness===x?"selected":""}>${x}</option>`).join("")}</select></div>
        <div class="field"><label class="f">Review date</label><input type="date" class="ce2" data-f="effectivenessDate" value="${esc(c.effectivenessDate)}"></div>
      </div>
      <div class="field"><label class="f">Review note</label>
        <textarea class="ce2" data-f="effectivenessNote" placeholder="Re-checked on which date, by whom, and what was seen. If it did not hold, raise a fresh CAP rather than reopening this one.">${esc(c.effectivenessNote)}</textarea></div>

      <div class="field"><label class="f">Add an update</label>
        <textarea id="capupd" placeholder="Progress, obstacle, decision needed."></textarea></div>
      ${c.updateNote ? `<div class="eyebrow" style="margin:14px 0 7px">Update log</div><div class="log">${renderLog(c.updateNote)}</div>` : ""}
    </div>
    <div class="mf">
      ${isNew ? "" : `<button class="btn dgr" id="capdel">Delete CAP</button>`}
      <div class="spacer" style="flex:1"></div>
      <button class="btn" id="mcancel">Cancel</button>
      ${isNew ? "" : `<button class="btn hz" id="capclose">Verify and close</button>`}
      <button class="btn pri" id="capsave">${isNew ? "Raise CAP" : "Save"}</button>
    </div>`;
  showModal();

  const grab = () => {
    document.querySelectorAll(".ce2").forEach(i => {
      let v = i.value;
      if(i.dataset.f === "progress") v = Math.max(0, Math.min(100, +v || 0));
      if(i.dataset.f === "cost" || i.dataset.f === "instances") v = +v || 0;
      c[i.dataset.f] = v;
    });
    const u = document.getElementById("capupd").value.trim();
    if(u) c.updateNote = (c.updateNote ? c.updateNote + "\n" : "") + todayISO() + "|" + u;
    c.lastUpdated = todayISO();
    const cl2 = capClause(c);
    if(cl2 && !c.grade) c.grade = cl2.grade;
  };

  document.getElementById("capsave").onclick = () => {
    grab();
    if(!String(c.finding).trim()){ toast("Write what was found first"); return; }
    if(isNew) caps().push(c);
    hideModal(); render(); toast(isNew ? `${c.id} raised` : `${c.id} saved`);
  };
  document.getElementById("mcancel").onclick = hideModal;
  document.getElementById("mx").onclick = hideModal;
  if(!isNew){
    document.getElementById("capclose").onclick = () => {
      grab();
      const gaps = [];
      if(!String(c.rootCause).trim()) gaps.push("root cause");
      if(!String(c.correctiveAction).trim()) gaps.push("corrective action");
      if(!String(c.preventiveAction).trim()) gaps.push("preventive action");
      if(!String(c.evidenceFiled).trim()) gaps.push("evidence filed");
      if(!String(c.verifiedBy).trim()) gaps.push("verifier");
      if(gaps.length && !confirm(
        `This CAP has no ${gaps.join(", no ")}.\n\n` +
        `NEXT re-tests closed findings at the follow-up audit, and a closure with no ` +
        `evidence or verifier is the one most often reopened.\n\nClose it anyway?`)) return;
      c.status = "Closed"; c.progress = 100;
      if(!c.completedDate) c.completedDate = todayISO();
      if(!c.verifiedOn) c.verifiedOn = todayISO();
      c.updateNote = (c.updateNote ? c.updateNote + "\n" : "") + todayISO() + "|Verified and closed.";
      hideModal(); render(); toast(`${c.id} closed`);
    };
    document.getElementById("capdel").onclick = () => {
      if(confirm(`Delete ${c.id}? The finding history goes with it.`)){
        S.caps = caps().filter(x => x.id !== c.id);
        hideModal(); render(); toast("CAP deleted");
      }
    };
  }
}

function capBlank(from){
  const cl = from || null;
  return {
    id: nextCapId(),
    clauseId: cl ? cl.id : "",
    grade: cl ? cl.grade : "MAJOR",
    source: "Internal gap assessment",
    finding: cl ? `${cl.clause} — control not evidenced` : "",
    instances: 0,
    raisedOn: todayISO(),
    rootCause: "", rootCauseCategory: "",
    containment: "", correctiveAction: "", preventiveAction: "",
    owner: cl ? cl.owner : "", responsible: cl ? cl.responsible : "",
    approve: cl ? cl.approve : "",
    targetDate: cl ? (cl.revisedDueDate || cl.dueDate || "") : "",
    revisedTargetDate: "", completedDate: "",
    status: "Draft", progress: 0, cost: 0,
    verifiedBy: cl ? cl.verify : "", verificationMethod: "", verifiedOn: "",
    evidenceFiled: "",
    effectiveness: "Not assessed", effectivenessDate: "", effectivenessNote: "",
    lastUpdated: todayISO(), updateNote: "",
  };
}

function capGenerate(all){
  const src = S.items.filter(x => !isClosed(x)
    && (all || x.grade === "CAT 5" || x.grade === "CAT 6")
    && !caps().some(c => c.clauseId === x.id));
  if(!src.length){ toast("Every matching clause already has a CAP"); return; }
  src.forEach(x => {
    const c = capBlank(x);
    c.status = "Open";
    c.updateNote = todayISO() + `|Raised from ${x.grade} clause ${x.id}.`;
    caps().push(c);
  });
  render();
  toast(`${src.length} CAPs raised`);
}

function capExport(){
  const cols = ["id","clauseId","grade","source","raisedOn","finding","instances",
    "rootCause","rootCauseCategory","containment","correctiveAction","preventiveAction",
    "owner","responsible","approve","targetDate","revisedTargetDate","completedDate",
    "status","progress","cost","verifiedBy","verificationMethod","verifiedOn",
    "evidenceFiled","effectiveness","effectivenessDate","effectivenessNote","lastUpdated"];
  const q = v => '"' + String(v ?? "").replace(/"/g, '""').replace(/\n/g, " ⏎ ") + '"';
  const csv = [cols.join(",")].concat(caps().map(c => cols.map(k => q(c[k])).join(","))).join("\n");
  const b = new Blob([csv], {type:"text/csv"});
  const u = URL.createObjectURL(b), a = document.createElement("a");
  a.href = u; a.download = `next-cop-cap-${todayISO()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1500);
  toast("CAP exported");
}

/* -------------------------------------------------------------- grid feed */
window.GRID_DATASETS.caps = {
  label: "CAP",
  rows: () => caps(),
  idKey: "id",
  open: id => openCap(id),
  cols: () => [
    {k:"id",            t:"calc",   w:80,  label:"CAP", frozen:true},
    {k:"clauseId",      t:"text",   w:80,  label:"Clause"},
    {k:"grade",         t:"select", w:78,  label:"Grade", opts:GRADES, badge:"grade"},
    {k:"finding",       t:"text",   w:250, label:"Finding", frozen:true},
    {k:"rootCauseCategory", t:"select", w:150, label:"Cause category",
     opts:["", ...CAP_CAUSE]},
    {k:"rootCause",     t:"long",   w:250, label:"Root cause"},
    {k:"correctiveAction", t:"long", w:250, label:"Corrective action"},
    {k:"preventiveAction", t:"long", w:250, label:"Preventive action"},
    {k:"responsible",   t:"text",   w:140, label:"Responsible"},
    {k:"status",        t:"select", w:132, label:"Status", opts:CAP_STATUS, badge:"status"},
    {k:"progress",      t:"num",    w:74,  label:"Progress %", min:0, max:100},
    {k:"targetDate",    t:"date",   w:102, label:"Target"},
    {k:"revisedTargetDate", t:"date", w:104, label:"Revised target"},
    {k:"completedDate", t:"date",   w:102, label:"Completed"},
    {k:"verifiedBy",    t:"text",   w:130, label:"Verified by"},
    {k:"verificationMethod", t:"select", w:150, label:"Verification method", opts:["", ...CAP_VERIFY]},
    {k:"effectiveness", t:"select", w:120, label:"Effectiveness", opts:CAP_EFFECT},
    {k:"cost",          t:"num",    w:96,  label:"Cost (BDT)", min:0},
  ],
  presets: {
    Planning: ["id","clauseId","grade","finding","responsible","status","progress",
               "targetDate","revisedTargetDate","completedDate"],
    Analysis: ["id","clauseId","grade","finding","rootCauseCategory","rootCause",
               "correctiveAction","preventiveAction"],
    Closure:  ["id","clauseId","grade","status","completedDate","verifiedBy",
               "verificationMethod","effectiveness","cost"],
    All:      null,
  },
};

/* ------------------------------------------------------------------ wire -- */
function capWire(){
  const bind = (id, fn) => { const e = document.getElementById(id); if(e) fn(e); };
  bind("capGenZT", e => e.onclick = () => capGenerate(false));
  bind("capGenAll", e => e.onclick = () => capGenerate(true));
  bind("capNew", e => e.onclick = () => openCap(null));
  bind("capExport", e => e.onclick = capExport);
  if(view !== "cap") return;
  document.querySelectorAll(".capopen").forEach(b => b.onclick = () => openCap(b.dataset.id));
  bind("capq", e => e.oninput = () => {
    capFilters.q = e.value; const p = e.selectionStart; render();
    const n = document.getElementById("capq"); if(n){ n.focus(); n.setSelectionRange(p, p); }
  });
  bind("capstatus", e => e.onchange = () => { capFilters.status = e.value; render(); });
  bind("capgrade", e => e.onchange = () => { capFilters.grade = e.value; render(); });
  bind("capowner", e => e.onchange = () => { capFilters.owner = e.value; render(); });
  bind("caplate", e => e.onchange = () => { capFilters.late = e.checked; render(); });
  bind("capclear", e => e.onclick = () => { capFilters = {status:"",grade:"",owner:"",q:"",late:false}; render(); });
}

window.BOARD_EXT.views.push(["cap", "CAP",
  "Corrective action plans — finding, root cause, action, verification", "grid"]);
window.BOARD_EXT.render.cap = vCap;
window.BOARD_EXT.wire.push(capWire);
