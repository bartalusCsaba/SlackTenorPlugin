const TENOR_API_BASE = "https://tenor.googleapis.com/v2";

export interface TenorGif {
  id: string;
  title: string;
  url: string; // gif URL
  preview: string; // smaller preview URL
  width: number;
  height: number;
}

export interface TenorSearchResult {
  gifs: TenorGif[];
  next: string; // pagination token
}

interface TenorMediaFormat {
  url: string;
  dims: [number, number];
  size: number;
}

interface TenorResult {
  id: string;
  title: string;
  media_formats: {
    gif: TenorMediaFormat;
    tinygif: TenorMediaFormat;
    mediumgif?: TenorMediaFormat;
  };
}

interface TenorSearchResponse {
  results: TenorResult[];
  next: string;
}

export async function searchGifs(
  query: string,
  limit = 20,
  pos?: string
): Promise<TenorSearchResult> {
  const apiKey = process.env.TENOR_API_KEY;
  if (!apiKey) {
    throw new Error("TENOR_API_KEY is not set");
  }

  const params = new URLSearchParams({
    q: query,
    key: apiKey,
    client_key: "slack-tenor-plugin",
    limit: String(limit),
    media_filter: "gif,tinygif,mediumgif",
  });

  if (pos) {
    params.set("pos", pos);
  }

  const res = await fetch(`${TENOR_API_BASE}/search?${params}`);
  if (!res.ok) {
    throw new Error(`Tenor API error: ${res.status} ${res.statusText}`);
  }

  const data: TenorSearchResponse = await res.json();

  return {
    gifs: data.results.map((r) => ({
      id: r.id,
      title: r.title || query,
      url: r.media_formats.gif.url,
      preview: r.media_formats.tinygif.url,
      width: r.media_formats.gif.dims[0],
      height: r.media_formats.gif.dims[1],
    })),
    next: data.next,
  };
}
