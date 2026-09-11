import { createHash } from "node:crypto";

/**
 * The Apps SDK sends an anonymized per-call user id in the MCP request's
 * `_meta["openai/subject"]` (confirmed against OpenAI's own developer docs -
 * see specs/feedback_loop_spec.md, "Lead-generation signal for h5p.com").
 * Other MCP clients (Claude Desktop, Inspector) send no equivalent, so this
 * is undefined for them - callers must handle a null anonUid.
 *
 * We never store the raw subject value: hash it (salted by our own secret,
 * distinct from OpenAI's own anonymization) so a leaked row can't be
 * correlated back to a specific ChatGPT account even if the salt leaked too.
 */
export function deriveAnonUid(meta: Record<string, unknown> | undefined): string | null {
  const subject = meta?.["openai/subject"];
  if (typeof subject !== "string" || !subject) return null;
  const salt = process.env.ANON_UID_SALT || "interactify-dev-salt";
  return createHash("sha256").update(salt).update(subject).digest("hex").slice(0, 32);
}
