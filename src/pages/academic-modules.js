import { detailSection, emptyState, notesPanel, pageHeader, printActionBar, recordCard, statusBadge, subtaskTimeline, taskProgress, taskSummary, timelinePanel, visibilityBadge } from '../components/ui.js';
import { administrationGroups, careerGroups, mentorGroups, optionList, projectGroups, researchGroups, subscriptionGroups, supervisionGroups, teachingGroups } from '../data/structure.js';
import { isOverdue } from '../utils/date.js';
import { escapeHtml, slugLabel } from '../utils/html.js';

const researchModules = ['journal_articles', 'conference_papers', 'authored_books', 'edited_books', 'book_chapters'];
const projectModules = ['projects', 'consultancy'];

export function researchPage(ctx) {
  const items = ctx.visibleWorkbench().filter((item) => researchModules.includes(item.module));
  return `${pageHeader('Research', 'Publications: journal articles, conference papers, books, edited books, and book chapters.')}
    ${structureOverview(researchGroups, (value) => `#/workbench/${value}`)}
    <div class="quick-actions">${actionLink('Add Publication', '#/workbench/journal_articles')}</div>
    ${moduleListContent(items, (item) => `#/workbench/${item.module}/${item.id}`, (item) => ctx.cardActions('workbench', item.id, item.module))}`;
}

export function teachingPage(ctx) {
  return academicModulePage(ctx, 'teaching', 'Teaching', 'Direct teaching: course outlines, lectures, quizzes, examinations, invigilation, and evaluation.', teachingGroups);
}

export function supervisionPage(ctx) {
  const candidates = ctx.visibleCandidates();
  return `${pageHeader('Supervision', 'PhD, Masters, UG, and intern supervision records.')}
    ${structureOverview(supervisionGroups, () => '#/students')}
    <div class="grid">${candidates.map((candidate) => recordCard({
      title: candidate.name,
      meta: `${candidate.programme_type} | ${candidate.status}`,
      body: `${candidate.topic} | current phase: ${candidate.phase_progress?.find((phase) => ['active', 'scheduled'].includes(phase.status))?.phase || 'not set'}`,
      badges: `${statusBadge(candidate.status)} ${visibilityBadge(candidate.visibility)}`,
      href: `#/candidates/${candidate.id}`,
      actions: ctx.cardActions('candidate', candidate.id)
    })).join('') || emptyState('No supervision records', 'No supervision records are visible.')}</div>`;
}

export function projectsPage(ctx) {
  const items = ctx.visibleWorkbench().filter((item) => projectModules.includes(item.module));
  return `${pageHeader('Projects', 'Consultancy projects, sponsored projects, and research projects.')}
    ${structureOverview(projectGroups, () => '#/workbench/projects')}
    <div class="quick-actions">${actionLink('Add Project', '#/workbench/projects')}</div>
    ${moduleListContent(items, (item) => `#/workbench/${item.module}/${item.id}`, (item) => ctx.cardActions('workbench', item.id, item.module))}`;
}

export function adminWorkPage(ctx) {
  return academicModulePage(ctx, 'admin_work', 'Administration', 'Co-curricular, corporate academic administration, and professional development responsibilities.', administrationGroups);
}

export function externalEngagementsPage(ctx) {
  return academicModulePage(ctx, 'external_engagements', 'External Engagements', 'Visiting faculty, talks, workshops, and consultancy engagements.');
}

export function careerMobilityPage(ctx) {
  return academicModulePage(ctx, 'career_mobility', 'Career Mobility', 'Visiting faculty, adjunct faculty, teaching applications, and miscellaneous opportunities.', careerGroups);
}

export function subscriptionPage(ctx) {
  return academicModulePage(ctx, 'subscriptions', 'Subscription', 'Track starting date, ending date, payment, renewal, and access status.', subscriptionGroups);
}

export function miscellaneousPage(ctx) {
  const career = ctx.visibleAcademicLife().filter((item) => item.module === 'career_mobility');
  const subscriptions = ctx.visibleAcademicLife().filter((item) => item.module === 'subscriptions');
  return `${pageHeader('Miscellaneous', 'Career mobility and subscriptions in one place.')}
    <div class="grid two">
      <section class="panel">
        <h3>Career Mobility</h3>
        ${structureOverview(careerGroups, () => '#/career')}
        ${career.map((item) => recordCard({
          title: item.title,
          meta: `${item.sub_type} | ${item.status} | deadline: ${item.application_deadline || item.final_deadline || 'not set'}`,
          body: `${taskProgress(item).label} | ${firstVisibleNote(item)}`,
          badges: `${statusBadge(item.status)} ${statusBadge(item.priority || 'medium')}`,
          href: `#/career/${item.id}`,
          actions: ctx.cardActions('academic', item.id, 'career_mobility')
        })).join('') || emptyState('No career records', 'No career mobility records are present yet.')}
      </section>
      <section class="panel">
        <h3>Subscription</h3>
        ${structureOverview(subscriptionGroups, () => '#/subscriptions')}
        ${subscriptions.map((item) => recordCard({
          title: item.title,
          meta: `${item.starting_date || 'no start'} to ${item.ending_date || 'no end'} | ${item.payment_status || item.status}`,
          body: `${taskProgress(item).label} | ${firstVisibleNote(item)}`,
          badges: `${statusBadge(item.status)} ${statusBadge(item.priority || 'medium')}`,
          href: `#/subscriptions/${item.id}`,
          actions: ctx.cardActions('academic', item.id, 'subscriptions')
        })).join('') || emptyState('No subscriptions', 'No subscriptions are present yet.')}
      </section>
    </div>`;
}

export function academicModulePage(ctx, module, title, subtitle, groups = []) {
  const items = ctx.visibleAcademicLife().filter((item) => item.module === module);
  const form = ctx.canWrite() ? academicRecordForm(module, title, ctx) : '<p class="notice">Local data entry is currently unavailable in this view.</p>';
  return `${pageHeader(title, subtitle)}
    ${groups.length ? structureOverview(groups) : ''}
    ${form}
    <div class="grid">${items.map((item) => recordCard({
      title: item.title,
      meta: `${item.academic_year_current} | ${item.category} | ${item.priority} | final deadline: ${item.final_deadline || item.application_deadline || 'not set'}`,
      body: `${taskProgress(item).label} | ${firstVisibleNote(item)}`,
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)} ${item.carry_forward ? statusBadge('carry_forward') : ''}`,
      href: `#/${routeName(module)}/${item.id}`,
      actions: ctx.cardActions('academic', item.id, module)
    })).join('') || emptyState('No records', 'No records are available in this module yet.')}</div>`;
}

export function academicModuleDetailPage(ctx, module, id) {
  const item = ctx.visibleAcademicLife().find((record) => record.module === module && record.id === id);
  if (!item) return emptyState('Record not found', 'This academic life record is unavailable for the selected role.');
  return `${pageHeader(item.title, `${item.category} | ${item.sub_type}`)}
    ${printActionBar(`<a class="card-link" href="#/${routeName(module)}">Back</a>`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(item.status)} ${statusBadge(item.priority)} ${visibilityBadge(item.visibility)} ${item.carry_forward ? statusBadge('carry_forward') : ''}</div>
      ${detailSection('Overall task', `${taskSummary(item)}<p><strong>Academic year:</strong> ${escapeHtml(item.academic_year_current)}</p><p><strong>Carry forward:</strong> ${escapeHtml(item.carry_forward)}</p><p><strong>Created by:</strong> ${escapeHtml(item.created_by)}</p>`)}
      ${detailSection('Activity / sub-activity timeline', subtaskTimeline(item, { kind: 'academic', id: item.id, module }))}
      ${ctx.canWrite() ? ctx.subtaskForm('academic', item.id, module) : ''}
      ${detailSection('Details', `<pre>${escapeHtml(JSON.stringify(stripLargeArrays(item), null, 2))}</pre>`)}
      ${detailSection('Append-only notes', notesPanel(ctx.maskNotes(item.notes || [])))}
      ${detailSection('History', timelinePanel(item.history || []))}
    </section>`;
}

function moduleList(title, subtitle, items, hrefFor) {
  return `${pageHeader(title, subtitle)}
    ${moduleListContent(items, hrefFor)}`;
}

function moduleListContent(items, hrefFor, actionsFor = () => '') {
  return `
    <div class="grid">${items.map((item) => recordCard({
      title: item.title,
      meta: `${item.module} | ${item.status} | final deadline: ${item.final_deadline || 'not set'}`,
      body: `${taskProgress(item).label} | ${item.description_or_abstract || firstVisibleNote(item)}`,
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)} ${item.carry_forward ? statusBadge('carry_forward') : ''}`,
      href: hrefFor(item),
      actions: actionsFor(item)
    })).join('') || emptyState('No records', 'No records are visible.')}</div>`;
}

function actionLink(label, href) {
  return `<a class="quick-action" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function academicRecordForm(module, title, ctx) {
  return `<section class="panel">
    <h3>Add ${escapeHtml(title)} record</h3>
    <form class="record-form" data-academic-module="${escapeHtml(module)}">
      <input name="title" required placeholder="Title" />
      ${hasStructuredSubtype(module) ? '' : '<input name="sub_type" placeholder="Subtype" />'}
      ${moduleSpecificFields(module)}
      <input name="final_deadline" type="date" />
      <input name="notes" placeholder="Initial append-only note" />
      <input name="academic_year_current" placeholder="Academic year" value="2025-2026" />
      <select name="status">${statusOptions(module)}</select>
      <select name="priority"><option>low</option><option>medium</option><option>high</option></select>
      <button>Add local record</button>
    </form>
  </section>`;
}

function moduleSpecificFields(module) {
  if (module === 'teaching') return subtypeSelect(teachingGroups);
  if (module === 'admin_work') return subtypeSelect(administrationGroups);
  if (module === 'career_mobility') return `${subtypeSelect(careerGroups)}
      <input name="institution_name" placeholder="Institution name" />
      <input name="role_title" placeholder="Role title" />
      <select name="opportunity_type">
        <option>job_application</option>
        <option>deputation</option>
        <option>lien</option>
        <option>extraordinary_leave</option>
        <option>contractual_role</option>
        <option>visiting_position</option>
        <option>other</option>
      </select>
      <input name="employment_basis" placeholder="Employment basis" />
      <input name="place_city" placeholder="City" />
      <input name="place_country" placeholder="Country" />
      <input name="application_deadline" type="date" />
      <input name="application_date" type="date" />`;
  if (module === 'subscriptions') return `${subtypeSelect(subscriptionGroups)}
      <input name="starting_date" type="date" />
      <input name="ending_date" type="date" />
      <input name="payment" placeholder="Payment / amount" />
      <select name="payment_status"><option>planned</option><option>paid</option><option>due</option><option>reimbursed</option><option>cancelled</option></select>`;
  return '';
}

function hasStructuredSubtype(module) {
  return ['teaching', 'admin_work', 'career_mobility', 'subscriptions'].includes(module);
}

function firstVisibleNote(item) {
  const note = (item.notes || item.notes_append_only || [])[0];
  return note?.text || item.feedback || item.responsibility || item.organization || '';
}

function stripLargeArrays(item) {
  const { notes, history, subtasks, visibility, masked, ...rest } = item;
  return rest;
}

function routeName(module) {
  if (module === 'admin_work') return 'admin-work';
  if (module === 'external_engagements') return 'external';
  if (module === 'career_mobility') return 'career-mobility';
  if (module === 'subscriptions') return 'subscriptions';
  return module;
}

function statusOptions(module) {
  const statuses = module === 'career_mobility'
    ? ['planned', 'applied', 'no_shortlisting', 'shortlisted', 'noc_required', 'noc_from_employer', 'interview', 'no_selection', 'selected', 'technical_resignation', 'joined', 'closed']
    : ['active', 'in_progress', 'planned', 'completed'];
  return statuses.map((status) => `<option>${escapeHtml(status)}</option>`).join('');
}

function structureOverview(groups, hrefFor = () => '') {
  return `<div class="structure-grid">${groups.map((group) => `<section class="structure-panel">
    <h3>${escapeHtml(group.title)}</h3>
    <div class="chip-list">${group.items.map(([value, label]) => {
      const href = hrefFor(value);
      return href ? `<a class="chip" href="${escapeHtml(href)}">${escapeHtml(label)}</a>` : `<span class="chip">${escapeHtml(label)}</span>`;
    }).join('')}</div>
  </section>`).join('')}</div>`;
}

function subtypeSelect(groups) {
  return `<select name="sub_type">${optionList(groups).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('')}</select>`;
}
