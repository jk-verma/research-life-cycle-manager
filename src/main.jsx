import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  BookOpen,
  CalendarDays,
  Download,
  FileJson,
  LayoutDashboard,
  Printer,
  Search,
  Shield,
  Upload,
  Users
} from 'lucide-react';
import './styles.css';

const MASK = 'Confidential content hidden';
const DATA_PATHS = {
  users: 'config/users.json',
  permissions: 'config/permissions.json',
  candidates: 'data/candidates/candidates.json',
  meetings: 'data/meetings/meetings.json',
  workbench: 'data/workbench/workbench.json'
};

function asset(path) {
  return `${import.meta.env.BASE_URL}${path}`;
}

async function loadJson(path) {
  const response = await fetch(asset(path));
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function flattenWorkbench(workbench) {
  return Object.entries(workbench.modules || {}).flatMap(([module, records]) =>
    records.map((record) => ({ ...record, module }))
  );
}

function canSee(permissions, role, visibility) {
  return permissions.roles?.[role]?.visible_levels?.includes(visibility);
}

function canEdit(permissions, role) {
  return Boolean(permissions.roles?.[role]?.can_edit_local);
}

function canArchive(permissions, role) {
  return Boolean(permissions.roles?.[role]?.can_archive);
}

function maskText(value, permissions, role, visibility) {
  if (canSee(permissions, role, visibility)) return value;
  return permissions.masked_text || MASK;
}

function maskRecord(record, permissions, role, fields) {
  if (canSee(permissions, role, record.visibility)) return { ...record, masked: false };
  const masked = { ...record, masked: true };
  fields.forEach((field) => {
    if (field in masked) masked[field] = permissions.masked_text || MASK;
  });
  return masked;
}

function visibleNotes(notes = [], permissions, role) {
  return notes.map((note) => ({
    ...note,
    masked: !canSee(permissions, role, note.visibility),
    text: maskText(note.text, permissions, role, note.visibility)
  }));
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [store, setStore] = useState(null);
  const [route, setRoute] = useState(window.location.hash.replace('#/', '') || 'dashboard');
  const [role, setRole] = useState('ADMIN');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ status: '', type: '', phase: '', visibility: '' });
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedWorkbenchId, setSelectedWorkbenchId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all(Object.entries(DATA_PATHS).map(async ([key, path]) => [key, await loadJson(path)]))
      .then((entries) => {
        const loaded = Object.fromEntries(entries);
        setStore(loaded);
        setRole(loaded.users.active_role || 'ADMIN');
        setSelectedCandidateId(loaded.candidates.records[0]?.id || '');
        setSelectedWorkbenchId(flattenWorkbench(loaded.workbench)[0]?.id || '');
      })
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace('#/', '') || 'dashboard');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function navigate(nextRoute) {
    window.location.hash = `#/${nextRoute}`;
  }

  function updateStore(updater) {
    setStore((current) => {
      const next = structuredClone(current);
      updater(next);
      return next;
    });
  }

  function appendMeetingNote(meetingId, text, visibility) {
    updateStore((draft) => {
      const meeting = draft.meetings.records.find((item) => item.id === meetingId);
      meeting.comments_append_only.push({
        id: uid('comment'),
        text,
        visibility,
        created_by: `local-${role.toLowerCase()}`,
        created_at: nowIso()
      });
      meeting.updated_by = `local-${role.toLowerCase()}`;
      meeting.timestamps.updated_at = nowIso();
      meeting.revision_history.push({
        version: meeting.revision_history.length + 1,
        summary: 'Append-only comment prepared in local editor mode',
        updated_by: `local-${role.toLowerCase()}`,
        updated_at: nowIso()
      });
    });
    setMessage('Append-only note added locally. Export JSON to commit it.');
  }

  function archiveRecord(kind, id) {
    if (!canArchive(store.permissions, role)) return;
    updateStore((draft) => {
      const collection = kind === 'candidate' ? draft.candidates.records : draft.meetings.records;
      const record = collection.find((item) => item.id === id);
      record.status = 'archived';
      record.updated_by = `local-${role.toLowerCase()}`;
      record.timestamps.updated_at = nowIso();
      record.revision_history.push({
        version: record.revision_history.length + 1,
        summary: 'Archived locally by admin role',
        updated_by: `local-${role.toLowerCase()}`,
        updated_at: nowIso()
      });
    });
    setMessage('Record archived locally. Export JSON to commit it.');
  }

  function addLocalRecord(kind, values) {
    if (!canEdit(store.permissions, role)) return;
    updateStore((draft) => {
      if (kind === 'candidate') {
        draft.candidates.records.unshift({
          id: uid('cand'),
          name: values.title,
          programme_type: values.type || 'Masters',
          topic: values.description,
          phase_progress: [],
          supervisor: 'Faculty Supervisor',
          start_date: values.date || new Date().toISOString().slice(0, 10),
          visibility: values.visibility,
          status: values.status || 'active',
          created_by: `local-${role.toLowerCase()}`,
          updated_by: `local-${role.toLowerCase()}`,
          timestamps: { created_at: nowIso(), updated_at: nowIso() },
          notes_append_only: values.note ? [{
            id: uid('note'),
            text: values.note,
            visibility: values.visibility,
            created_by: `local-${role.toLowerCase()}`,
            created_at: nowIso()
          }] : [],
          attachments: [],
          revision_history: [{
            version: 1,
            summary: 'Candidate created in local editor mode',
            updated_by: `local-${role.toLowerCase()}`,
            updated_at: nowIso()
          }]
        });
      }
      if (kind === 'meeting') {
        draft.meetings.records.unshift({
          id: uid('meet'),
          candidate_id: values.candidate_id || draft.candidates.records[0]?.id || 'candidate_id_required',
          programme_type: values.type || 'Masters',
          phase: values.phase || 'Synopsis',
          sub_phase: '',
          title: values.title,
          date: values.date || new Date().toISOString().slice(0, 10),
          start_time: '10:00',
          end_time: '10:30',
          mode: 'offline',
          venue_or_link: '',
          attendees: ['Faculty Supervisor'],
          attendance_status: 'pending',
          agenda: values.description,
          discussion: values.note || '',
          decisions: '',
          action_items: [],
          responsible_person: '',
          due_dates: [],
          satisfaction_status: 'pending',
          next_meeting_date: '',
          visibility: values.visibility,
          status: values.status || 'draft',
          created_by: `local-${role.toLowerCase()}`,
          updated_by: `local-${role.toLowerCase()}`,
          timestamps: { created_at: nowIso(), updated_at: nowIso() },
          comments_append_only: [],
          attachments: [],
          revision_history: [{
            version: 1,
            summary: 'Meeting created in local editor mode',
            updated_by: `local-${role.toLowerCase()}`,
            updated_at: nowIso()
          }]
        });
      }
      if (kind === 'workbench') {
        const module = values.module || 'custom_activities';
        draft.workbench.modules[module].unshift({
          id: uid(module),
          title: values.title,
          activity_type: values.type || 'custom',
          collaborators: [],
          organization_or_publisher: '',
          description_or_abstract: values.description,
          status: values.status || 'idea',
          visibility: values.visibility,
          created_by: `local-${role.toLowerCase()}`,
          updated_by: `local-${role.toLowerCase()}`,
          timestamps: { created_at: nowIso(), updated_at: nowIso() },
          notes_append_only: values.note ? [{
            id: uid('note'),
            text: values.note,
            visibility: values.visibility,
            created_by: `local-${role.toLowerCase()}`,
            created_at: nowIso()
          }] : [],
          attachments: [],
          revision_history: [{
            version: 1,
            summary: 'Workbench record created in local editor mode',
            updated_by: `local-${role.toLowerCase()}`,
            updated_at: nowIso()
          }]
        });
      }
    });
    setMessage('New record added locally. Export JSON to commit it.');
  }

  function importBundle(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.candidates || !parsed.meetings || !parsed.workbench) {
          throw new Error('Import bundle must include candidates, meetings, and workbench data.');
        }
        setStore((current) => ({ ...current, ...parsed }));
        setMessage('Imported JSON bundle into local browser state.');
      } catch (error) {
        setMessage(error.message);
      }
    };
    reader.readAsText(file);
  }

  if (!store) {
    return <main className="boot">{message || 'Loading research-lifecycle-manager...'}</main>;
  }

  const common = {
    store,
    role,
    setRole,
    query,
    setQuery,
    filters,
    setFilters,
    selectedCandidateId,
    setSelectedCandidateId,
    selectedWorkbenchId,
    setSelectedWorkbenchId,
    appendMeetingNote,
    archiveRecord,
    addLocalRecord,
    importBundle,
    message,
    navigate
  };

  const pages = {
    dashboard: <Dashboard {...common} />,
    candidates: <Candidates {...common} />,
    meetings: <Meetings {...common} />,
    workbench: <Workbench {...common} />,
    search: <SearchPage {...common} />,
    data: <DataManager {...common} />
  };

  return (
    <div className="app-shell">
      <Sidebar route={route} navigate={navigate} />
      <main className="content">
        <Topbar role={role} setRole={setRole} store={store} />
        {message ? <p className="notice">{message}</p> : null}
        {pages[route] || pages.dashboard}
      </main>
    </div>
  );
}

function Sidebar({ route, navigate }) {
  const items = [
    ['dashboard', LayoutDashboard, 'Dashboard'],
    ['candidates', Users, 'Candidates'],
    ['meetings', CalendarDays, 'Meetings'],
    ['workbench', BookOpen, 'Workbench'],
    ['search', Search, 'Search'],
    ['data', FileJson, 'Data']
  ];
  return (
    <aside className="sidebar">
      <div>
        <p className="brand">research-lifecycle-manager</p>
        <nav>
          {items.map(([id, Icon, label]) => (
            <button key={id} className={route === id ? 'active' : ''} onClick={() => navigate(id)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
      </div>
      <p className="sidebar-note">Static GitHub Pages portal. Roles are logical views, not login sessions.</p>
    </aside>
  );
}

function Topbar({ role, setRole, store }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Faculty controlled static portal</p>
        <h1>Academic research lifecycle system</h1>
      </div>
      <label className="role-picker">
        Logical role
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          {Object.keys(store.permissions.roles).map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
    </header>
  );
}

function PageTitle({ title, subtitle }) {
  return (
    <section className="page-title">
      <p className="eyebrow">research-lifecycle-manager</p>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </section>
  );
}

function Badge({ children, tone = 'default' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Dashboard({ store, role }) {
  const candidates = visibleCandidates(store, role);
  const meetings = visibleMeetings(store, role);
  const workbench = visibleWorkbench(store, role);
  const upcoming = meetings.filter((meeting) => meeting.next_meeting_date && meeting.status !== 'archived');
  const overdue = workbench.filter((item) =>
    JSON.stringify(item).includes('2026-04') && !['completed', 'published', 'accepted'].includes(item.status)
  );

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Supervision and academic work in one static, Git-friendly workspace." />
      <div className="metrics">
        <Metric label="Candidates" value={candidates.length} />
        <Metric label="Meetings" value={meetings.length} />
        <Metric label="Workbench items" value={workbench.length} />
        <Metric label="Upcoming reviews" value={upcoming.length} />
      </div>
      <div className="grid two">
        <Panel title="Active supervision">
          {candidates.filter((item) => item.status !== 'archived').map((candidate) => (
            <RecordLine key={candidate.id} title={candidate.name} meta={`${candidate.programme_type} | ${candidate.topic}`} visibility={candidate.visibility} />
          ))}
        </Panel>
        <Panel title="Workbench pressure points">
          {overdue.slice(0, 6).map((item) => (
            <RecordLine key={item.id} title={item.title} meta={`${item.module} | ${item.status}`} visibility={item.visibility} />
          ))}
        </Panel>
      </div>
    </>
  );
}

function Metric({ label, value }) {
  return <article className="metric"><strong>{value}</strong><span>{label}</span></article>;
}

function Panel({ title, children }) {
  return <section className="panel"><h3>{title}</h3>{children}</section>;
}

function RecordLine({ title, meta, visibility }) {
  return (
    <article className="record-line">
      <div><strong>{title}</strong><span>{meta}</span></div>
      <Badge>{visibility}</Badge>
    </article>
  );
}

function visibleCandidates(store, role) {
  return store.candidates.records
    .filter((candidate) => canSee(store.permissions, role, candidate.visibility) || role !== 'RESTRICTED_EXTERNAL')
    .map((candidate) => maskRecord(candidate, store.permissions, role, ['topic', 'supervisor']));
}

function visibleMeetings(store, role) {
  return store.meetings.records
    .filter((meeting) => canSee(store.permissions, role, meeting.visibility) || role !== 'RESTRICTED_EXTERNAL')
    .map((meeting) => maskRecord(meeting, store.permissions, role, ['agenda', 'discussion', 'decisions', 'responsible_person', 'venue_or_link']));
}

function visibleWorkbench(store, role) {
  return flattenWorkbench(store.workbench)
    .filter((item) => canSee(store.permissions, role, item.visibility) || role !== 'RESTRICTED_EXTERNAL')
    .map((item) => maskRecord(item, store.permissions, role, ['description_or_abstract', 'budget', 'honorarium', 'deliverables']));
}

function Candidates(props) {
  const { store, role, selectedCandidateId, setSelectedCandidateId, archiveRecord } = props;
  const candidates = visibleCandidates(store, role);
  const selected = candidates.find((item) => item.id === selectedCandidateId) || candidates[0];
  const candidateMeetings = visibleMeetings(store, role).filter((meeting) => meeting.candidate_id === selected?.id);

  return (
    <>
      <PageTitle title="Candidate Workspaces" subtitle="Masters, PhD, and intern lifecycle records with visibility-aware notes." />
      <div className="split">
        <div className="list">
          {candidates.map((candidate) => (
            <button key={candidate.id} className="list-row" onClick={() => setSelectedCandidateId(candidate.id)}>
              <strong>{candidate.name}</strong>
              <span>{candidate.programme_type} | {candidate.status}</span>
              <Badge>{candidate.visibility}</Badge>
            </button>
          ))}
        </div>
        {selected ? (
          <section className="detail printable">
            <div className="detail-head">
              <div>
                <h3>{selected.name}</h3>
                <p>{selected.topic}</p>
              </div>
              <PrintButton />
            </div>
            <div className="phase-grid">
              {selected.phase_progress.map((phase) => (
                <article key={phase.phase}><strong>{phase.phase}</strong><span>{phase.status}</span></article>
              ))}
            </div>
            <h4>Timeline</h4>
            <Timeline items={candidateMeetings} store={store} role={role} />
            <h4>Append-only notes</h4>
            <Notes notes={visibleNotes(selected.notes_append_only, store.permissions, role)} />
            {canArchive(store.permissions, role) && selected.status !== 'archived' ? (
              <button className="secondary" onClick={() => archiveRecord('candidate', selected.id)}><Archive size={16} /> Archive candidate</button>
            ) : null}
          </section>
        ) : <p>No candidates visible for this role.</p>}
      </div>
    </>
  );
}

function Timeline({ items, store, role }) {
  return (
    <div className="timeline">
      {items.map((meeting) => (
        <article key={meeting.id}>
          <span>{meeting.date} | {meeting.phase}</span>
          <strong>{meeting.title}</strong>
          <p>{meeting.discussion}</p>
          <Notes notes={visibleNotes(meeting.comments_append_only, store.permissions, role)} />
        </article>
      ))}
    </div>
  );
}

function Notes({ notes }) {
  return (
    <div className="notes">
      {notes.map((note) => (
        <p key={note.id} className={note.masked ? 'masked' : ''}>{note.text}</p>
      ))}
      {!notes.length ? <p className="muted">No notes yet.</p> : null}
    </div>
  );
}

function Meetings(props) {
  const { store, role, filters, setFilters, appendMeetingNote, archiveRecord } = props;
  const meetings = applyFilters(visibleMeetings(store, role), filters, ['status', 'phase', 'visibility']);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('internal');

  return (
    <>
      <PageTitle title="Meeting Records" subtitle="Append-only comments, action tracking, attendance, revision history, and print-friendly minutes." />
      <Filters filters={filters} setFilters={setFilters} />
      <div className="grid">
        {meetings.map((meeting) => (
          <article key={meeting.id} className="card printable">
            <div className="card-head">
              <Badge>{meeting.visibility}</Badge>
              <PrintButton />
            </div>
            <h3>{meeting.title}</h3>
            <p>{meeting.date} | {meeting.start_time}-{meeting.end_time} | {meeting.mode}</p>
            <p><strong>Agenda:</strong> {meeting.agenda}</p>
            <p><strong>Discussion:</strong> {meeting.discussion}</p>
            <p><strong>Decisions:</strong> {meeting.decisions}</p>
            <h4>Actions</h4>
            {meeting.action_items.map((item) => <p key={item.id}>{item.text} - {item.responsible_person} - {item.due_date}</p>)}
            <Notes notes={visibleNotes(meeting.comments_append_only, store.permissions, role)} />
            {canEdit(store.permissions, role) ? (
              <div className="editor-row">
                <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Append note without deleting history" />
                <select value={noteVisibility} onChange={(event) => setNoteVisibility(event.target.value)}>
                  {store.permissions.visibility_levels.map((item) => <option key={item}>{item}</option>)}
                </select>
                <button onClick={() => { appendMeetingNote(meeting.id, noteDraft, noteVisibility); setNoteDraft(''); }}>Append</button>
              </div>
            ) : null}
            {canArchive(store.permissions, role) && meeting.status !== 'archived' ? (
              <button className="secondary" onClick={() => archiveRecord('meeting', meeting.id)}><Archive size={16} /> Archive</button>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}

function Workbench(props) {
  const { store, role, selectedWorkbenchId, setSelectedWorkbenchId, filters, setFilters } = props;
  const items = applyFilters(visibleWorkbench(store, role), filters, ['status', 'module', 'visibility', 'type']);
  const selected = items.find((item) => item.id === selectedWorkbenchId) || items[0];

  return (
    <>
      <PageTitle title="Faculty Academic Workbench" subtitle="Publications, books, projects, consultancy, MOOCs, and custom academic activities." />
      <Filters filters={filters} setFilters={setFilters} includeType />
      <div className="split">
        <div className="list">
          {items.map((item) => (
            <button key={item.id} className="list-row" onClick={() => setSelectedWorkbenchId(item.id)}>
              <strong>{item.title}</strong>
              <span>{item.module} | {item.status}</span>
              <Badge>{item.visibility}</Badge>
            </button>
          ))}
        </div>
        {selected ? (
          <section className="detail printable">
            <div className="detail-head">
              <div>
                <h3>{selected.title}</h3>
                <p>{selected.description_or_abstract}</p>
              </div>
              <PrintButton />
            </div>
            <div className="metadata">
              <Badge>{selected.module}</Badge><Badge>{selected.status}</Badge><Badge>{selected.visibility}</Badge>
            </div>
            <pre>{JSON.stringify(selected, null, 2)}</pre>
          </section>
        ) : <p>No workbench items visible for this role.</p>}
      </div>
    </>
  );
}

function SearchPage({ store, role, query, setQuery, filters, setFilters }) {
  const all = [
    ...visibleCandidates(store, role).map((item) => ({ ...item, kind: 'candidate', searchTitle: item.name })),
    ...visibleMeetings(store, role).map((item) => ({ ...item, kind: 'meeting', searchTitle: item.title })),
    ...visibleWorkbench(store, role).map((item) => ({ ...item, kind: item.module, searchTitle: item.title }))
  ];
  const results = applyFilters(all, filters, ['status', 'phase', 'visibility', 'kind', 'type']).filter((item) =>
    JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <PageTitle title="Search and Filters" subtitle="Client-side search across candidates, meetings, projects, and publications." />
      <div className="searchbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" />
      </div>
      <Filters filters={filters} setFilters={setFilters} includeType />
      <div className="grid">
        {results.map((item) => (
          <article key={`${item.kind}-${item.id}`} className="card">
            <Badge>{item.kind}</Badge>
            <h3>{item.searchTitle}</h3>
            <p>{item.topic || item.phase || item.description_or_abstract || item.status}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function DataManager({ store, role, importBundle, addLocalRecord }) {
  const bundle = {
    candidates: store.candidates,
    meetings: store.meetings,
    workbench: store.workbench,
    users: store.users,
    permissions: store.permissions
  };
  return (
    <>
      <PageTitle title="JSON Import and Export" subtitle="Prepare Git-friendly JSON changes locally, then commit them to the repository." />
      <div className="grid two">
        <Panel title="Export">
          <p>Download the current browser state as JSON. Writers and admins can use this to prepare repository updates.</p>
          <button onClick={() => downloadJson('research-lifecycle-manager-data-export.json', bundle)}><Download size={16} /> Export JSON bundle</button>
        </Panel>
        <Panel title="Import">
          <p>Load a JSON bundle into local browser state. This does not write to GitHub Pages by itself.</p>
          <label className="upload">
            <Upload size={16} /> Import JSON
            <input type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && importBundle(event.target.files[0])} />
          </label>
        </Panel>
      </div>
      {canEdit(store.permissions, role) ? <LocalRecordCreator store={store} addLocalRecord={addLocalRecord} /> : null}
      <Panel title="Static mode rules">
        <p><Shield size={16} /> Current role: <strong>{role}</strong>. This is a logical UI mode, not authentication.</p>
        <p>For real password login, sessions, and database persistence, connect these role and visibility fields to a future backend.</p>
      </Panel>
    </>
  );
}

function LocalRecordCreator({ store, addLocalRecord }) {
  const [kind, setKind] = useState('candidate');
  const [values, setValues] = useState({
    title: '',
    description: '',
    type: '',
    phase: '',
    candidate_id: '',
    module: 'custom_activities',
    status: 'active',
    visibility: 'internal',
    date: '',
    note: ''
  });

  function set(key, value) {
    setValues({ ...values, [key]: value });
  }

  function submit(event) {
    event.preventDefault();
    addLocalRecord(kind, values);
    setValues({ ...values, title: '', description: '', note: '' });
  }

  return (
    <Panel title="Structured local editor">
      <form className="record-form" onSubmit={submit}>
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="candidate">Candidate</option>
          <option value="meeting">Meeting</option>
          <option value="workbench">Workbench item</option>
        </select>
        <input required value={values.title} onChange={(event) => set('title', event.target.value)} placeholder="Title or name" />
        <input value={values.description} onChange={(event) => set('description', event.target.value)} placeholder="Description, topic, or agenda" />
        <input value={values.type} onChange={(event) => set('type', event.target.value)} placeholder="Programme or type" />
        {kind === 'meeting' ? (
          <>
            <select value={values.candidate_id} onChange={(event) => set('candidate_id', event.target.value)}>
              <option value="">Select candidate</option>
              {store.candidates.records.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
            </select>
            <input value={values.phase} onChange={(event) => set('phase', event.target.value)} placeholder="Phase" />
          </>
        ) : null}
        {kind === 'workbench' ? (
          <select value={values.module} onChange={(event) => set('module', event.target.value)}>
            {Object.keys(store.workbench.modules).map((module) => <option key={module}>{module}</option>)}
          </select>
        ) : null}
        <input value={values.status} onChange={(event) => set('status', event.target.value)} placeholder="Status" />
        <select value={values.visibility} onChange={(event) => set('visibility', event.target.value)}>
          {store.permissions.visibility_levels.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={values.date} onChange={(event) => set('date', event.target.value)} placeholder="Date YYYY-MM-DD" />
        <input value={values.note} onChange={(event) => set('note', event.target.value)} placeholder="Initial append-only note" />
        <button>Create local record</button>
      </form>
    </Panel>
  );
}

function Filters({ filters, setFilters, includeType = false }) {
  function set(key, value) {
    setFilters({ ...filters, [key]: value });
  }
  return (
    <div className="filters">
      <input value={filters.status} onChange={(event) => set('status', event.target.value)} placeholder="status" />
      <input value={filters.phase} onChange={(event) => set('phase', event.target.value)} placeholder="phase" />
      {includeType ? <input value={filters.type} onChange={(event) => set('type', event.target.value)} placeholder="type/module" /> : null}
      <select value={filters.visibility} onChange={(event) => set('visibility', event.target.value)}>
        <option value="">Any visibility</option>
        <option>admin_only</option>
        <option>supervisor_only</option>
        <option>internal</option>
        <option>candidate_visible</option>
        <option>sanitized_external</option>
      </select>
    </div>
  );
}

function applyFilters(records, filters, keys) {
  return records.filter((record) => keys.every((key) => {
    const value = filters[key] || '';
    if (!value) return true;
    return String(record[key] || record.module || '').toLowerCase().includes(value.toLowerCase());
  }));
}

function PrintButton() {
  return <button className="icon-button" onClick={() => window.print()}><Printer size={16} /> Print</button>;
}

createRoot(document.getElementById('root')).render(<App />);
