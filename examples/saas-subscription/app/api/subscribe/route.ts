import { subscribe } from "@/lib/perly";

/** POST {email} (JSON or a form). JSON gets { invoice, subscription, url }; a form is sent to the invoice. */
export async function POST(request: Request) {
  const form = request.headers.get("content-type")?.includes("application/json") ? null : await request.formData();
  const email = String(form ? form.get("email") ?? "" : ((await request.json()) as { email?: string }).email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: "email required" }, { status: 400 });
  const result = await subscribe(email);
  return form ? Response.redirect(result.url, 303) : Response.json(result);
}
