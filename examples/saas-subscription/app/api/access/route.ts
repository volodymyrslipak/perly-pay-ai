import { access } from "@/lib/perly";
import { store } from "@/lib/store";

/** GET ?user=<email> → what Perly Pay says, and what the webhook told us. */
export async function GET(request: Request) {
  const user = new URL(request.url).searchParams.get("user")?.toLowerCase();
  if (!user) return Response.json({ error: "user required" }, { status: 400 });
  return Response.json({ ...(await access(user)), webhook: store.subscriptions.get(user) ?? null });
}
