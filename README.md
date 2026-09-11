# H5P AI capability layer (MCP) — first version

Turn learning content into an interactive **H5P activity** from inside any AI assistant,
then export a standard `.h5p` file. First activity type: **Question Set** (multiple-choice quiz).
ChatGPT is the first interface; Claude and other MCP clients connect to the same server.

This repo is both the Sherpa-B project workspace (`journey.md`, `reports/`, `specs/`) and
the app itself.

## Two entry points

| Path | What it is | Needs |
|---|---|---|
| `/api/mcp` | **The product.** A standard MCP server. The AI assistant writes the questions from the user's content and calls `create_h5p_quiz`; the server builds the `.h5p` and returns a download link (+ an inline preview in ChatGPT). Works with any MCP client. | Nothing — the assistant is the model |
| `/` + `/api/demo` | **Demo harness.** Stands in for the AI assistant with a direct OpenAI call so the full flow can be shown without connecting a real client. | `OPENAI_API_KEY` |

Both paths share one builder: `lib/h5p/buildQuiz.ts` → a valid, self-contained `.h5p`
(runtime libraries vendored in `lib/h5p/vendor/h5p-libraries.zip`, sourced from the
official H5P Hub bundle).

## Run locally

```bash
npm install
cp .env.example .env        # add your OPENAI_API_KEY for the demo page
npm run dev                 # http://localhost:3000
```

- Demo page: <http://localhost:3000>
- MCP endpoint: `http://localhost:3000/api/mcp`

### Try the MCP server in an AI client

```bash
npx @modelcontextprotocol/inspector
# connect to http://localhost:3000/api/mcp (Streamable HTTP), call create_h5p_quiz
```

To connect it to **Claude Code, Claude Desktop, or ChatGPT Plus** (plans + exact steps):
see [`docs/testing-in-ai-clients.md`](docs/testing-in-ai-clients.md).

## Scripts

- `npm run h5p:libraries` — refresh the vendored H5P runtime libraries from the H5P Hub
- `npm run h5p:smoke` — build a sample quiz and structurally validate the `.h5p`

## Deploy

Hosted on Vercel. `OPENAI_API_KEY` is set as a project env var (demo page only).
