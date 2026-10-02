export const runtime = "nodejs";

const CHALLENGE_TOKEN = "cwhr55qB93KZRwbd2NqmzmAKpA37c";

export async function GET() {
  return new Response(CHALLENGE_TOKEN, {
    headers: { "Content-Type": "text/plain" },
  });
}
