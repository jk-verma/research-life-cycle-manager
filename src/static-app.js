import { filterBar } from './components/ui.js';
import { loadStore } from './data/load.js';
import { candidateDetailPage, candidatePhasePage, candidatesListPage } from './pages/candidates.js';
import { dashboardPage } from './pages/dashboard.js';
import { dataPage } from './pages/data.js';
import { meetingDetailPage, meetingsListPage } from './pages/meetings.js';
import { searchPage } from './pages/search.js';
import { settingsPage } from './pages/settings.js';
import { moduleLabels, workbenchDetailPage, workbenchHomePage, workbenchModulePage } from './pages/workbench.js';
import { nowIso } from './utils/date.js';
import { diffSummary, downloadJson } from './utils/export.js';
import { escapeHtml, uid } from './utils/html.js';
import { flattenWorkbench } from './utils/search.js';
import { canArchive, canWrite, maskNotes, visibleByRole } from './utils/visibility.js';

const root = document.getElementById('root');

let store = null;
let role = 'ADMIN';
let filters = {};
let draft = null;
let diff = [];
let error = '';

function parseRoute() {
  return (location.hash.replace('#/', '') || 'dashboard').split('/').filter(Boolean);
}

function routeKey(parts = parseRoute()) {
  return parts.join('/');
}

function visibleCandidates() {
  return visibleByRole(store, role, store.candidates.records, ['topic', 'supervisor']);
}

function visibleMeetings() {
  return visibleByRole(store, role, store.meetings.records, ['agenda', 'discussion', 'decisions', 'venue_or_link', 'responsible_person']);
}

function visibleWorkbench() {
  return visibleByRole(store, role, flattenWorkbench(store.workbench), ['description_or_abstract', 'budget', 'honorarium', 'deliverables']);
}

function renderFilters(options = {}) {
  return filterBar(filters, {
    programmes: [...new Set(store.candidates.records.map((item) => item.programme_type))],
    candidates: store.candidates.records,
    phases: [...new Set(store.meetings.records.map((item) => item.phase))],
    modules: Object.keys(moduleLabels),
    visibilities: store.permissions.visibility_levels,
    ...options
  });
}

function appendNoteForm(kind, id, module = '') {
  return `<section class="append-panel">
    <h4>Append-only note</h4>
    <form class="record-form" data-append-note="${escapeHtml(kind)}" data-id="${escapeHtml(id)}" data-module="${escapeHtml(module)}">
      <input name="text" required placeholder="Add note without deleting history" />
      <select name="visibility">${store.permissions.visibility_levels.map((item) => `<option>${escapeHtml(item)}</option>`).join('')}</select>
      <button>Append note</button>
    </form>
  </section>`;
}

function ctx() {
  return {
    store,
    role,
    filters,
    draft,
    diff,
    visibleCandidates,
    visibleMeetings,
    visibleWorkbench,
    maskNotes: (notes) => maskNotes(store, role, notes),
    canWrite: () => canWrite(store, role),
    canArchive: () => canArchive(store, role),
    archiveRecord,
    renderFilters,
    appendNoteForm
  };
}

function shell(content) {
  const current = routeKey();
  const nav = [
    ['dashboard', 'Dashboard'],
    ['candidates', 'Candidates'],
    ['meetings', 'Meetings'],
    ['workbench', 'Workbench'],
    ['search', 'Search'],
    ['data', 'Data / Import-Export'],
    ['settings', 'Settings']
  ].map(([id, label]) => `<a class="${current.startsWith(id) || (current === '' && id === 'dashboard') ? 'active' : ''}" href="#/${id}">${label}</a>`).join('');

  const roles = Object.keys(store.permissions.roles).map((item) => `<option ${item === role ? 'selected' : ''}>${item}</option>`).join('');
  root.innerHTML = `<div class="app-shell">
    <aside class="sidebar">
      <div><p class="brand">research-lifecycle-manager</p><nav>${nav}</nav></div>
      <p class="sidebar-note">Static GitHub Pages portal. Roles are logical views, not login sessions.</p>
    </aside>
    <main class="content">
      <header class="topbar">
        <div><p class="eyebrow">Faculty controlled static portal</p><h1>Academic operations portal</h1></div>
        <label class="role-picker">Logical role<select id="role-picker">${roles}</select></label>
      </header>
      ${error ? `<p class="notice">${escapeHtml(error)}</p>` : ''}
      ${content}
    </main>
  </div>`;
}

function render() {
  if (!store) return;
  const parts = parseRoute();
  const c = ctx();
  let content = '';
  if (!parts.length || parts[0] === 'dashboard') content = dashboardPage(c);
  else if (parts[0] === 'candidates' && parts[1] && parts[2] === 'phase') content = candidatePhasePage(c, parts[1], parts[3]);
  else if (parts[0] === 'candidates' && parts[1]) content = candidateDetailPage(c, parts[1]);
  else if (parts[0] === 'candidates') content = candidatesListPage(c);
  else if (parts[0] === 'meetings' && parts[1]) content = meetingDetailPage(c, parts[1]);
  else if (parts[0] === 'meetings') content = meetingsListPage(c);
  else if (parts[0] === 'workbench' && parts[1] && parts[2]) content = workbenchDetailPage(c, parts[1], parts[2]);
  else if (parts[0] === 'workbench' && parts[1]) content = workbenchModulePage(c, parts[1]);
  else if (parts[0] === 'workbench') content = workbenchHomePage(c);
  else if (parts[0] === 'search') content = searchPage(c);
  else if (parts[0] === 'data') content = dataPage(c);
  else if (parts[0] === 'settings') content = settingsPage(c);
  else content = dashboardPage(c);
  shell(content);
  bindEvents();
}

function bindEvents() {
  const rolePicker = document.getElementById('role-picker');
  if (rolePicker) {
    rolePicker.addEventListener('change', (event) => {
      role = event.target.value;
      render();
    });
  }

  ['q', 'programme', 'candidate', 'phase', 'module', 'status', 'visibility', 'from', 'to'].forEach((key) => {
    const el = document.getElementById(`filter-${key}`);
    if (el) {
      el.addEventListener('input', (event) => {
        filters[key] = event.target.value;
        render();
      });
      el.addEventListener('change', (event) => {
        filters[key] = event.target.value;
        render();
      });
    }
  });

  document.querySelectorAll('[data-append-note]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      appendNote(form.dataset.appendNote, form.dataset.id, new FormData(form), form.dataset.module);
    });
  });

  const exportJson = document.getElementById('export-json');
  if (exportJson) exportJson.addEventListener('click', () => downloadJson('research-lifecycle-manager-data-export.json', store));

  const exportDraft = document.getElementById('export-draft');
  if (exportDraft && draft) exportDraft.addEventListener('click', () => downloadJson(`${draft.id || 'draft'}.json`, draft));

  const importJson = document.getElementById('import-json');
  if (importJson) importJson.addEventListener('change', importBundle);

  const draftForm = document.getElementById('draft-form');
  if (draftForm) {
    draftForm.addEventListener('submit', (event) => {
      event.preventDefault();
      previewDraft(new FormData(draftForm));
    });
  }

  document.querySelectorAll('[data-archive-kind]').forEach((button) => {
    button.addEventListener('click', () => archiveRecord(button.dataset.archiveKind, button.dataset.archiveId, button.dataset.archiveModule || ''));
  });
}

function appendNote(kind, id, formData, module) {
  if (!canWrite(store, role)) return;
  const note = {
    id: uid('note'),
    text: formData.get('text'),
    visibility: formData.get('visibility'),
    created_by: `local-${role.toLowerCase()}`,
    created_at: nowIso()
  };
  if (kind === 'meeting') {
    const meeting = store.meetings.records.find((item) => item.id === id);
    meeting.comments_append_only.push(note);
    meeting.revision_history.push({ version: meeting.revision_history.length + 1, summary: 'Append-only comment added locally', updated_by: note.created_by, updated_at: nowIso() });
  }
  if (kind === 'workbench') {
    const item = store.workbench.modules[module].find((record) => record.id === id);
    item.notes_append_only.push(note);
    item.revision_history.push({ version: item.revision_history.length + 1, summary: 'Append-only note added locally', updated_by: note.created_by, updated_at: nowIso() });
  }
  error = 'Local append-only note prepared. Export JSON to commit it.';
  render();
}

function archiveRecord(kind, id, module = '') {
  if (!canArchive(store, role)) return;
  let record = null;
  if (kind === 'candidate') record = store.candidates.records.find((item) => item.id === id);
  if (kind === 'meeting') record = store.meetings.records.find((item) => item.id === id);
  if (kind === 'workbench') record = store.workbench.modules[module]?.find((item) => item.id === id);
  if (!record) return;
  record.status = 'archived';
  record.updated_by = `local-${role.toLowerCase()}`;
  record.timestamps = record.timestamps || {};
  record.timestamps.updated_at = nowIso();
  record.revision_history = record.revision_history || [];
  record.revision_history.push({
    version: record.revision_history.length + 1,
    summary: 'Archived locally instead of deleted',
    updated_by: record.updated_by,
    updated_at: nowIso()
  });
  error = 'Record archived locally. Export JSON to commit it.';
  render();
}

function previewDraft(formData) {
  if (!canWrite(store, role)) return;
  const kind = formData.get('kind');
  draft = {
    id: uid(kind),
    title: formData.get('title'),
    name: formData.get('title'),
    description_or_abstract: formData.get('description'),
    topic: formData.get('description'),
    status: formData.get('status') || 'active',
    visibility: formData.get('visibility'),
    created_by: `local-${role.toLowerCase()}`,
    updated_by: `local-${role.toLowerCase()}`,
    timestamps: { created_at: nowIso(), updated_at: nowIso() },
    notes_append_only: [],
    attachments: [],
    revision_history: [{ version: 1, summary: `Draft ${kind} record prepared locally`, updated_by: `local-${role.toLowerCase()}`, updated_at: nowIso() }]
  };
  diff = diffSummary(null, draft);
  error = 'Draft preview created. Export this record or copy it into the correct JSON file.';
  location.hash = '#/data';
  render();
}

function importBundle(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.candidates || !parsed.meetings || !parsed.workbench) throw new Error('Bundle must include candidates, meetings, and workbench.');
      store = { ...store, ...parsed };
      error = 'JSON bundle imported into local browser state.';
      render();
    } catch (err) {
      error = err.message;
      render();
    }
  };
  reader.readAsText(file);
}

window.addEventListener('hashchange', render);

loadStore()
  .then((loaded) => {
    store = loaded;
    role = loaded.users.active_role || 'ADMIN';
    render();
  })
  .catch((err) => {
    root.innerHTML = `<main class="boot"><h1>research-lifecycle-manager</h1><p>${escapeHtml(err.message)}</p></main>`;
  });
