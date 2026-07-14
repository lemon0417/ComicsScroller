import type { ChapterRecord } from "@domain/library";
import { XMLParser } from "fast-xml-parser";

import type { SiteMeta } from "../types";

const baseURL = "https://www.dm5.com";
const dm5ChapterHosts = new Set(["www.dm5.com", "tel.dm5.com"]);
const dm5ChapterPathRegex = /^\/(m\d+)\/?$/i;
const rssXmlParser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
});

const stripTags = (input: string) =>
  input
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function resolveDm5RssUrl(comicUrl: string) {
  try {
    const parsedUrl = new URL(comicUrl);
    const pathname = parsedUrl.pathname.replace(/^\/+|\/+$/g, "");
    if (!pathname.startsWith("manhua-")) {
      return comicUrl;
    }
    return `${parsedUrl.origin}/rss-${pathname.slice("manhua-".length)}/`;
  } catch {
    return comicUrl;
  }
}

const pickBlock = (source: string, marker: string) => {
  const idx = source.indexOf(marker);
  if (idx === -1) return source;
  return source.slice(idx, idx + 20000);
};

function parseDm5ChapterLink(rawUrl: string) {
  if (!rawUrl.trim()) {
    return null;
  }
  try {
    const parsedUrl = new URL(rawUrl, baseURL);
    const chapterMatch = dm5ChapterPathRegex.exec(parsedUrl.pathname);
    if (!dm5ChapterHosts.has(parsedUrl.hostname.toLowerCase()) || !chapterMatch) {
      return null;
    }
    return {
      chapterID: chapterMatch[1].toLowerCase(),
      href: parsedUrl.toString(),
    };
  } catch {
    return null;
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function toText(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function toRssItems(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.map((item) => toRecord(item));
  }
  if (value && typeof value === "object") {
    return [toRecord(value)];
  }
  return [];
}

const parseCoverFromDocument = (doc: Document) =>
  (
    doc.querySelector(
      ".banner_detail .cover > img",
    ) as HTMLImageElement | null
  )?.src || "";

const parseCoverFromHtml = (html: string) => {
  const coverMatch =
    /banner_detail[\s\S]*?class="cover"[\s\S]*?<img[^>]+src="([^"]+)"/i.exec(
      html,
    );
  return coverMatch ? coverMatch[1] : "";
};

const parseLegacyFromDocument = (doc: Document) => {
  const chapterNodes = doc.querySelectorAll<HTMLAnchorElement>(
    "#chapterlistload li > a",
  );
  const title = (
    doc.querySelector(".banner_detail .info > .title")?.textContent || ""
  )
    .trim()
    .split(/\s+/)[0];
  const cover = parseCoverFromDocument(doc);
  const chapterEntries = Array.from(chapterNodes).flatMap((node) => {
    const chapterLink = parseDm5ChapterLink(node.getAttribute("href") || "");
    return chapterLink
      ? [
          {
            ...chapterLink,
            title: node.textContent?.trim().replaceAll(/\s+/g, " ") || "",
          },
        ]
      : [];
  });
  const chapterList = chapterEntries.map(({ chapterID }) => chapterID);
  const chapters = chapterEntries.reduce<Record<string, ChapterRecord>>(
    (acc, { chapterID, href, title: chapterTitle }) => {
      acc[chapterID] = {
        title: chapterTitle,
        href,
      };
      return acc;
    },
    {},
  );
  return { title, cover, chapterList, chapters };
};

const parseLegacyFromHtml = (html: string) => {
  const block = pickBlock(html, "chapterlistload");
  const anchorRegex = /<a[^>]+href="\/(m\d+\/?)"[^>]*>([\s\S]*?)<\/a>/gi;
  const titleMatch =
    /banner_detail[\s\S]*?class="title"[^>]*>([^<]+)/i.exec(html) ||
    /<title>([^<]+)</i.exec(html);
  const title =
    stripTags(titleMatch ? titleMatch[1] : "").split(/\s+/)[0] || "";
  const cover = parseCoverFromHtml(html);

  const chapterList: string[] = [];
  const chapters: Record<string, ChapterRecord> = {};
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(block))) {
    const chapterLink = parseDm5ChapterLink(match[1]);
    const chapterTitle = stripTags(match[2]);
    if (!chapterLink) continue;
    chapterList.push(chapterLink.chapterID);
    chapters[chapterLink.chapterID] = {
      title: chapterTitle,
      href: chapterLink.href,
    };
  }
  return { title, cover, chapterList, chapters };
};

const parseRssMeta = (xml: string) => {
  const parsedXml = toRecord(rssXmlParser.parse(xml));
  const channel = toRecord(toRecord(parsedXml.rss).channel);
  const title = toText(channel.title);
  const chapterList: string[] = [];
  const chapters: Record<string, ChapterRecord> = {};

  for (const item of toRssItems(channel.item)) {
    const chapterLink = parseDm5ChapterLink(toText(item.link));
    if (!chapterLink) continue;
    chapterList.push(chapterLink.chapterID);
    chapters[chapterLink.chapterID] = {
      title: stripTags(toText(item.title)).replaceAll(/\s+/g, " "),
      href: chapterLink.href,
    };
  }

  return { title, chapterList, chapters };
};

export function parseDm5RssMetaStrict(xml: string) {
  const meta = parseRssMeta(xml);
  if (meta.chapterList.length === 0) {
    throw new Error("DM5 RSS metadata did not include any usable chapter links.");
  }
  return meta;
}

export function parseDm5CoverMeta(html: string) {
  const Parser = globalThis.DOMParser;
  if (Parser) {
    const doc = new Parser().parseFromString(html, "text/html");
    return parseCoverFromDocument(doc);
  }
  return parseCoverFromHtml(html);
}

export function parseDm5LegacyMeta(html: string): SiteMeta {
  const Parser = globalThis.DOMParser;
  if (Parser) {
    const doc = new Parser().parseFromString(html, "text/html");
    return parseLegacyFromDocument(doc);
  }
  return parseLegacyFromHtml(html);
}
