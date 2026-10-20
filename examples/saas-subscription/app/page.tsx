import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Pro — $9 a month</h1>
      <p>Pay with bitcoin, USDC or USDT. Each month you get an invoice and a reminder; nothing is taken from your wallet on its own.</p>
      <form action="/api/subscribe" method="post">
        <input name="email" type="email" required placeholder="you@example.com" />
        <button type="submit">Subscribe</button>
      </form>
      <p>
        Already subscribed? <Link href="/pro">Open Pro</Link>
      </p>
    </main>
  );
}
