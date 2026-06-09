import type { PopupFeedEntry } from "@domain/library";

export function normalizeManageSearchQuery(value: string) {
  return value.trim().toLowerCase();
}

export function matchesManageSearchQuery(
  item: PopupFeedEntry,
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return true;
  }
  return [item.title, item.comicsID].some((value) =>
    String(value || "").toLowerCase().includes(normalizedQuery),
  );
}
