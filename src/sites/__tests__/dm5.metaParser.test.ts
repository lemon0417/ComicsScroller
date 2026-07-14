import {
  parseDm5LegacyMeta,
  parseDm5RssMetaStrict,
} from "@sites/dm5/metaParser";

describe("dm5 metadata parsers", () => {
  it("keeps only DM5 m-number chapter links from RSS", () => {
    const rssXml = `
      <rss>
        <channel>
          <title>Demo</title>
          <item><title>WWW</title><link>https://www.dm5.com/m100/</link></item>
          <item><title>Tel</title><link>https://tel.dm5.com/m200/</link></item>
          <item><title>Relative</title><link>/m300/</link></item>
          <item><title>External</title><link>https://example.com/m400/</link></item>
          <item><title>Series</title><link>https://www.dm5.com/manhua-demo/</link></item>
        </channel>
      </rss>
    `;

    expect(parseDm5RssMetaStrict(rssXml)).toEqual({
      title: "Demo",
      chapterList: ["m100", "m200", "m300"],
      chapters: {
        m100: { title: "WWW", href: "https://www.dm5.com/m100/" },
        m200: { title: "Tel", href: "https://tel.dm5.com/m200/" },
        m300: { title: "Relative", href: "https://www.dm5.com/m300/" },
      },
    });
  });

  it("rejects RSS metadata when every chapter link is invalid", () => {
    const rssXml = `
      <rss>
        <channel>
          <title>Invalid</title>
          <item><link>https://example.com/m400/</link></item>
          <item><link>https://www.dm5.com/manhua-demo/</link></item>
        </channel>
      </rss>
    `;

    expect(() => parseDm5RssMetaStrict(rssXml)).toThrow(
      "DM5 RSS metadata did not include any usable chapter links.",
    );
  });

  it("applies the same chapter validation to legacy DOM parsing", () => {
    const html = `
      <div class="banner_detail">
        <div class="info"><span class="title">Legacy Demo</span></div>
      </div>
      <div id="chapterlistload">
        <li><a href="/m3/">Chapter 3</a></li>
        <li><a href="https://example.com/m2/">External</a></li>
        <li><a href="/manhua-demo/">Series</a></li>
      </div>
    `;

    const meta = parseDm5LegacyMeta(html);

    expect(meta.chapterList).toEqual(["m3"]);
    expect(meta.chapters).toEqual({
      m3: { title: "Chapter 3", href: "https://www.dm5.com/m3/" },
    });
  });

  it("keeps legacy chapter validation without DOMParser", () => {
    const originalParser = globalThis.DOMParser;
    (globalThis as any).DOMParser = undefined;
    const html = `
      <title>Legacy Demo</title>
      <div id="chapterlistload">
        <li><a href="/m3/">Chapter 3</a></li>
        <li><a href="/manhua-demo/">Series</a></li>
      </div>
    `;

    try {
      const meta = parseDm5LegacyMeta(html);
      expect(meta.chapterList).toEqual(["m3"]);
      expect(meta.chapters.m3.href).toBe("https://www.dm5.com/m3/");
    } finally {
      (globalThis as any).DOMParser = originalParser;
    }
  });
});
