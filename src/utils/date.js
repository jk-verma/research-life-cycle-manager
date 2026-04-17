export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

export function isOverdue(date, status = '') {
  if (!date) return false;
  const normalized = String(date);
  const checkpoint = normalized.includes('T') ? new Date(normalized).toISOString().slice(0, 16) : normalized.slice(0, 10);
  const now = new Date().toISOString().slice(0, normalized.includes('T') ? 16 : 10);
  return checkpoint < now && !['done', 'closed', 'completed', 'published', 'accepted', 'cancelled', 'canceled'].includes(String(status).toLowerCase());
}

export function inDateRange(date, from, to) {
  if (!date) return !from && !to;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}
