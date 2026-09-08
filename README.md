# H5P ChatGPT App — first version

Turn learning content into an interactive **H5P activity** without leaving the chat,
then export a standard `.h5p` file. First activity type: **Question Set** (multiple-choice quiz).

This repo is both the Sherpa-B project workspace (`journey.md`, `reports/`, `specs/`) and
the app itself.

## Two entry points

| Path | What it is | Needs |
|---|---|---|
| `/api/mcp` | **The product.** An MCP server = a ChatGPT App. ChatGPT writes the questions from the user's content and calls `create_h5p_quiz`; the server builds the `.h5p` and returns an inline preview + download. | Nothing — ChatGPT is the model |
| `/` + `/api/demo` | **Demo harness.** Stands in for ChatGPT with a direct OpenAI call so the full flow can be shown without a paid ChatGPT developer-mode account. | `OPENAI_API_KEY` |

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

### Try the MCP server without ChatGPT

```bash
npx @modelcontextprotocol/inspector
# connect to http://localhost:3000/api/mcp (Streamable HTTP), call create_h5p_quiz
```

## Scripts

- `npm run h5p:libraries` — refresh the vendored H5P runtime libraries from the H5P Hub
- `npm run h5p:smoke` — build a sample quiz and structurally validate the `.h5p`

## Deploy

Hosted on Vercel. `OPENAI_API_KEY` is set as a project env var (demo page only).
