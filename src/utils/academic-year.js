export function academicYearForDate(dateText) {
  const date = dateText ? new Date(dateText) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const start = month >= 7 ? year : year - 1;
  return `${start}-${start + 1}`;
}

export function allAcademicYears(records) {
  return [...new Set(records.flatMap((record) => [record.academic_year_start, record.academic_year_current]).filter(Boolean))].sort().reverse();
}
