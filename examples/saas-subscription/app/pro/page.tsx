import Link from "next/link";
import { access } from "@/lib/perly";

/** The paid page. It asks Perly Pay on every visit; the redirect back from checkout proves nothing. */
export default async function Pro({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const { user } = await searchParams; // the demo's "login": a real app reads its session here
  if (!user) {
    return (
      <form>
        <input name="user" type="email" required placeholder="you@example.com" />
        <button type="submit">Open Pro</button>
      </form>
    );
  }
  const { has_access, ends_at } = await access(user);
  if (!has_access) {
    return (
      <main>
        <h1>Not yet</h1>
        <p>No paid period for {user}. If you just paid, it unlocks once the payment is confirmed — refresh in a minute.</p>
        <Link href="/">Subscribe</Link>
      </main>
    );
  }
  return (
    <main>
      <h1>Pro</h1>
      <p>Welcome, {user}. Paid until {ends_at ? new Date(ends_at).toUTCString() : "forever"}.</p>
      <form action="/api/portal" method="post">
        <input type="hidden" name="email" value={user} />
        <button type="submit">Manage or renew</button>
      </form>
    </main>
  );
}
