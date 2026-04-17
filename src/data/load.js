export const DATA_PATHS = {
  users: 'config/users.json',
  permissions: 'config/permissions.json',
  candidates: 'data/candidates/candidates.json',
  mentors: 'data/mentors/mentors.json',
  meetings: 'data/meetings/meetings.json',
  workbench: 'data/workbench/workbench.json',
  activities: 'data/daily-activities/daily-activities.json',
  calendar: 'data/calendar/calendar.json',
  academicLife: 'data/academic-life/academic-life.json',
  workflowTemplates: 'config/workflow-templates.json'
};

function dataUrls(path) {
  const base = import.meta.env?.BASE_URL || './';
  return [
    `${base}${path}`.replace(/\/{2,}/g, '/'),
    `./${path}`,
    `./public/${path}`
  ];
}

async function loadJson(path) {
  const urls = dataUrls(path);
  for (const url of urls) {
    const response = await fetch(url);
    if (response.ok) return response.json();
  }
  throw new Error(`Could not load ${urls.join(' or ')}`);
}

function validateStore(store) {
  const errors = [];
  if (!Array.isArray(store.candidates?.records)) errors.push('Candidate records are missing.');
  if (!Array.isArray(store.mentors?.records)) errors.push('Mentor records are missing.');
  if (!Array.isArray(store.meetings?.records)) errors.push('Meeting records are missing.');
  if (!store.workbench?.modules) errors.push('Workbench modules are missing.');
  if (!Array.isArray(store.activities?.records)) errors.push('Daily activity records are missing.');
  if (!Array.isArray(store.calendar?.records)) errors.push('Calendar records are missing.');
  if (!store.academicLife?.modules) errors.push('Academic life modules are missing.');
  if (!store.permissions?.roles) errors.push('Permission roles are missing.');
  if (!Array.isArray(store.workflowTemplates?.templates)) errors.push('Workflow templates are missing.');
  return errors;
}

export async function loadStore() {
  const entries = await Promise.all(Object.entries(DATA_PATHS).map(async ([key, path]) => [key, await loadJson(path)]));
  const store = Object.fromEntries(entries);
  const errors = validateStore(store);
  if (errors.length) throw new Error(errors.join(' '));
  return store;
}
