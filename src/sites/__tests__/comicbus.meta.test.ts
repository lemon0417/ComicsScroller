import { fetchMeta$ } from "@sites/comicbus/meta";
import { getSiteChapterFetcher } from "@sites/registry";
import { firstValueFrom } from "rxjs";

describe("comicbus fetchMeta$", () => {
  const originalFetch = globalThis.fetch;
  const originalParser = globalThis.DOMParser;

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    (globalThis as any).DOMParser = originalParser;
  });

  it("parses metadata without DOMParser", async () => {
    const html = `
      <html>
        <head><title>ComicBus Demo, online</title></head>
        <body>
          <span class="ch" onclick="openComic('comic-123.html?ch=1')">Chapter 1</span>
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
      fetchMeta$("http://www.comicbus.com/html/123.html"),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://www.comicbus.com/html/123.html",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result).toEqual({
      title: "ComicBus Demo",
      cover: "http://www.comicbus.com/pics/0/123.jpg",
      chapterList: ["comic-123.html?ch=1"],
      chapters: {
        "comic-123.html?ch=1": {
          title: "Chapter 1",
          href: "http://www.comicbus.com/online/comic-123.html?ch=1",
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
      firstValueFrom(fetchMeta$("http://www.comicbus.com/html/123.html")),
    ).rejects.toThrow("ComicBus metadata request failed: 503");
  });

  it("projects HTML metadata to a chapter-only snapshot", async () => {
    const html = `
      <html>
        <head><title>ComicBus Demo, online</title></head>
        <body>
          <span class="ch" onclick="openComic('comic-123.html?ch=1')">Chapter 1</span>
        </body>
      </html>
    `;
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(html),
    });
    (globalThis as any).DOMParser = undefined;

    const fetchChapters = getSiteChapterFetcher("comicbus");
    await expect(
      firstValueFrom(fetchChapters!("http://www.comicbus.com/html/123.html")),
    ).resolves.toEqual({
      chapterList: ["comic-123.html?ch=1"],
      chapters: {
        "comic-123.html?ch=1": {
          title: "Chapter 1",
          href: "http://www.comicbus.com/online/comic-123.html?ch=1",
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
      "http://www.comicbus.com/html/123.html",
    ).subscribe();
    subscription.unsubscribe();

    expect(requestSignal?.aborted).toBe(true);
    await Promise.resolve();
  });
});
