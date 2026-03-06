import { NextRequest, NextResponse } from "next/server";
import { verifySlackRequest, buildGifPickerBlocks } from "@/lib/slack";
import { searchGifs } from "@/lib/tenor";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");

  const valid = await verifySlackRequest(body, timestamp, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(body);
  const query = params.get("text")?.trim();
  const responseUrl = params.get("response_url");

  if (!query) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Usage: `/tenor funny cat` — search for a GIF and post it to the channel.",
    });
  }

  // Acknowledge immediately (Slack requires response within 3s)
  // Then send the actual results via response_url
  sendGifResults(query, responseUrl!).catch((err) =>
    console.error("Failed to send GIF results:", err)
  );

  return NextResponse.json({
    response_type: "ephemeral",
    text: `Searching for "${query}"...`,
  });
}

async function sendGifResults(
  query: string,
  responseUrl: string,
  pos?: string
) {
  const { gifs, next } = await searchGifs(query, 20, pos);

  if (gifs.length === 0) {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "ephemeral",
        replace_original: true,
        text: `No GIFs found for "${query}". Try a different search!`,
      }),
    });
    return;
  }

  const blocks = buildGifPickerBlocks(gifs, query, next);

  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      response_type: "ephemeral",
      replace_original: true,
      blocks,
      text: `GIF results for "${query}"`,
    }),
  });
}

// Exported so the interactions route can reuse it for "Load more"
export { sendGifResults };
