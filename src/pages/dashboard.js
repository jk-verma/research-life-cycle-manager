import { pageHeader, recordCard, statusBadge, visibilityBadge } from '../components/ui.js';
import { isOverdue } from '../utils/date.js';
import { flattenWorkbench } from '../utils/search.js';

export function dashboardPage(ctx) {
  const { store, visibleCandidates, visibleMeetings, visibleWorkbench } = ctx;
  const candidates = visibleCandidates();
  const meetings = visibleMeetings();
  const workbench = visibleWorkbench();
  const masters = candidates.filter((item) => item.programme_type === 'Masters').length;
  const phd = candidates.filter((item) => item.programme_type === 'PhD').length;
  const interns = candidates.filter((item) => item.programme_type === 'Intern').length;
  const upcomingMeetings = meetings.filter((item) => item.next_meeting_date && item.status !== 'archived');
  const overdueActions = meetings.flatMap((meeting) => (meeting.action_items || []).map((action) => ({ ...action, meeting }))).filter((item) => isOverdue(item.due_date, item.status));
  const activeProjects = flattenWorkbench(store.workbench).filter((item) => item.module === 'projects' && !['completed', 'archived'].includes(item.status));
  const manuscripts = workbench.filter((item) => ['journal_articles', 'authored_books', 'book_chapters', 'conference_papers'].includes(item.module) && ['drafting', 'submitted', 'under_review', 'revision'].includes(item.status));
  const followups = workbench.filter((item) => JSON.stringify(item).toLowerCase().includes('follow'));
  const recent = [...candidates, ...meetings, ...workbench]
    .sort((a, b) => String(b.timestamps?.updated_at || '').localeCompare(String(a.timestamps?.updated_at || '')))
    .slice(0, 6);

  return `${pageHeader('Dashboard', 'Operational view across supervision and academic work.', `Data updated ${store.candidates.updated_at?.slice(0, 10) || 'unknown'}`)}
    <div class="metrics">
      ${metric('Total candidates', candidates.length)}
      ${metric('Masters / PhD / Intern', `${masters} / ${phd} / ${interns}`)}
      ${metric('Upcoming meetings', upcomingMeetings.length)}
      ${metric('Overdue actions', overdueActions.length, overdueActions.length ? 'danger' : '')}
      ${metric('Active projects', activeProjects.length)}
      ${metric('Manuscripts in progress', manuscripts.length)}
      ${metric('Needs follow-up', followups.length)}
      ${metric('Recently updated', recent.length)}
    </div>
    <div class="grid two">
      <section class="panel"><h3>Upcoming meetings</h3>${upcomingMeetings.map((item) => recordCard({
        title: item.title,
        meta: `${item.next_meeting_date} | ${item.phase}`,
        body: item.discussion,
        badges: visibilityBadge(item.visibility),
        href: `#/meetings/${item.id}`
      })).join('')}</section>
      <section class="panel"><h3>Recently updated</h3>${recent.map((item) => recordCard({
        title: item.name || item.title,
        meta: item.programme_type || item.module || item.phase,
        body: item.topic || item.description_or_abstract || item.discussion,
        badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)}`,
        href: item.programme_type ? `#/candidates/${item.id}` : item.module ? `#/workbench/${item.module}/${item.id}` : `#/meetings/${item.id}`
      })).join('')}</section>
    </div>`;
}

function metric(label, value, tone = '') {
  return `<article class="metric ${tone}"><strong>${value}</strong><span>${label}</span></article>`;
}
