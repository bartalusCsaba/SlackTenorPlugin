const KLIPY_API_BASE = "https://api.klipy.com/api/v1";

export interface KlipyGif {
  id: string;
  title: string;
  url: string; // full gif URL
  preview: string; // smaller preview URL
}

export interface KlipySearchResult {
  gifs: KlipyGif[];
  nextPage: number | null;
}

interface KlipyFileVariant {
  url: string;
  width: number;
  height: number;
  size: number;
}

interface KlipyGifItem {
  id: number;
  title: string;
  slug: string;
  file: {
    hd: { gif: KlipyFileVariant; webp: KlipyFileVariant; mp4: KlipyFileVariant };
    md: { gif: KlipyFileVariant; webp: KlipyFileVariant; mp4: KlipyFileVariant };
    sm: { gif: KlipyFileVariant; webp: KlipyFileVariant; mp4: KlipyFileVariant };
    xs: { gif: KlipyFileVariant; webp: KlipyFileVariant; mp4: KlipyFileVariant };
  };
}

interface KlipySearchResponse {
  result: boolean;
  data: {
    data: KlipyGifItem[];
    current_page: number;
    per_page: number;
    has_next: boolean;
  };
}

export async function searchGifs(
  query: string,
  perPage = 20,
  page = 1
): Promise<KlipySearchResult> {
  const apiKey = process.env.KLIPY_API_KEY;
  if (!apiKey) {
    throw new Error("KLIPY_API_KEY is not set");
  }

  const params = new URLSearchParams({
    q: query,
    per_page: String(perPage),
    page: String(page),
  });

  const url = `${KLIPY_API_BASE}/${apiKey}/gifs/search?${params}`;
  console.log(`[klipy-api] Fetching: ${url.replace(apiKey, "***")}`);
  const res = await fetch(url);
  console.log(`[klipy-api] Status: ${res.status} ${res.statusText}`);
  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[klipy-api] Error body: ${errBody}`);
    throw new Error(`Klipy API error: ${res.status} ${res.statusText}`);
  }

  const data: KlipySearchResponse = await res.json();
  console.log(`[klipy-api] Results: ${data.data.data.length} gifs, page ${data.data.current_page}, has_next=${data.data.has_next}`);

  return {
    gifs: data.data.data.map((item) => ({
      id: String(item.id),
      title: item.title || query,
      url: item.file.md.gif.url,
      preview: item.file.sm.webp.url || item.file.sm.gif.url,
    })),
    nextPage: data.data.has_next ? data.data.current_page + 1 : null,
  };
}
