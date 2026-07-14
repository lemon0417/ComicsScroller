import { map } from "rxjs/operators";

import comicbusAdapter from "./comicbus/adapter";
import dm5Adapter from "./dm5/adapter";
import sfAdapter from "./sf/adapter";
import type {
  SiteAdapter,
  SiteChapterFetcher,
  SiteChapterSnapshot,
} from "./types";

const adapters: Record<string, SiteAdapter> = {
  dm5: dm5Adapter,
  sf: sfAdapter,
  comicbus: comicbusAdapter,
};

export function getSiteAdapter(site: string) {
  return adapters[site];
}

function projectChapterSnapshot({
  chapterList,
  chapters,
}: SiteChapterSnapshot): SiteChapterSnapshot {
  return { chapterList, chapters };
}

export function getSiteChapterFetcher(
  site: string,
): SiteChapterFetcher | undefined {
  const adapter = getSiteAdapter(site);
  if (!adapter) return undefined;

  return (url) =>
    adapter.fetchMeta(url, { includeCover: false }).pipe(
      map(projectChapterSnapshot),
    );
}
