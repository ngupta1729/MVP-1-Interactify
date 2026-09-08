# Testing the H5P app in AI clients

The product is an **MCP server**: `https://project2608b.vercel.app/api/mcp`
(local: `http://localhost:3000/api/mcp` when `npm run dev` is running).

One tool: `create_h5p_quiz` — you describe/paste content, the AI writes the questions and
calls the tool, you get back a `.h5p` download link. Refine by asking for changes; the AI
re-calls the tool.

Three ways to try it, cheapest first.

---

## 1. Claude Code — free, works right now

You already have Claude Code. Add the deployed server:

```bash
claude mcp add --transport http h5p https://project2608b.vercel.app/api/mcp
```

Check it connected:

```bash
claude mcp list
```

Then in a Claude Code chat: *"use the h5p tool to turn these notes into a quiz: <paste a
paragraph>"*, then *"make question 2 harder"*, then open the download URL it gives you.

No inline card — Claude Code shows the tool result as text + the link. Proves the core
flow and the "any MCP client" claim for $0.

Remove it later with: `claude mcp remove h5p`

---

## 2. Claude Desktop — GUI

### Option A — config file (any plan, uses the `mcp-remote` bridge)

Edit (create if missing):
`C:\Users\ngupt\AppData\Roaming\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "h5p": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://project2608b.vercel.app/api/mcp"]
    }
  }
}
```

Fully quit Claude Desktop (system tray → Quit) and reopen it. The `h5p` tools appear in the
tools menu (the slider/plug icon in the chat box). Try: *"Use h5p to make a 5-question quiz
about the water cycle."*

### Option B — native custom connector (Claude Pro / Max / Team, ~$20/mo)

Settings → **Connectors** → **Add custom connector** (may sit behind a Developer-mode / beta
toggle; wording varies by version) → name `H5P`, URL
`https://project2608b.vercel.app/api/mcp`, auth **None**. Enable it in a chat and prompt as
above.

### What renders

Claude Desktop shows the tool call + result and the download link. It does **not** render
our inline preview widget — that widget is `text/html+skybridge`, which is ChatGPT-specific.
Fine for testing create / refine / download.

---

## 3. ChatGPT Plus — the full experience ($20/mo)

Developer Mode (needed to add a custom MCP connector) is on **Plus, Pro, Business,
Enterprise/Edu** — **not** the free tier. Plus is enough.

1. **chatgpt.com** on the web (not mobile).
2. **Settings → Apps & Connectors → Advanced settings → enable Developer mode.**
3. **Add connector:** name `H5P`, MCP URL `https://project2608b.vercel.app/api/mcp`,
   Authentication **None**. Accept the beta warning.
4. **New chat → "+" / tools menu → enable `H5P`.**
5. Prompt: *"Use the H5P tool to turn these notes into a quiz: <paste>"*
6. Test: *"make question 2 harder"*, *"add a question about X"*, *"translate to Spanish"*,
   then click **Download .h5p** in the card.

### What to check

- Tool call + ChatGPT writing the questions + structured result + download — should all work.
- **The inline preview card** (`ui://widget/quiz.html`): renders in Developer Mode for a
  verified/published app; whether it renders for an *unverified* dev connector is the open
  question — verify this. If it doesn't, the tool + link still work.
- Whether the Download button works inside ChatGPT's iframe sandbox (it opens an absolute
  URL, so it should).

Publishing to the ChatGPT app directory is a **separate** review process — not needed for
personal testing.

---

## If the server isn't responding

- Confirm it's up: open `https://project2608b.vercel.app/api/mcp` — a bare GET returns a
  small JSON-RPC error, which means it's alive.
- Redeploy: `npx vercel deploy --prod --yes` from the repo root.
- Inspect directly: `npx @modelcontextprotocol/inspector` → Streamable HTTP →
  `https://project2608b.vercel.app/api/mcp` → call `create_h5p_quiz`.
