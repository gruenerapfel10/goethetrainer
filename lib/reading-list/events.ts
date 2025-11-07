export const READING_LIST_UPDATED_EVENT = 'reading-list:updated';

export function emitReadingListUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(READING_LIST_UPDATED_EVENT));
}
