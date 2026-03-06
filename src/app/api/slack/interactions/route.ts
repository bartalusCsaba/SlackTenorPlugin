import { NextRequest, NextResponse } from "next/server";
import {
  verifySlackRequest,
  buildGifMessageBlocks,
  buildGifPickerBlocks,
  postMessage,
} from "@/lib/slack";
import { searchGifs } from "@/lib/tenor";

interface SlackAction {
  action_id: string;
  value?: string;
}

interface SlackInteractionPayload {
  type: string;
  user: { id: string; username: string };
  channel: { id: string };
  actions: SlackAction[];
  response_url: string;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");

  const valid = await verifySlackRequest(body, timestamp, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(body);
  const payloadStr = params.get("payload");
  if (!payloadStr) {
    return NextResponse.json({ error: "No payload" }, { status: 400 });
  }

  const payload: SlackInteractionPayload = JSON.parse(payloadStr);

  if (payload.type === "block_actions") {
    const action = payload.actions[0];

    // User picked a GIF — post it to the channel
    if (action.action_id === "send_gif" && action.value) {
      const { url, title } = JSON.parse(action.value);
      const userId = payload.user.id;
      const channelId = payload.channel.id;

      const blocks = buildGifMessageBlocks(url, title, userId);
      await postMessage(channelId, blocks, `${title} (via /tenor)`);

      // Delete the ephemeral picker message
      await fetch(payload.response_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delete_original: true }),
      });

      return new NextResponse(null, { status: 200 });
    }

    // User wants more GIFs — fetch next page and replace message
    if (action.action_id === "load_more" && action.value) {
      const { query, pos } = JSON.parse(action.value);

      // Respond quickly, then send results async
      loadMoreGifs(query, pos, payload.response_url).catch((err) =>
        console.error("Failed to load more GIFs:", err)
      );

      return NextResponse.json({
        response_type: "ephemeral",
        replace_original: true,
        text: `Loading more GIFs for "${query}"...`,
      });
    }

    // User cancelled the search
    if (action.action_id === "cancel_search") {
      await fetch(payload.response_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delete_original: true }),
      });

      return new NextResponse(null, { status: 200 });
    }
  }

  return NextResponse.json({ ok: true });
}

async function loadMoreGifs(
  query: string,
  pos: string,
  responseUrl: string
) {
  const { gifs, next } = await searchGifs(query, 20, pos);

  if (gifs.length === 0) {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "ephemeral",
        replace_original: true,
        text: `No more GIFs found for "${query}". Try a different search!`,
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
      text: `More GIF results for "${query}"`,
    }),
  });
}
