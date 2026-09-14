/**
 * Date formatting utilities for Gestionale Ore.
 * Formats all dates consistently as gg/mm/aaaa (DD/MM/YYYY).
 */

/**
 * Formats a date string (YYYY-MM-DD or ISO) into gg/mm/aaaa (DD/MM/YYYY).
 * @param {string|Date} value - Input date
 * @returns {string} - Formatted date in gg/mm/aaaa
 */
export function formatDate(value) {
  if (!value) return '-';

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Check if it already matches DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // Match YYYY-MM-DD (optionally followed by time)
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return String(value);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a date-time string into gg/mm/aaaa HH:mm.
 * @param {string|Date} value - Input date-time
 * @returns {string} - Formatted date-time in gg/mm/aaaa HH:mm
 */
export function formatDateTime(value) {
  if (!value) return '-';

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Match YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      const hours = match[4].padStart(2, '0');
      const minutes = match[5];
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return formatDate(value);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
