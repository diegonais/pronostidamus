const BOLIVIA_TIMEZONE = 'America/La_Paz';

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: BOLIVIA_TIMEZONE,
  }).format(new Date(value));
}

export function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
