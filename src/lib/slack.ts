import { createHmac, timingSafeEqual } from "crypto";
import type { KlipyGif } from "./klipy";

export async function verifySlackRequest(
  body: string,
  timestamp: string | null,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !timestamp || !signature) return false;

  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    "v0=" +
    createHmac("sha256", secret).update(sigBasestring).digest("hex");

  return timingSafeEqual(
    Buffer.from(mySignature, "utf-8"),
    Buffer.from(signature, "utf-8")
  );
}

export async function openModal(
  triggerId: string,
  query: string,
  channelId: string
): Promise<string> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");

  const res = await fetch("https://slack.com/api/views.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trigger_id: triggerId,
      view: {
        type: "modal",
        title: { type: "plain_text", text: "Klipy GIFs" },
        close: { type: "plain_text", text: "Close" },
        private_metadata: JSON.stringify({ channel_id: channelId, query }),
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Searching for *"${query}"*...`,
            },
          },
        ],
      },
    }),
  });

  const data = await res.json();
  console.log(`[slack] views.open ok=${data.ok} error=${data.error || "none"}`);
  if (!data.ok) {
    throw new Error(`Slack views.open error: ${data.error}`);
  }
  return data.view.id;
}

export async function updateModal(
  viewId: string,
  blocks: unknown[],
  query: string,
  channelId: string
) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");

  const res = await fetch("https://slack.com/api/views.update", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      view_id: viewId,
      view: {
        type: "modal",
        title: { type: "plain_text", text: "Klipy GIFs" },
        close: { type: "plain_text", text: "Close" },
        private_metadata: JSON.stringify({ channel_id: channelId, query }),
        blocks,
      },
    }),
  });

  const data = await res.json();
  console.log(`[slack] views.update ok=${data.ok} error=${data.error || "none"}`);
  if (!data.ok) {
    throw new Error(`Slack views.update error: ${data.error}`);
  }
}

export function buildGifPickerModalBlocks(
  gifs: KlipyGif[],
  query: string,
  nextPage: number | null
) {
  const blocks: unknown[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Results for "${query}":*`,
      },
    },
  ];

  if (gifs.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `No GIFs found for "${query}". Try a different search!`,
      },
    });
    return blocks;
  }

  for (const gif of gifs) {
    // Section with small thumbnail on the right + Send button below
    blocks.push({
      type: "section",
      block_id: `gif_section_${gif.id}`,
      text: {
        type: "mrkdwn",
        text: `*${gif.title}*`,
      },
      accessory: {
        type: "image",
        image_url: gif.preview,
        alt_text: gif.title,
      },
    });
    blocks.push({
      type: "actions",
      block_id: `gif_actions_${gif.id}`,
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Send this GIF" },
          style: "primary",
          action_id: "send_gif",
          value: JSON.stringify({
            url: gif.url,
            title: gif.title,
            query,
          }),
        },
      ],
    });
  }

  if (nextPage) {
    blocks.push({
      type: "actions",
      block_id: "load_more_actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Load more GIFs" },
          action_id: "load_more",
          value: JSON.stringify({ query, page: nextPage }),
        },
      ],
    });
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: "Powered by Klipy" }],
  });

  return blocks;
}

export function buildGifMessageBlocks(
  gifUrl: string,
  title: string,
  userId: string
) {
  return [
    {
      type: "image",
      image_url: gifUrl,
      alt_text: title,
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Posted by <@${userId}> via /klipy`,
        },
      ],
    },
  ];
}

export async function postMessage(
  channel: string,
  blocks: unknown[],
  text: string
) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, blocks, text }),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
  return data;
}
