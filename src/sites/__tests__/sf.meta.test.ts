import { fetchMeta$ } from "@sites/sf/meta";
import { getSiteChapterFetcher } from "@sites/registry";
import { firstValueFrom } from "rxjs";

describe("sf fetchMeta$", () => {
  const originalFetch = globalThis.fetch;
  const originalParser = globalThis.DOMParser;

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    (globalThis as any).DOMParser = originalParser;
  });

  it("parses metadata without DOMParser", async () => {
    const html = `
      <html>
        <head><title>SF Demo</title></head>
        <body>
          <div class="comic_cover"><img src="http://comic.sfacg.com/cover.jpg" /></div>
          <a href="/HTML/123/001/">Chapter 1</a>
        </body>
      </html>
    `;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(html),
    });
    (globalThis as any).fetch = fetchMock;
    (globalThis as any).DOMParser = undefined;

    const result = await firstValueFrom(
      fetchMeta$("http://comic.sfacg.com/HTML/123/"),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://comic.sfacg.com/HTML/123/",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result).toEqual({
      title: "SF Demo",
      cover: "http://comic.sfacg.com/cover.jpg",
      chapterList: ["HTML/123/001/"],
      chapters: {
        "HTML/123/001/": {
          title: "Chapter 1",
          href: "http://comic.sfacg.com/HTML/123/001/",
        },
      },
    });
  });

  it("rejects unsuccessful metadata responses", async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: jest.fn(),
    });

    await expect(
      firstValueFrom(fetchMeta$("http://comic.sfacg.com/HTML/123/")),
    ).rejects.toThrow("SF metadata request failed: 503");
  });

  it("projects HTML metadata to a chapter-only snapshot", async () => {
    const html = `
      <html>
        <head><title>SF Demo</title></head>
        <body>
          <div class="comic_cover"><img src="http://comic.sfacg.com/cover.jpg" /></div>
          <a href="/HTML/123/001/">Chapter 1</a>
        </body>
      </html>
    `;
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(html),
    });
    (globalThis as any).DOMParser = undefined;

    const fetchChapters = getSiteChapterFetcher("sf");
    await expect(
      firstValueFrom(fetchChapters!("http://comic.sfacg.com/HTML/123/")),
    ).resolves.toEqual({
      chapterList: ["HTML/123/001/"],
      chapters: {
        "HTML/123/001/": {
          title: "Chapter 1",
          href: "http://comic.sfacg.com/HTML/123/001/",
        },
      },
    });
  });

  it("aborts the metadata request when unsubscribed", async () => {
    let requestSignal: AbortSignal | undefined;
    (globalThis as any).fetch = jest.fn(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          requestSignal = options.signal as AbortSignal;
          requestSignal.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        }),
    );

    const subscription = fetchMeta$(
      "http://comic.sfacg.com/HTML/123/",
    ).subscribe();
    subscription.unsubscribe();

    expect(requestSignal?.aborted).toBe(true);
    await Promise.resolve();
  });
});
