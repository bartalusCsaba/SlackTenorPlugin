# Slack Klipy Plugin

A Slack slash command that lets you search and post GIFs from [Klipy](https://klipy.com) directly in your channels.

Type `/klipy funny cat`, pick a GIF from the results, and it gets posted to the channel.

## How it works

1. `/klipy <query>` triggers a search on the Klipy GIF API
2. You get an ephemeral message with 20 GIF previews and "Send this GIF" buttons
3. Scroll through and click one to post the full GIF publicly to the channel
4. Hit "Load more GIFs" to fetch the next 20 results

Built with Next.js (App Router) and deployable as a Vercel serverless function.

## Setup

### 1. Klipy API Key

- Sign up at [partner.klipy.com](https://partner.klipy.com/api-keys)
- Create an API key

### 2. Slack App

- Create a new app at [api.slack.com/apps](https://api.slack.com/apps)
- **Slash Command**: Add `/klipy` with the request URL `https://<your-domain>/api/slack/klipy`
- **Interactivity**: Enable and set the URL to `https://<your-domain>/api/slack/interactions`
- **Bot Token Scopes** (OAuth & Permissions): `chat:write`, `commands`
- Install the app to your workspace

### 3. Environment Variables

```
KLIPY_API_KEY=your_klipy_api_key
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
```

Set these in `.env.local` for local dev, or in your Vercel project settings for production.

### 4. Deploy

```bash
# Local development
npm install
npm run dev

# Deploy to Vercel
npx vercel
```

Or connect the GitHub repo in the [Vercel dashboard](https://vercel.com/new) for automatic deploys.

## Project Structure

```
src/
  app/
    api/slack/
      klipy/route.ts           # /klipy slash command handler
      interactions/route.ts    # Button click handler
  lib/
    klipy.ts                   # Klipy GIF API wrapper
    slack.ts                   # Slack signature verification + Block Kit builders
```
