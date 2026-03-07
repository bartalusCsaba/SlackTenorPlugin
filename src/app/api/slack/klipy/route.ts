import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  verifySlackRequest,
  openModal,
  updateModal,
  buildGifPickerModalBlocks,
} from "@/lib/slack";
import { searchGifs } from "@/lib/klipy";

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
  const triggerId = params.get("trigger_id");
  const channelId = params.get("channel_id");

  if (!query) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Usage: `/klipy funny cat` — search for a GIF and post it to the channel.",
    });
  }

  // Open modal with loading state immediately (before the 3s timeout)
  const viewId = await openModal(triggerId!, query, channelId!);

  // Fetch GIFs and update modal in background
  after(async () => {
    try {
      await loadAndShowGifs(query, viewId, channelId!);
    } catch (err) {
      console.error("Failed to load GIFs:", err);
    }
  });

  // Acknowledge slash command
  return new NextResponse(null, { status: 200 });
}

export async function loadAndShowGifs(
  query: string,
  viewId: string,
  channelId: string,
  page?: number
) {
  console.log(`[klipy] Searching for "${query}" (page=${page ?? 1})`);
  const { gifs, nextPage } = await searchGifs(query, 20, page);
  console.log(`[klipy] Found ${gifs.length} GIFs, nextPage=${nextPage}`);

  const blocks = buildGifPickerModalBlocks(gifs, query, nextPage);
  await updateModal(viewId, blocks, query, channelId);
}
