import { portal } from "@/lib/perly";

/** POST email (a form) → Perly Pay's customer portal: pay the open renewal, prepay, cancel. */
export async function POST(request: Request) {
  const email = String((await request.formData()).get("email") ?? "").trim().toLowerCase();
  if (!email) return Response.json({ error: "email required" }, { status: 400 });
  return Response.redirect(await portal(email), 303);
}
