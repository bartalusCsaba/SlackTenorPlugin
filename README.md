# Slack Tenor Plugin

A Slack slash command that lets you search and post GIFs from Tenor directly in your channels.

Type `/tenor funny cat`, pick a GIF from the results, and it gets posted to the channel.

## How it works

1. `/tenor <query>` triggers a search on the Tenor API
2. You get an ephemeral message with 5 GIF previews and "Send this GIF" buttons
3. Click one and it posts the full GIF publicly to the channel

Built with Next.js (App Router) and deployable as a Vercel serverless function.

## Setup

### 1. Tenor API Key

- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Enable the **Tenor API**
- Create an API key

### 2. Slack App

- Create a new app at [api.slack.com/apps](https://api.slack.com/apps)
- **Slash Command**: Add `/tenor` with the request URL `https://<your-domain>/api/slack/tenor`
- **Interactivity**: Enable and set the URL to `https://<your-domain>/api/slack/interactions`
- **Bot Token Scopes** (OAuth & Permissions): `chat:write`, `commands`
- Install the app to your workspace

### 3. Environment Variables

```
TENOR_API_KEY=your_tenor_api_key
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
      tenor/route.ts          # /tenor slash command handler
      interactions/route.ts    # Button click handler
  lib/
    tenor.ts                   # Tenor API wrapper
    slack.ts                   # Slack signature verification + Block Kit builders
```
