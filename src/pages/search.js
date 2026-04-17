import { emptyState, pageHeader, recordCard, statusBadge, taskCardBody, visibilityBadge } from '../components/ui.js';
import { structuredFilter } from '../utils/search.js';

export function searchPage(ctx) {
  const records = [
    ...ctx.visibleCandidates().map((item) => ({ ...item, kind: 'candidate', title: item.name, href: `#/candidates/${item.id}`, body: item.topic })),
    ...ctx.visibleMentors().map((item) => ({ ...item, kind: 'mentor', title: item.name, href: `#/mentors/${item.id}`, body: `${item.mentor_type} ${item.specialization || ''} ${(item.assigned_candidate_ids || []).join(' ')}` })),
    ...ctx.visibleMeetings().map((item) => ({ ...item, kind: 'meeting', href: `#/meetings/${item.id}`, body: item.discussion })),
    ...ctx.visibleWorkbench().map((item) => ({ ...item, kind: item.module, href: `#/workbench/${item.module}/${item.id}`, body: item.description_or_abstract })),
    ...ctx.visibleActivities().map((item) => ({ ...item, kind: 'daily_activity', href: `#/activities/${item.id}`, body: item.short_notes })),
    ...ctx.visibleCalendar().map((item) => ({ ...item, kind: 'calendar', href: `#/calendar/${item.id}`, body: item.notes })),
    ...ctx.visibleAcademicLife().map((item) => ({ ...item, kind: item.module, href: `#/${routeName(item.module)}/${item.id}`, body: (item.notes || [])[0]?.text || item.feedback || item.responsibility || item.organization }))
  ];
  const results = structuredFilter(records, ctx.filters);
  return `${pageHeader('Search', 'Find students, mentors, teaching, research, projects, career items, academic administration, and external engagements.')}
    ${ctx.renderFilters()}
    <div class="grid">${results.map((item) => recordCard({
      title: item.title,
      meta: `${item.kind} | ${item.priority || 'medium'} | ${item.academic_year_current || 'no year'}`,
      body: taskCardBody(item, item.body),
      badges: `${statusBadge(item.status || 'active')} ${visibilityBadge(item.visibility)}`,
      href: item.href,
      actions: actionsForSearchResult(ctx, item)
    })).join('') || emptyState('No matches', 'Adjust the filters and try again.')}</div>`;
}

function actionsForSearchResult(ctx, item) {
  if (item.kind === 'candidate') return ctx.cardActions('candidate', item.id);
  if (item.kind === 'mentor') return ctx.cardActions('mentor', item.id);
  if (item.kind === 'meeting') return ctx.cardActions('meeting', item.id);
  if (item.kind === 'daily_activity') return ctx.cardActions('activity', item.id);
  if (item.kind === 'calendar') return ctx.cardActions('calendar', item.id);
  if (['journal_articles', 'authored_books', 'edited_books', 'book_chapters', 'conference_papers', 'projects', 'consultancy', 'custom_activities'].includes(item.kind)) return ctx.cardActions('workbench', item.id, item.kind);
  if (['teaching', 'admin_work', 'external_engagements', 'career_mobility', 'subscriptions'].includes(item.kind)) return ctx.cardActions('academic', item.id, item.kind);
  return '';
}

function routeName(module) {
  if (module === 'admin_work') return 'admin-work';
  if (module === 'external_engagements') return 'external';
  if (module === 'career_mobility') return 'career-mobility';
  if (module === 'subscriptions') return 'subscriptions';
  return module;
}
