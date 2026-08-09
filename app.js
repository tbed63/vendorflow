
const STORAGE_KEY = "vendorflow_mvp_v1";

const state = loadState();
let currentPreview = [];
let currentMappings = {};
let currentRawHeaders = [];

const headerAliases = {
  registrationId: ["id", "registration id", "registrant id", "order id"],
  status: ["status", "registration status", "enrollment status"],
  dateSignedUp: ["date signed up", "signup date", "registered", "registration date"],
  updated: ["updated", "updated date", "last updated"],
  classTitle: ["title", "class title", "class", "program"],
  studentFirst: ["registrant first name", "student first name", "child first name", "first name student"],
  studentLast: ["registrant last name", "student last name", "child last name", "last name student"],
  studentEmail: ["registrant email", "student email"],
  parentFirst: ["primary first name", "parent first name", "guardian first name"],
  parentLast: ["primary last name", "parent last name", "guardian last name"],
  parentEmail: ["email address", "parent email", "guardian email", "primary email"],
  parentPhone: ["phone", "parent phone", "guardian phone", "primary phone"],
  birthdate: ["birthdate", "date of birth", "dob"],
  age: ["age"],
  gradeLevel: ["grade level", "grade", "student grade"],
  gender: ["gender"],
  address: ["address", "street address"],
  city: ["city"],
  state: ["state"],
  zip: ["zip", "zipcode", "postal code"],
  medical: ["medical notes/allergies", "medical notes", "allergies"],
  allergyResponse: ["please list your child's allergies. if none please enter n/a.", "allergy form response"],
  familyOccupation: ["family occupation"],
};

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed || { classes: [], review: [] };
  } catch {
    return { classes: [], review: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  refreshAll();
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function findHeader(headers, aliases) {
  const normalized = headers.map(h => normalizeHeader(h));
  for (const alias of aliases) {
    const exactIndex = normalized.indexOf(normalizeHeader(alias));
    if (exactIndex >= 0) return headers[exactIndex];
  }
  return null;
}

function mapHeaders(headers) {
  const mappings = {};
  for (const [key, aliases] of Object.entries(headerAliases)) {
    const hit = findHeader(headers, aliases);
    if (hit) mappings[key] = hit;
  }
  return mappings;
}

function value(row, key) {
  const header = currentMappings[key];
  return header ? String(row[header] ?? "").trim() : "";
}

function fullName(first, last) {
  return [first, last].filter(Boolean).join(" ").trim();
}

function transformRow(row, index) {
  const studentFirst = value(row, "studentFirst");
  const studentLast = value(row, "studentLast");
  const parentFirst = value(row, "parentFirst");
  const parentLast = value(row, "parentLast");

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}-${Math.random()}`,
    registrationId: value(row, "registrationId"),
    status: value(row, "status") || "Active",
    dateSignedUp: value(row, "dateSignedUp"),
    updated: value(row, "updated"),
    classTitleFromCsv: value(row, "classTitle"),
    studentFirst,
    studentLast,
    studentName: fullName(studentFirst, studentLast),
    studentEmail: value(row, "studentEmail"),
    parentFirst,
    parentLast,
    parentName: fullName(parentFirst, parentLast),
    parentEmail: value(row, "parentEmail"),
    parentPhone: value(row, "parentPhone"),
    birthdate: value(row, "birthdate"),
    age: value(row, "age"),
    gradeLevel: value(row, "gradeLevel"),
    gender: value(row, "gender"),
    address: value(row, "address"),
    city: value(row, "city"),
    state: value(row, "state"),
    zip: value(row, "zip"),
    medical: value(row, "medical"),
    allergyResponse: value(row, "allergyResponse"),
    familyOccupation: value(row, "familyOccupation"),
  };
}

function currentClassId() {
  return document.querySelector("#classSelect").value;
}

function getCurrentClass() {
  return state.classes.find(c => c.id === currentClassId());
}

function classActiveRoster(cls) {
  if (!cls) return [];
  return (cls.roster || []).filter(s => {
    const status = normalizeHeader(s.status);
    return !["cancelled", "canceled", "dropped", "withdrawn", "inactive"].includes(status);
  });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function refreshAll() {
  refreshClassSelect();
  refreshDashboard();
  refreshRoster();
  refreshReview();
}

function refreshClassSelect() {
  const select = document.querySelector("#classSelect");
  const selected = select.value;
  select.innerHTML = `<option value="">Choose a class</option>` + state.classes.map(c =>
    `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}${c.term ? " — " + escapeHtml(c.term) : ""}</option>`
  ).join("");

  if (state.classes.some(c => c.id === selected)) select.value = selected;
}

function refreshDashboard() {
  document.querySelector("#statClasses").textContent = state.classes.length;
  const total = state.classes.reduce((sum, c) => sum + classActiveRoster(c).length, 0);
  document.querySelector("#statStudents").textContent = total;
  document.querySelector("#statReview").textContent = state.review.length;
  document.querySelector("#reviewBadge").textContent = state.review.length;
}

function refreshRoster() {
  const cls = getCurrentClass();
  const empty = document.querySelector("#emptyRoster");
  const wrap = document.querySelector("#rosterWrap");
  const body = document.querySelector("#rosterBody");
  const del = document.querySelector("#deleteClassBtn");

  if (!cls) {
    empty.textContent = "Choose a class to view its saved roster.";
    empty.classList.remove("hidden");
    wrap.classList.add("hidden");
    del.classList.add("hidden");
    return;
  }

  del.classList.remove("hidden");

  if (!cls.roster || !cls.roster.length) {
    empty.textContent = "No roster saved for this class yet.";
    empty.classList.remove("hidden");
    wrap.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  wrap.classList.remove("hidden");
  body.innerHTML = cls.roster.map(s => `
    <tr>
      <td>${escapeHtml(s.studentName || "—")}</td>
      <td>${escapeHtml(s.parentName || "—")}</td>
      <td>${escapeHtml(s.parentEmail || "—")}</td>
      <td>${escapeHtml(s.parentPhone || "—")}</td>
      <td>${escapeHtml(s.status || "—")}</td>
      <td>${escapeHtml(s.gradeLevel || "—")}</td>
      <td>${escapeHtml(s.registrationId || "—")}</td>
    </tr>
  `).join("");
}

function refreshReview() {
  const list = document.querySelector("#reviewList");
  if (!state.review.length) {
    list.innerHTML = `<div class="review-empty">Nothing needs review right now.</div>`;
    return;
  }
  list.innerHTML = state.review.map(item => `
    <div class="review-item">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.detail)}</span>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function switchView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelector(`#${view}View`).classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    classes: "Classes & Rosters",
    payments: "Payments",
    certificates: "Certificates",
    review: "Needs Review",
  };
  document.querySelector("#viewTitle").textContent = titles[view] || "VendorFlow";

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

function addReview(title, detail) {
  state.review.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    title,
    detail,
    createdAt: new Date().toISOString(),
  });
}

function analyzeImport(rows) {
  const issues = [];
  const required = ["studentFirst", "studentLast"];
  const missing = required.filter(k => !currentMappings[k]);

  if (missing.length) {
    issues.push("VendorFlow could not confidently find the student's first and last name columns.");
  }

  const blankStudents = rows.filter(r => !r.studentName).length;
  if (blankStudents) {
    issues.push(`${blankStudents} row${blankStudents === 1 ? "" : "s"} did not contain a recognizable student name.`);
  }

  const uniqueClassTitles = [...new Set(rows.map(r => r.classTitleFromCsv).filter(Boolean))];
  const cls = getCurrentClass();
  if (uniqueClassTitles.length > 1) {
    issues.push(`This CSV appears to contain ${uniqueClassTitles.length} class titles. You selected "${cls?.name || "this class"}".`);
  }

  return issues;
}

function renderPreview(rows, issues) {
  const body = document.querySelector("#previewBody");
  body.innerHTML = rows.slice(0, 100).map(s => `
    <tr>
      <td>${escapeHtml(s.studentName || "⚠ Missing")}</td>
      <td>${escapeHtml(s.parentName || "—")}</td>
      <td>${escapeHtml(s.parentEmail || "—")}</td>
      <td>${escapeHtml(s.parentPhone || "—")}</td>
      <td>${escapeHtml(s.status || "—")}</td>
      <td>${escapeHtml(s.gradeLevel || "—")}</td>
    </tr>
  `).join("");

  const mappedCount = Object.keys(currentMappings).length;
  document.querySelector("#mappingSummary").textContent =
    `${rows.length} row${rows.length === 1 ? "" : "s"} found. VendorFlow recognized ${mappedCount} useful field${mappedCount === 1 ? "" : "s"} automatically.`;

  const warning = document.querySelector("#warningBox");
  if (issues.length) {
    warning.innerHTML = `<strong>Please review:</strong><br>${issues.map(escapeHtml).join("<br>")}`;
    warning.classList.remove("hidden");
  } else {
    warning.classList.add("hidden");
  }

  document.querySelector("#previewPanel").classList.remove("hidden");
}

function handleCsv(file) {
  const cls = getCurrentClass();
  if (!cls) {
    showToast("Choose a class before uploading a roster.");
    return;
  }

  document.querySelector("#fileStatus").classList.remove("hidden");
  document.querySelector("#fileStatus").textContent = `Reading ${file.name}…`;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: h => String(h || "").trim(),
    complete: results => {
      const rows = results.data || [];
      currentRawHeaders = results.meta.fields || [];
      currentMappings = mapHeaders(currentRawHeaders);
      currentPreview = rows.map(transformRow).filter(r =>
        r.studentName || r.parentName || r.parentEmail || r.registrationId
      );

      const issues = analyzeImport(currentPreview);
      renderPreview(currentPreview, issues);

      document.querySelector("#fileStatus").textContent =
        `${file.name}: ${currentPreview.length} usable roster row${currentPreview.length === 1 ? "" : "s"} found.`;
    },
    error: err => {
      document.querySelector("#fileStatus").textContent = `Could not read CSV: ${err.message}`;
      showToast("CSV import failed.");
    }
  });
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

document.querySelectorAll("[data-go]").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.go));
});

document.querySelector("#saveClassBtn").addEventListener("click", () => {
  const name = document.querySelector("#className").value.trim();
  const term = document.querySelector("#classTerm").value.trim();
  const tuition = document.querySelector("#classTuition").value.trim();

  if (!name) {
    showToast("Enter a class name first.");
    return;
  }

  const cls = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name,
    term,
    tuition: tuition ? Number(tuition) : null,
    roster: [],
    createdAt: new Date().toISOString()
  };
  state.classes.push(cls);
  saveState();

  document.querySelector("#className").value = "";
  document.querySelector("#classTerm").value = "";
  document.querySelector("#classTuition").value = "";
  document.querySelector("#classSelect").value = cls.id;
  refreshRoster();
  showToast("Class saved.");
});

document.querySelector("#classSelect").addEventListener("change", () => {
  currentPreview = [];
  document.querySelector("#previewPanel").classList.add("hidden");
  document.querySelector("#csvInput").value = "";
  document.querySelector("#fileStatus").classList.add("hidden");
  refreshRoster();
});

document.querySelector("#csvInput").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (file) handleCsv(file);
});

const dropZone = document.querySelector("#dropZone");
["dragenter", "dragover"].forEach(event => {
  dropZone.addEventListener(event, e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach(event => {
  dropZone.addEventListener(event, e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
});
dropZone.addEventListener("drop", e => {
  const file = e.dataTransfer.files?.[0];
  if (file) handleCsv(file);
});

document.querySelector("#saveRosterBtn").addEventListener("click", () => {
  const cls = getCurrentClass();
  if (!cls) {
    showToast("Choose a class first.");
    return;
  }
  if (!currentPreview.length) {
    showToast("Upload a roster CSV first.");
    return;
  }

  const issues = analyzeImport(currentPreview);
  const missingNames = currentPreview.filter(s => !s.studentName).length;
  if (missingNames) {
    addReview(
      `${missingNames} roster row${missingNames === 1 ? "" : "s"} need review`,
      `Class: ${cls.name}. The CSV included row(s) without a recognizable student name.`
    );
  }

  cls.roster = currentPreview;
  cls.lastImportAt = new Date().toISOString();
  cls.rawHeaders = currentRawHeaders;
  saveState();
  refreshRoster();
  showToast("Roster saved.");
});

document.querySelector("#deleteClassBtn").addEventListener("click", () => {
  const cls = getCurrentClass();
  if (!cls) return;
  if (!confirm(`Delete "${cls.name}" and its saved roster from this browser?`)) return;
  const index = state.classes.findIndex(c => c.id === cls.id);
  state.classes.splice(index, 1);
  document.querySelector("#classSelect").value = "";
  saveState();
  showToast("Class deleted.");
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  if (!confirm("Reset the VendorFlow prototype data stored in this browser?")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vendorflow-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

refreshAll();
