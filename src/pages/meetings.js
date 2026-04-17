import { detailSection, emptyState, notesPanel, pageHeader, printActionBar, recordCard, statusBadge, timelinePanel, visibilityBadge } from '../components/ui.js';
import { isOverdue } from '../utils/date.js';
import { escapeHtml } from '../utils/html.js';
import { structuredFilter } from '../utils/search.js';

export function meetingsListPage(ctx) {
  const meetings = structuredFilter(ctx.visibleMeetings(), ctx.filters);
  return `${pageHeader('Meetings', 'Meeting minutes, action items, attendance, and append-only comments.')}
    ${ctx.renderFilters()}
    <div class="grid">${meetings.map((meeting) => recordCard({
      title: meeting.title,
      meta: `${meeting.date} | ${meeting.phase} | ${meeting.attendance_status}`,
      body: meeting.discussion,
      badges: `${statusBadge(meeting.status)} ${visibilityBadge(meeting.visibility)}`,
      href: `#/meetings/${meeting.id}`,
      actions: ctx.cardActions('meeting', meeting.id)
    })).join('') || emptyState('No meetings', 'No meetings match the current filters.')}</div>`;
}

export function meetingDetailPage(ctx, id) {
  const meeting = ctx.visibleMeetings().find((item) => item.id === id);
  if (!meeting) return emptyState('Meeting not found', 'This meeting is unavailable or hidden for the selected role.');
  const candidate = ctx.visibleCandidates().find((item) => item.id === meeting.candidate_id);
  return `${pageHeader(meeting.title, `${meeting.programme_type} | ${meeting.phase}`)}
    ${printActionBar(`<a class="card-link" href="#/meetings">Back</a>`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(meeting.status)} ${visibilityBadge(meeting.visibility)}</div>
      <div class="grid two">
        ${detailSection('Metadata', `<p><strong>Candidate:</strong> ${escapeHtml(candidate?.name || meeting.candidate_id)}</p><p><strong>Date:</strong> ${escapeHtml(meeting.date)} ${escapeHtml(meeting.start_time)}-${escapeHtml(meeting.end_time)}</p><p><strong>Mode:</strong> ${escapeHtml(meeting.mode)}</p><p><strong>Venue/link:</strong> ${escapeHtml(meeting.venue_or_link)}</p>`)}
        ${detailSection('Attendance', `<p><strong>Status:</strong> ${escapeHtml(meeting.attendance_status)}</p><p>${(meeting.attendees || []).map(escapeHtml).join(', ')}</p>`)}
      </div>
      ${detailSection('Agenda', `<p>${escapeHtml(meeting.agenda)}</p>`)}
      ${detailSection('Discussion', `<p>${escapeHtml(meeting.discussion)}</p>`)}
      ${detailSection('Decisions', `<p>${escapeHtml(meeting.decisions)}</p>`)}
      ${detailSection('Action items', (meeting.action_items || []).map((item) => `<article class="action-item ${isOverdue(item.due_date, item.status) ? 'overdue-card' : ''}"><strong>${escapeHtml(item.text)}</strong><span>${escapeHtml(item.responsible_person)} | due ${escapeHtml(item.due_date)} | ${escapeHtml(item.status)}</span>${isOverdue(item.due_date, item.status) ? '<b>Overdue</b>' : ''}</article>`).join('') || '<p class="muted">No action items.</p>')}
      ${detailSection('Append-only comments', notesPanel(ctx.maskNotes(meeting.comments_append_only)))}
      ${detailSection('Revision history', timelinePanel(meeting.revision_history))}
      ${ctx.canWrite() ? ctx.appendNoteForm('meeting', meeting.id) : ''}
      ${ctx.canArchive() && meeting.status !== 'archived' ? `<button class="secondary" data-archive-kind="meeting" data-archive-id="${escapeHtml(meeting.id)}">Archive meeting</button>` : ''}
    </section>`;
}
