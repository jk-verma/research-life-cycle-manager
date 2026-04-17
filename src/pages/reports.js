import { emptyState, pageHeader, recordCard, statusBadge, visibilityBadge } from '../components/ui.js';
import { shouldCarryForward } from '../utils/academic-year.js';
import { isOverdue } from '../utils/date.js';

export function reportsPage(ctx) {
  const records = ctx.allRecords();
  const completed = records.filter((item) => ['completed', 'published', 'accepted', 'closed'].includes(String(item.status).toLowerCase()));
  const pending = records.filter((item) => !['completed', 'published', 'accepted', 'closed', 'archived'].includes(String(item.status).toLowerCase()));
  const overdue = records.filter((item) => isOverdue(item.due_date || item.next_action_date || item.next_meeting_date, item.status));
  const carryForward = records.filter(shouldCarryForward);
  const years = [...new Set(records.flatMap((item) => [item.academic_year_current, item.academic_year_start]).filter(Boolean))].sort().reverse();
  return `${pageHeader('Reports', 'Completed vs pending, overdue items, and academic-year summaries.')}
    <div class="metrics">
      ${metric('Completed', completed.length)}
      ${metric('Pending', pending.length)}
      ${metric('Overdue', overdue.length, overdue.length ? 'danger' : '')}
      ${metric('Carry-forward', carryForward.length)}
    </div>
    <div class="grid two">
      <section class="panel"><h3>Overdue items</h3>${overdue.map((item) => reportCard(item)).join('') || emptyState('No overdue items', 'No overdue records are visible.')}</section>
      <section class="panel"><h3>Carry-forward items</h3>${carryForward.map((item) => reportCard(item)).join('') || emptyState('No carry-forward work', 'Everything visible is completed or closed.')}</section>
      <section class="panel"><h3>Yearly summary</h3>${years.map((year) => {
        const inYear = records.filter((item) => item.academic_year_current === year || item.academic_year_start === year);
        return recordCard({
          title: year,
          meta: `${inYear.length} records`,
          body: `${inYear.filter(shouldCarryForward).length} carry-forward | ${inYear.filter((item) => completed.includes(item)).length} completed`,
          badges: statusBadge('year_summary'),
          href: `#/years/${year}`
        });
      }).join('')}</section>
    </div>`;
}

function reportCard(item) {
  return recordCard({
    title: item.name || item.title,
    meta: `${item.academic_year_current || 'no year'} | ${item.status}`,
    body: item.topic || item.description_or_abstract || firstNote(item) || item.short_notes,
    badges: `${statusBadge(item.status || 'active')} ${visibilityBadge(item.visibility || 'internal')}`,
    href: item.route || '#/reports'
  });
}

function firstNote(item) {
  return Array.isArray(item.notes) ? item.notes[0]?.text : item.notes;
}

function metric(label, value, tone = '') {
  return `<article class="metric ${tone}"><strong>${value}</strong><span>${label}</span></article>`;
}
