/* NEXT COP Readiness Board — grid engine
 *
 * An Excel-grade editable grid so the board replaces the workbook rather than
 * duplicating it: click a cell, type, Tab across, Ctrl+D to fill down,
 * Ctrl+C / Ctrl+V against a real spreadsheet.
 *
 * Datasets register themselves in window.GRID_DATASETS so other modules
 * (cap.js) can add their own without touching this file.
 *
 * Credit partner    : Industry Compliance & Sustainability Platform
 * Technology partner: guulba — technology for better performance
 */
'use strict';

window.BOARD_EXT = window.BOARD_EXT || { views: [], render: {}, wire: [] };
window.GRID_DATASETS = window.GRID_DATASETS || {};

/* ------------------------------------------------------------ column types */
// type: text | long | select | date | num | calc
const GRID_STATE = {
  ds: "clauses",
  preset: "Planning",
  q: "",
  sort: null,          // {col, dir}
  sel: null,           // {r1,c1,r2,c2} indices into the visible grid
  editing: null,       // {r,c}
  dirty: 0,
};

/* --------------------------------------------------------------- datasets -- */
function gridClauseCols(){
  return [
    {k:"id",            t:"calc",   w:74,  label:"Ref",         frozen:true},
    {k:"sectionNo",     t:"calc",   w:48,  label:"§"},
    {k:"clause",        t:"text",   w:210, label:"Clause",      frozen:true},
    {k:"grade",         t:"select", w:78,  label:"If failed",   opts:GRADES, badge:"grade"},
    {k:"weight",        t:"calc",   w:56,  label:"Weight",      num:true},
    {k:"workstream",    t:"select", w:100, label:"Workstream",
     opts:["Policy","Records","Practice","Facility","Engineering","Training","Licence"]},
    {k:"phase",         t:"select", w:62,  label:"Phase",       opts:["P0","P1","P2","P3","P4","P5","P6","P7"]},
    {k:"owner",         t:"text",   w:140, label:"O — Owner"},
    {k:"responsible",   t:"text",   w:140, label:"R — Responsible"},
    {k:"support",       t:"text",   w:140, label:"S — Support"},
    {k:"verify",        t:"text",   w:130, label:"V — Verify"},
    {k:"approve",       t:"text",   w:130, label:"A — Approve"},
    {k:"inform",        t:"text",   w:140, label:"I — Inform"},
    {k:"status",        t:"select", w:132, label:"Status",      opts:STATUSES, badge:"status"},
    {k:"progress",      t:"num",    w:74,  label:"Progress %",  min:0, max:100},
    {k:"startDate",     t:"date",   w:102, label:"Start"},
    {k:"dueDate",       t:"date",   w:102, label:"Due"},
    {k:"revisedDueDate",t:"date",   w:102, label:"Revised due"},
    {k:"_currentDue",   t:"calc",   w:102, label:"Current due",
     calc:x=>x.revisedDueDate||x.dueDate||""},
    {k:"completedDate", t:"date",   w:102, label:"Completed"},
    {k:"_timing",       t:"calc",   w:112, label:"Timing", badge:"timing",
     calc:x=>timing(x).label},
    {k:"evidenceSighted",t:"select",w:92,  label:"Evidence sighted", opts:["No","Yes"], badge:"yesno"},
    {k:"verifiedBy",    t:"text",   w:130, label:"Verified by"},
    {k:"approvedBy",    t:"text",   w:130, label:"Approved by"},
    {k:"notes",         t:"text",   w:220, label:"Notes"},
    {k:"requirement",   t:"long",   w:300, label:"Requirement"},
    {k:"evidence",      t:"long",   w:270, label:"Evidence required"},
  ];
}

window.GRID_DATASETS.clauses = {
  label: "Clauses",
  rows: () => S.items,
  cols: gridClauseCols,
  idKey: "id",
  open: id => openClause(id),
  presets: {
    Planning: ["id","sectionNo","clause","grade","status","progress","startDate","dueDate",
               "revisedDueDate","_currentDue","_timing","responsible"],
    Evidence: ["id","clause","grade","evidence","evidenceSighted","verify","verifiedBy",
               "completedDate","status","notes"],
    ORSVAI:   ["id","sectionNo","clause","owner","responsible","support","verify","approve","inform"],
    Detail:   ["id","clause","requirement","evidence","grade","workstream","phase","status"],
    All:      null,
  },
};

window.GRID_DATASETS.tasks = {
  label: "Tasks",
  rows: () => S.tasks,
  idKey: "id",
  open: id => openTask(id),
  cols: () => [
    {k:"id",            t:"calc",   w:80,  label:"Ref", frozen:true},
    {k:"title",         t:"text",   w:240, label:"Task", frozen:true},
    {k:"type",          t:"select", w:110, label:"Type", opts:TASK_TYPES},
    {k:"linkedClause",  t:"text",   w:96,  label:"Clause"},
    {k:"responsible",   t:"text",   w:140, label:"Responsible"},
    {k:"verify",        t:"text",   w:130, label:"Verify"},
    {k:"status",        t:"select", w:132, label:"Status", opts:STATUSES, badge:"status"},
    {k:"progress",      t:"num",    w:74,  label:"Progress %", min:0, max:100},
    {k:"startDate",     t:"date",   w:102, label:"Start"},
    {k:"dueDate",       t:"date",   w:102, label:"Due"},
    {k:"revisedDueDate",t:"date",   w:102, label:"Revised due"},
    {k:"completedDate", t:"date",   w:102, label:"Completed"},
    {k:"_timing",       t:"calc",   w:112, label:"Timing", badge:"timing", calc:x=>timing(x).label},
    {k:"cost",          t:"num",    w:96,  label:"Cost (BDT)", min:0},
    {k:"replacementOf", t:"text",   w:100, label:"Replaces"},
    {k:"replacedBy",    t:"text",   w:100, label:"Replaced by"},
    {k:"detail",        t:"long",   w:300, label:"Detail"},
  ],
  presets: {
    Planning: ["id","title","type","status","progress","startDate","dueDate","revisedDueDate","_timing","responsible"],
    Detail:   ["id","title","detail","linkedClause","type","status","cost"],
    All:      null,
  },
};

/* ------------------------------------------------------------------ view -- */
function vGrid(){
  const ds = window.GRID_DATASETS[GRID_STATE.ds];
  const rows = gridRows();
  const cols = gridCols();
  const total = ds.rows().length;
  const names = Object.keys(window.GRID_DATASETS);
  const presets = Object.keys(ds.presets);

  if(!total){
    return `${gridToolbar(names, presets, 0, 0)}
      <div class="card"><div class="empty"><h4>Nothing in ${esc(ds.label)} yet</h4>
      <p>Add rows from the ${esc(ds.label)} view, or switch dataset above.</p></div></div>`;
  }

  const body = rows.map((x, ri) => {
    const cells = cols.map((c, ci) => gridCell(x, c, ri, ci)).join("");
    return `<tr data-ri="${ri}" data-id="${esc(x[ds.idKey])}">${cells}</tr>`;
  }).join("");

  let left = 0;
  const colgroup = cols.map(c => `<col style="width:${c.w}px">`).join("");
  const head = cols.map((c, ci) => {
    const s = GRID_STATE.sort;
    const arrow = s && s.col === c.k ? (s.dir > 0 ? " ▲" : " ▼") : "";
    const froz = c.frozen ? ` class="froz" style="left:${(left += ci ? cols[ci-1].w : 0, left - (ci?cols[ci-1].w:0))}px"` : "";
    return `<th data-ci="${ci}" data-k="${esc(c.k)}" class="gh${c.frozen?" froz":""}"
      style="${c.frozen?`left:${frozenOffset(cols,ci)}px;`:""}">${esc(c.label)}${arrow}</th>`;
  }).join("");

  return `${gridToolbar(names, presets, rows.length, total)}
  <div class="card gridcard">
    <div class="gridwrap" id="gw" tabindex="0">
      <table class="grid" id="gt"><colgroup>${colgroup}</colgroup>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <div class="gridfoot">
      <span id="gsel" class="mono">Ready</span>
      <span class="spacer"></span>
      <span class="mono" style="color:var(--mute)">
        Click a cell then type. Enter commits · Tab moves across · Ctrl+D fills down ·
        Ctrl+C / Ctrl+V works with Excel · Esc cancels
      </span>
    </div>
  </div>`;
}

function frozenOffset(cols, ci){
  let x = 0;
  for(let i = 0; i < ci; i++) if(cols[i].frozen) x += cols[i].w;
  return x;
}

function gridToolbar(names, presets, shown, total){
  const ds = window.GRID_DATASETS[GRID_STATE.ds];
  return `<div class="filters">
    <div class="seg" id="gds">${names.map(n=>
      `<button data-ds="${n}" class="${GRID_STATE.ds===n?"on":""}">${esc(window.GRID_DATASETS[n].label)}</button>`).join("")}</div>
    <div class="seg" id="gpre">${presets.map(p=>
      `<button data-p="${p}" class="${GRID_STATE.preset===p?"on":""}">${esc(p)}</button>`).join("")}</div>
    <input type="text" class="search" id="gq" placeholder="Filter rows…" value="${esc(GRID_STATE.q)}">
    <span class="chipcount">${shown} of ${total}</span>
    <div class="spacer"></div>
    <button class="btn sm" id="gcopy">Copy selection</button>
    <button class="btn sm" id="gfill">Fill down</button>
    <button class="btn sm" id="gclear">Clear sort &amp; filter</button>
    <button class="btn sm pri" id="gexport">Export this grid</button>
  </div>`;
}

function gridCols(){
  const ds = window.GRID_DATASETS[GRID_STATE.ds];
  const all = ds.cols();
  const keep = ds.presets[GRID_STATE.preset];
  if(!keep) return all;
  const byKey = Object.fromEntries(all.map(c => [c.k, c]));
  return keep.map(k => byKey[k]).filter(Boolean);
}

function gridRows(){
  const ds = window.GRID_DATASETS[GRID_STATE.ds];
  let rows = ds.rows().slice();
  const q = GRID_STATE.q.trim().toLowerCase();
  if(q) rows = rows.filter(x => Object.values(x).some(v =>
    typeof v !== "object" && String(v ?? "").toLowerCase().includes(q)));
  const s = GRID_STATE.sort;
  if(s){
    const col = ds.cols().find(c => c.k === s.col);
    rows.sort((a, b) => {
      const av = gridValue(a, col), bv = gridValue(b, col);
      if(col && col.num) return (Number(av||0) - Number(bv||0)) * s.dir;
      return String(av).localeCompare(String(bv), undefined, {numeric:true}) * s.dir;
    });
  }
  return rows;
}

function gridValue(x, c){
  if(!c) return "";
  return c.calc ? c.calc(x) : (x[c.k] ?? "");
}

function gridCell(x, c, ri, ci){
  const v = gridValue(x, c);
  const ro = c.t === "calc";
  let inner = esc(v);
  if(c.badge === "grade" && v) inner = gradeChip(v);
  else if(c.badge === "status" && v) inner = statusPill(v);
  else if(c.badge === "timing"){ const t = timing(x); inner = `<span class="pill ${t.cls}">${esc(t.label)}</span>`; }
  else if(c.badge === "yesno") inner = `<span class="pill ${v==="Yes"?"p-done":"p-not"}">${esc(v||"No")}</span>`;
  else if(c.t === "long") inner = `<span title="${esc(v)}">${esc(String(v).slice(0,140))}</span>`;
  const cls = ["gc", ro ? "ro" : "ed", c.frozen ? "froz" : "", c.num || c.t === "num" ? "n" : ""]
    .filter(Boolean).join(" ");
  const style = c.frozen ? ` style="left:${frozenOffset(gridCols(), ci)}px"` : "";
  return `<td class="${cls}" data-ri="${ri}" data-ci="${ci}"${style}>${inner}</td>`;
}

/* ------------------------------------------------------------- selection -- */
function gridNorm(){
  const s = GRID_STATE.sel; if(!s) return null;
  return {r1: Math.min(s.r1, s.r2), r2: Math.max(s.r1, s.r2),
          c1: Math.min(s.c1, s.c2), c2: Math.max(s.c1, s.c2)};
}
function gridPaint(){
  const n = gridNorm();
  document.querySelectorAll("#gt td.gc").forEach(td => {
    const r = +td.dataset.ri, c = +td.dataset.ci;
    const inRange = n && r >= n.r1 && r <= n.r2 && c >= n.c1 && c <= n.c2;
    td.classList.toggle("insel", !!inRange);
    td.classList.toggle("anchor", !!(GRID_STATE.sel && r === GRID_STATE.sel.r1 && c === GRID_STATE.sel.c1));
  });
  const lab = document.getElementById("gsel");
  if(lab){
    if(!n){ lab.textContent = "Ready"; }
    else {
      const cols = gridCols(), rows = gridRows();
      const cells = (n.r2 - n.r1 + 1) * (n.c2 - n.c1 + 1);
      const row = rows[n.r1];
      lab.textContent = cells === 1
        ? `${row ? row[window.GRID_DATASETS[GRID_STATE.ds].idKey] : ""} · ${cols[n.c1].label}`
        : `${cells} cells selected`;
    }
  }
}
function gridSelect(r, c, extend){
  const rows = gridRows(), cols = gridCols();
  r = Math.max(0, Math.min(rows.length - 1, r));
  c = Math.max(0, Math.min(cols.length - 1, c));
  if(extend && GRID_STATE.sel){ GRID_STATE.sel.r2 = r; GRID_STATE.sel.c2 = c; }
  else GRID_STATE.sel = {r1:r, c1:c, r2:r, c2:c};
  gridPaint();
  const td = document.querySelector(`#gt td[data-ri="${r}"][data-ci="${c}"]`);
  if(td) td.scrollIntoView({block:"nearest", inline:"nearest"});
}

/* ---------------------------------------------------------------- editing -- */
function gridBeginEdit(seedChar){
  const s = GRID_STATE.sel; if(!s) return;
  const cols = gridCols(), rows = gridRows();
  const c = cols[s.c1], x = rows[s.r1];
  if(!c || !x || c.t === "calc") return;
  const td = document.querySelector(`#gt td[data-ri="${s.r1}"][data-ci="${s.c1}"]`);
  if(!td) return;
  GRID_STATE.editing = {r:s.r1, c:s.c1};
  const cur = x[c.k] ?? "";
  let html;
  if(c.t === "select"){
    html = `<select class="gedit">${c.opts.map(o =>
      `<option ${String(cur)===o?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  } else if(c.t === "date"){
    html = `<input class="gedit" type="date" value="${esc(cur)}">`;
  } else if(c.t === "num"){
    // type=text, not type=number: number inputs reject setSelectionRange, so a
    // seed character typed to start the edit lands at an unpredictable caret.
    html = `<input class="gedit" type="text" inputmode="numeric" value="${esc(seedChar ?? cur)}">`;
  } else {
    html = `<input class="gedit" type="text" value="${esc(seedChar ?? cur)}">`;
  }
  td.innerHTML = html;
  const inp = td.querySelector(".gedit");
  inp.focus();
  if(inp.select && c.t === "text" && seedChar == null) inp.select();
  if(seedChar != null && inp.setSelectionRange){
    const L = inp.value.length; try{ inp.setSelectionRange(L, L); }catch(e){}
  }
  inp.onkeydown = e => {
    if(e.key === "Enter"){ e.preventDefault(); gridCommit(); gridSelect(s.r1 + 1, s.c1); }
    else if(e.key === "Escape"){ e.preventDefault(); gridCancel(); }
    else if(e.key === "Tab"){ e.preventDefault(); gridCommit(); gridSelect(s.r1, s.c1 + (e.shiftKey ? -1 : 1)); }
    e.stopPropagation();
  };
  inp.onblur = () => { if(GRID_STATE.editing) gridCommit(); };
  if(c.t === "select") inp.onchange = () => { gridCommit(); gridSelect(s.r1 + 1, s.c1); };
}
function gridSetValue(x, c, raw){
  let v = raw;
  if(c.t === "num"){
    v = Number(v); if(!isFinite(v)) v = 0;
    if(c.min != null) v = Math.max(c.min, v);
    if(c.max != null) v = Math.min(c.max, v);
  }
  if(c.t === "select" && v && !c.opts.includes(v)) return false;
  if(String(x[c.k] ?? "") === String(v)) return false;
  x[c.k] = v;
  x.lastUpdated = todayISO();
  if(c.k === "grade") x.weight = (S.meta.gradeWeight || {})[v] ?? x.weight;
  if(c.k === "status" && v === "Closed"){
    x.progress = 100;
    if(!x.completedDate) x.completedDate = todayISO();
  }
  return true;
}
function gridCommit(){
  const e = GRID_STATE.editing; if(!e) return;
  GRID_STATE.editing = null;
  const td = document.querySelector(`#gt td[data-ri="${e.r}"][data-ci="${e.c}"]`);
  const inp = td && td.querySelector(".gedit");
  const cols = gridCols(), rows = gridRows();
  const c = cols[e.c], x = rows[e.r];
  if(inp && c && x && gridSetValue(x, c, inp.value)) GRID_STATE.dirty++;
  render();
}
function gridCancel(){ GRID_STATE.editing = null; render(); }

function gridClearSelection(){
  const n = gridNorm(); if(!n) return;
  const cols = gridCols(), rows = gridRows();
  let count = 0;
  for(let r = n.r1; r <= n.r2; r++) for(let c = n.c1; c <= n.c2; c++){
    const col = cols[c]; if(!col || col.t === "calc") continue;
    if(gridSetValue(rows[r], col, col.t === "num" ? 0 : "")) count++;
  }
  if(count){ GRID_STATE.dirty += count; render(); toast(`Cleared ${count} cells`); }
}
function gridFillDown(){
  const n = gridNorm(); if(!n || n.r1 === n.r2) { toast("Select the source cell and the rows below it"); return; }
  const cols = gridCols(), rows = gridRows();
  let count = 0;
  for(let c = n.c1; c <= n.c2; c++){
    const col = cols[c]; if(!col || col.t === "calc") continue;
    const src = rows[n.r1][col.k];
    for(let r = n.r1 + 1; r <= n.r2; r++) if(gridSetValue(rows[r], col, src)) count++;
  }
  if(count){ GRID_STATE.dirty += count; render(); toast(`Filled ${count} cells down`); }
}
function gridSelectionTSV(){
  const n = gridNorm(); if(!n) return "";
  const cols = gridCols(), rows = gridRows();
  const out = [];
  for(let r = n.r1; r <= n.r2; r++){
    const line = [];
    for(let c = n.c1; c <= n.c2; c++) line.push(String(gridValue(rows[r], cols[c]) ?? ""));
    out.push(line.join("\t"));
  }
  return out.join("\n");
}
function gridCopy(){
  const tsv = gridSelectionTSV();
  if(!tsv){ toast("Select some cells first"); return; }
  const done = () => toast("Copied — paste straight into Excel");
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(tsv).then(done, () => gridCopyFallback(tsv, done));
  } else gridCopyFallback(tsv, done);
}
function gridCopyFallback(text, done){
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); done(); }catch(e){ toast("Copy blocked by the browser"); }
  document.body.removeChild(ta);
}
function gridPaste(text){
  const s = GRID_STATE.sel; if(!s || !text) return;
  const cols = gridCols(), rows = gridRows();
  const lines = text.replace(/\r/g, "").replace(/\n$/, "").split("\n");
  let count = 0, skipped = 0;
  lines.forEach((line, dr) => {
    line.split("\t").forEach((val, dc) => {
      const x = rows[s.r1 + dr], col = cols[s.c1 + dc];
      if(!x || !col) return;
      if(col.t === "calc"){ skipped++; return; }
      if(gridSetValue(x, col, val.trim())) count++;
      else if(col.t === "select" && val.trim() && !col.opts.includes(val.trim())) skipped++;
    });
  });
  render();
  toast(`Pasted ${count} cells${skipped ? ` · ${skipped} skipped` : ""}`);
}
function gridExport(){
  const cols = gridCols(), rows = gridRows();
  const q = v => '"' + String(v ?? "").replace(/"/g, '""').replace(/\n/g, " ") + '"';
  const csv = [cols.map(c => q(c.label)).join(",")]
    .concat(rows.map(x => cols.map(c => q(gridValue(x, c))).join(",")))
    .join("\n");
  const b = new Blob([csv], {type:"text/csv"});
  const u = URL.createObjectURL(b), a = document.createElement("a");
  a.href = u; a.download = `next-cop-${GRID_STATE.ds}-${GRID_STATE.preset.toLowerCase()}-${todayISO()}.csv`;
  a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500);
  toast("Grid exported");
}

/* ------------------------------------------------------------------ wire -- */
function gridWire(){
  if(view !== "grid") return;
  const bind = (id, fn) => { const e = document.getElementById(id); if(e) fn(e); };

  document.querySelectorAll("#gds button").forEach(b => b.onclick = () => {
    GRID_STATE.ds = b.dataset.ds; GRID_STATE.sel = null; GRID_STATE.sort = null;
    const p = window.GRID_DATASETS[GRID_STATE.ds].presets;
    if(!p[GRID_STATE.preset]) GRID_STATE.preset = Object.keys(p)[0];
    render();
  });
  document.querySelectorAll("#gpre button").forEach(b => b.onclick = () => {
    GRID_STATE.preset = b.dataset.p; GRID_STATE.sel = null; render();
  });
  bind("gq", e => e.oninput = () => {
    GRID_STATE.q = e.value; const p = e.selectionStart; GRID_STATE.sel = null; render();
    const n = document.getElementById("gq"); if(n){ n.focus(); n.setSelectionRange(p, p); }
  });
  bind("gclear", e => e.onclick = () => { GRID_STATE.sort = null; GRID_STATE.q = ""; render(); });
  bind("gcopy", e => e.onclick = gridCopy);
  bind("gfill", e => e.onclick = gridFillDown);
  bind("gexport", e => e.onclick = gridExport);

  document.querySelectorAll("#gt th.gh").forEach(th => th.onclick = () => {
    const k = th.dataset.k, s = GRID_STATE.sort;
    GRID_STATE.sort = (s && s.col === k && s.dir === 1) ? {col:k, dir:-1}
                    : (s && s.col === k && s.dir === -1) ? null : {col:k, dir:1};
    GRID_STATE.sel = null; render();
  });

  document.querySelectorAll("#gt td.gc").forEach(td => {
    td.onmousedown = e => {
      if(GRID_STATE.editing) gridCommit();
      gridSelect(+td.dataset.ri, +td.dataset.ci, e.shiftKey);
      const gw = document.getElementById("gw"); if(gw) gw.focus();
    };
    td.ondblclick = () => gridBeginEdit();
  });

  gridPaint();

  const gw = document.getElementById("gw");
  if(gw) gw.onkeydown = e => {
    if(GRID_STATE.editing) return;
    const s = GRID_STATE.sel;
    const mod = e.ctrlKey || e.metaKey;
    if(mod && e.key.toLowerCase() === "c"){ e.preventDefault(); gridCopy(); return; }
    if(mod && e.key.toLowerCase() === "d"){ e.preventDefault(); gridFillDown(); return; }
    if(!s) return;
    const step = (dr, dc, ext) => {
      e.preventDefault();
      const fromR = ext ? s.r2 : s.r1, fromC = ext ? s.c2 : s.c1;
      gridSelect(fromR + dr, fromC + dc, ext);
    };
    switch(e.key){
      case "ArrowDown":  return step(1, 0, e.shiftKey);
      case "ArrowUp":    return step(-1, 0, e.shiftKey);
      case "ArrowRight": return step(0, 1, e.shiftKey);
      case "ArrowLeft":  return step(0, -1, e.shiftKey);
      case "Tab":        e.preventDefault(); return gridSelect(s.r1, s.c1 + (e.shiftKey ? -1 : 1));
      case "Home":       e.preventDefault(); return gridSelect(s.r1, 0, e.shiftKey);
      case "End":        e.preventDefault(); return gridSelect(s.r1, 1e6, e.shiftKey);
      case "PageDown":   e.preventDefault(); return gridSelect(s.r1 + 20, s.c1, e.shiftKey);
      case "PageUp":     e.preventDefault(); return gridSelect(s.r1 - 20, s.c1, e.shiftKey);
      case "Enter":      e.preventDefault(); return gridBeginEdit();
      case "F2":         e.preventDefault(); return gridBeginEdit();
      case "Delete":
      case "Backspace":  e.preventDefault(); return gridClearSelection();
      case "Escape":     GRID_STATE.sel = null; return gridPaint();
    }
    if(e.key.length === 1 && !mod){ e.preventDefault(); gridBeginEdit(e.key); }
  };

  if(!window._gridPasteBound){
    window._gridPasteBound = true;
    document.addEventListener("paste", e => {
      if(view !== "grid" || GRID_STATE.editing || !GRID_STATE.sel) return;
      const t = (e.clipboardData || window.clipboardData).getData("text");
      if(t){ e.preventDefault(); gridPaste(t); }
    });
  }
}

window.BOARD_EXT.views.push(["grid", "Data Grid",
  "Spreadsheet editing in the browser — no workbook round-trip", "checklist"]);
window.BOARD_EXT.render.grid = vGrid;
window.BOARD_EXT.wire.push(gridWire);
