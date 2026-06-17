const BOLIVIA_TIMEZONE = 'America/La_Paz';

export function formatDateTime(value: string): string {
  const parts = new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BOLIVIA_TIMEZONE,
  }).formatToParts(new Date(value));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return `${values.day}/${values.month}/${values.year} ${values.hour}:${values.minute}`;
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
