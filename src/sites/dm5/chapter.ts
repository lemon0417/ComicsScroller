const baseURL = "https://www.dm5.com";
const READER_REDIRECT_BYPASS_PARAM = "cs_open_native";

export { resolveDm5ImageUrl } from "./imageResolver";

type Dm5ChapterImageEntry = {
  chapter: string;
  cid: string;
  href?: string;
  key: string;
  src: string;
  type?: "image" | "paywall";
};

type Dm5ChapterPageMeta = {
  chapterID: string;
  seriesSlug: string;
  imgList: Dm5ChapterImageEntry[];
};

const extractScriptVar = (script: string, name: string) => {
  const match = new RegExp(
    `${name}\\s*=\\s*(?:\\"([^\\"]*)\\"|'([^']*)'|([^;\\n]*))`,
  ).exec(script);
  const value = match ? (match[1] ?? match[2] ?? match[3]) : "";
  return (value || "").trim();
};

const parseDomChapterPage = (html: string, chapterID: string) => {
  const Parser = globalThis.DOMParser;
  if (!Parser) return null;

  const doc = new Parser().parseFromString(html, "text/html");
  const anchor = doc.querySelector(
    "div.title > span:nth-child(2) > a",
  ) as HTMLAnchorElement | null;
  const scriptText = doc.documentElement?.textContent ?? "";
  const dm5Key =
    extractScriptVar(scriptText, "DM5_KEY") ||
    (doc.querySelector("#dm5_key") as HTMLInputElement | null)?.value ||
    "";
  const paywalled = Boolean(
    doc.querySelector("#view-chapterpay-btn") ||
      doc.querySelector(".view-pay-btn"),
  );

  return buildChapterPageMeta(
    chapterID,
    scriptText,
    anchor?.getAttribute("href") || "",
    dm5Key,
    paywalled,
  );
};

const parseHtmlChapterPage = (html: string, chapterID: string) => {
  const anchorMatch =
    /<div[^>]*class="title"[\s\S]*?<span[^>]*>\s*<a[^>]*href="([^"]+)"/i.exec(
      html,
    );
  return buildChapterPageMeta(
    chapterID,
    html,
    anchorMatch ? anchorMatch[1] : "",
    extractDm5InputKey(html),
    /id=["']view-chapterpay-btn["']|class=["'][^"']*view-pay-btn/i.test(html),
  );
};

const extractDm5InputKey = (html: string) => {
  const inputMatch = /<input[^>]*dm5_key[^>]*>/i.exec(html);
  if (!inputMatch) return "";

  const valueMatch = /\bvalue=["']([^"']*)["']/i.exec(inputMatch[0]);
  return valueMatch ? valueMatch[1] : "";
};

const buildDm5PaywallHref = (chapterID: string) => {
  const paywallUrl = new URL(`/${chapterID}/`, baseURL);
  paywallUrl.searchParams.set(READER_REDIRECT_BYPASS_PARAM, "1");
  return paywallUrl.toString();
};

const parseSeriesSlug = (comicHref: string, curlRaw: string) =>
  comicHref.replace(/^\/+|\/+$/g, "") ||
  curlRaw.replace(/^\/+|\/+$/g, "");

function buildChapterPageMeta(
  chapterID: string,
  scriptText: string,
  comicHref: string,
  dm5KeyFallback: string,
  paywalled: boolean,
): Dm5ChapterPageMeta {
  const imageCount = parseInt(extractScriptVar(scriptText, "DM5_IMAGE_COUNT"), 10) || 0;
  const cid = extractScriptVar(scriptText, "DM5_CID");
  const curlRaw = extractScriptVar(scriptText, "DM5_CURL");
  const curl = `${curlRaw.replace(/^\/+/, "").replace(/\/+$/, "")}/`;
  const mid = extractScriptVar(scriptText, "DM5_MID");
  const viewSignDt = extractScriptVar(scriptText, "DM5_VIEWSIGN_DT");
  const viewSign = extractScriptVar(scriptText, "DM5_VIEWSIGN");
  const key = extractScriptVar(scriptText, "DM5_KEY") || dm5KeyFallback;

  if (imageCount <= 0 && paywalled) {
    return {
      chapterID,
      seriesSlug: parseSeriesSlug(comicHref, curlRaw),
      imgList: [
        {
          chapter: chapterID,
          cid,
          href: buildDm5PaywallHref(chapterID),
          key,
          src: "",
          type: "paywall",
        },
      ],
    };
  }

  return {
    chapterID,
    seriesSlug: parseSeriesSlug(comicHref, curlRaw),
    imgList: Array.from({ length: imageCount }, (_v, k) => ({
      src:
        `${baseURL}/${curl}chapterfun.ashx?` +
        `cid=${cid}` +
        `&page=${k + 1}` +
        `&key=` +
        `&language=1` +
        `&gtk=6` +
        `&_cid=${cid}` +
        `&_mid=${mid}` +
        `&_dt=${encodeURIComponent(viewSignDt).replace(/%20/g, "+")}` +
        `&_sign=${viewSign}`,
      chapter: chapterID,
      cid,
      key,
    })),
  };
}

function hasValidChapterPageMeta(meta: Dm5ChapterPageMeta) {
  return (
    Boolean(meta.seriesSlug) &&
    Boolean(meta.chapterID) &&
    meta.imgList.length > 0 &&
    meta.imgList.every((item) =>
      item.type === "paywall"
        ? Boolean(item.href)
        : Boolean(item.cid) && Boolean(item.src),
    )
  );
}

function assertValidChapterPageMeta(
  meta: Dm5ChapterPageMeta | null,
  chapterID: string,
) {
  if (meta && hasValidChapterPageMeta(meta)) {
    return meta;
  }
  throw new Error(`Unable to parse DM5 chapter metadata for ${chapterID}.`);
}

export function parseDm5ChapterPage(
  html: string,
  chapterID: string,
): Dm5ChapterPageMeta {
  const domMeta = parseDomChapterPage(html, chapterID);
  if (domMeta) {
    try {
      return assertValidChapterPageMeta(domMeta, chapterID);
    } catch {
      // Fall through to the string parser when DOM extraction is incomplete.
    }
  }
  return assertValidChapterPageMeta(parseHtmlChapterPage(html, chapterID), chapterID);
}
