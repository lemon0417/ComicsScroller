import { devLog } from "@utils/devLog";
import { concat, defer, EMPTY, from, of } from "rxjs";
import {
  catchError,
  defaultIfEmpty,
  finalize,
  map as rxMap,
  mergeMap,
} from "rxjs/operators";

import type { FetchMetaOptions, SiteMeta } from "../types";
import {
  parseDm5CoverMeta,
  parseDm5LegacyMeta,
  parseDm5RssMetaStrict,
  resolveDm5RssUrl,
} from "./metaParser";

type FetchText = (url: string, source: string) => Promise<string>;

async function fetchText(url: string, source: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`DM5 ${source} request failed: ${response.status}`);
  }
  return response.text();
}

function buildLegacyFallback$(
  url: string,
  fetchText: FetchText,
  preferredHtmlPromise?: Promise<string> | null,
) {
  const html$ = from(
    preferredHtmlPromise || fetchText(url, "comic html fallback"),
  );

  return html$.pipe(
    rxMap((html): SiteMeta => {
      const meta = parseDm5LegacyMeta(html);
      devLog("dm5:fetchMeta:htmlFallbackDone", {
        url,
        title: meta.title,
        chapterListLength: meta.chapterList.length,
        hasCover: Boolean(meta.cover),
      });
      return meta;
    }),
  );
}

function buildFetchMeta$(
  url: string,
  includeCover: boolean,
  deferCover: boolean,
  fetchText: FetchText,
) {
  const rssUrl = resolveDm5RssUrl(url);
  devLog("dm5:fetchMeta:start", {
    url,
    rssUrl,
    includeCover,
    deferCover,
    useLegacyHtmlParser: rssUrl === url,
  });

  if (rssUrl === url) {
    return from(fetchText(url, "comic html")).pipe(
      rxMap((html): SiteMeta => {
        const meta = parseDm5LegacyMeta(html);
        devLog("dm5:fetchMeta:htmlDone", {
          url,
          title: meta.title,
          chapterListLength: meta.chapterList.length,
          hasCover: Boolean(meta.cover),
        });
        return meta;
      }),
    );
  }

  const rssTextPromise = fetchText(rssUrl, "rss");
  const coverHtmlPromise = includeCover ? fetchText(url, "comic html") : null;
  if (coverHtmlPromise) {
    void coverHtmlPromise.catch(() => undefined);
  }

  return from(rssTextPromise).pipe(
    rxMap(parseDm5RssMetaStrict),
    mergeMap((rssMeta) => {
      const minimalMeta: SiteMeta = {
        ...rssMeta,
        cover: "",
      };
      devLog("dm5:fetchMeta:rssDone", {
        url,
        rssUrl,
        title: minimalMeta.title,
        chapterListLength: minimalMeta.chapterList.length,
        includeCover,
        deferCover,
      });

      if (!includeCover || !coverHtmlPromise) {
        return of(minimalMeta);
      }

      const hydratedCover$ = from(coverHtmlPromise).pipe(
        rxMap((comicHtml) => parseDm5CoverMeta(comicHtml)),
        mergeMap((cover) => {
          if (!cover) {
            return EMPTY;
          }
          const hydratedMeta: SiteMeta = {
            ...minimalMeta,
            cover,
          };
          devLog("dm5:fetchMeta:coverHydrated", {
            url,
            rssUrl,
            title: hydratedMeta.title,
            chapterListLength: hydratedMeta.chapterList.length,
            hasCover: true,
            deferCover,
          });
          return of(hydratedMeta);
        }),
      );

      if (!deferCover) {
        return hydratedCover$.pipe(
          defaultIfEmpty(minimalMeta),
          catchError(() => of(minimalMeta)),
        );
      }

      return concat(
        of(minimalMeta),
        hydratedCover$.pipe(catchError(() => EMPTY)),
      );
    }),
    catchError((error) => {
      devLog("dm5:fetchMeta:rssFallback", {
        url,
        rssUrl,
        includeCover,
        reason: error instanceof Error ? error.message : String(error),
      });
      return buildLegacyFallback$(url, fetchText, coverHtmlPromise);
    }),
  );
}

export function fetchMeta$(
  url: string,
  { includeCover = true, deferCover = false }: FetchMetaOptions = {},
) {
  return defer(() => {
    const controllers = new Set<AbortController>();
    const fetchTextForSession: FetchText = (requestUrl, source) => {
      const controller = new AbortController();
      controllers.add(controller);
      return fetchText(requestUrl, source, controller.signal).finally(() => {
        controllers.delete(controller);
      });
    };

    return buildFetchMeta$(
      url,
      includeCover,
      deferCover,
      fetchTextForSession,
    ).pipe(
      finalize(() => {
        controllers.forEach((controller) => {
          controller.abort();
        });
        controllers.clear();
      }),
    );
  });
}
