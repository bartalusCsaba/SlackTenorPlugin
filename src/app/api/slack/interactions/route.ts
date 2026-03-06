import { NextRequest, NextResponse } from "next/server";
import { verifySlackRequest, buildGifMessageBlocks, postMessage } from "@/lib/slack";

interface SlackAction {
  action_id: string;
  value: string;
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
    const action = payload.actions.find((a) => a.action_id === "send_gif");
    if (action) {
      const { url, title } = JSON.parse(action.value);
      const userId = payload.user.id;
      const channelId = payload.channel.id;

      const blocks = buildGifMessageBlocks(url, title, userId);

      // Post the GIF publicly to the channel
      await postMessage(channelId, blocks, `${title} (via /tenor)`);

      // Delete the ephemeral picker message
      await fetch(payload.response_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delete_original: true,
        }),
      });

      return new NextResponse(null, { status: 200 });
    }
  }

  return NextResponse.json({ ok: true });
}
