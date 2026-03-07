export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <h1>Slack Klipy Plugin</h1>
      <p>This is the backend for the Slack Klipy GIF plugin. There is no web UI.</p>
      <h2>Setup</h2>
      <ol>
        <li>Create a Slack App at <a href="https://api.slack.com/apps">api.slack.com/apps</a></li>
        <li>Add a Slash Command: <code>/klipy</code> pointing to <code>{'https://<your-domain>/api/slack/klipy'}</code></li>
        <li>Enable Interactivity and set the URL to <code>{'https://<your-domain>/api/slack/interactions'}</code></li>
        <li>Add Bot Token Scopes: <code>chat:write</code>, <code>commands</code></li>
        <li>Install the app to your workspace</li>
        <li>Set environment variables: <code>KLIPY_API_KEY</code>, <code>SLACK_SIGNING_SECRET</code>, <code>SLACK_BOT_TOKEN</code></li>
      </ol>
    </main>
  );
}
