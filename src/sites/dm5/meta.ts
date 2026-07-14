import { devLog } from "@utils/devLog";
import { concat, EMPTY, from, of } from "rxjs";
import {
  catchError,
  defaultIfEmpty,
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

async function fetchText(url: string, source: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DM5 ${source} request failed: ${response.status}`);
  }
  return response.text();
}

function buildLegacyFallback$(
  url: string,
  preferredHtmlPromise?: Promise<string> | null,
) {
  const html$ = preferredHtmlPromise
    ? from(preferredHtmlPromise).pipe(
        catchError(() => from(fetchText(url, "comic html fallback"))),
      )
    : from(fetchText(url, "comic html fallback"));

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

export function fetchMeta$(
  url: string,
  { includeCover = true, deferCover = false }: FetchMetaOptions = {},
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
      return buildLegacyFallback$(url, coverHtmlPromise);
    }),
  );
}
