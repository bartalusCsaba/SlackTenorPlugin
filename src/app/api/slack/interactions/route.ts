import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  verifySlackRequest,
  buildGifMessageBlocks,
  postMessage,
  updateModal,
  buildGifPickerModalBlocks,
} from "@/lib/slack";
import { searchGifs } from "@/lib/klipy";

interface SlackAction {
  action_id: string;
  value?: string;
}

interface SlackInteractionPayload {
  type: string;
  user: { id: string; username: string };
  actions: SlackAction[];
  view?: {
    id: string;
    private_metadata: string;
  };
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

  if (payload.type === "block_actions" && payload.view) {
    const action = payload.actions[0];
    const { channel_id, query } = JSON.parse(payload.view.private_metadata);
    const viewId = payload.view.id;

    // User picked a GIF — post it to the channel
    if (action.action_id.startsWith("send_gif_") && action.value) {
      const { url, title } = JSON.parse(action.value);
      const userId = payload.user.id;

      after(async () => {
        try {
          const blocks = buildGifMessageBlocks(url, title, userId);
          await postMessage(channel_id, blocks, `${title} (via /klipy)`);

          // Update modal to confirm
          await updateModal(
            viewId,
            [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*GIF sent!* You posted *${title}* to the channel.`,
                },
              },
            ],
            query,
            channel_id
          );
        } catch (err) {
          console.error("Failed to send GIF:", err);
        }
      });

      return new NextResponse(null, { status: 200 });
    }

    // User wants more GIFs
    if (action.action_id === "load_more" && action.value) {
      const { query: loadQuery, page } = JSON.parse(action.value);

      after(async () => {
        try {
          const { gifs, nextPage } = await searchGifs(loadQuery, 10, page);
          const blocks = buildGifPickerModalBlocks(gifs, loadQuery, nextPage);
          await updateModal(viewId, blocks, loadQuery, channel_id);
        } catch (err) {
          console.error("Failed to load more GIFs:", err);
        }
      });

      return new NextResponse(null, { status: 200 });
    }
  }

  return NextResponse.json({ ok: true });
}
