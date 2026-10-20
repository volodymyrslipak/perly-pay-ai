/**
 * The app's licence: activate a key on this machine, check it on start,
 * free the seat. Uses LicenseClient — the public license endpoints — so
 * this code is safe to ship: there is no secret key in it.
 */
import { ConnectionError, LicenseClient } from "perly-pay";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { hostname } from "node:os";

export interface Saved {
  key: string;
  activation: string;
  instance_name: string;
  checked_at: number;
}

const OFFLINE_GRACE_MS = 7 * 24 * 3600 * 1000;

export function licenseFile(): string {
  return process.env.LICENSE_FILE ?? ".license.json";
}

export function product(): string {
  const id = process.env.PERLY_PAY_PRODUCT_ID;
  if (!id) throw new Error("Set PERLY_PAY_PRODUCT_ID (printed by npm run setup).");
  return id;
}

const client = () => new LicenseClient({ baseUrl: process.env.PERLY_PAY_API || undefined });

export function load(): Saved | null {
  if (!existsSync(licenseFile())) return null;
  try {
    return JSON.parse(readFileSync(licenseFile(), "utf8")) as Saved;
  } catch {
    return null;
  }
}

/** A name for this machine that stays the same run after run, so one device is one activation. */
function instanceName(): string {
  return load()?.instance_name ?? `${hostname()}-${randomUUID().slice(0, 8)}`;
}

export async function activate(key: string): Promise<{ ok: true; saved: Saved } | { ok: false; reason: string }> {
  const instance_name = instanceName();
  const result = await client().activate({ key: key.trim(), product: product(), instance_name });
  if (!result.valid || !result.activation) return { ok: false, reason: result.reason ?? "not_valid" };
  const saved: Saved = { key: key.trim(), activation: result.activation.id, instance_name, checked_at: Date.now() };
  writeFileSync(licenseFile(), JSON.stringify(saved, null, 2));
  return { ok: true, saved };
}

/** Pro or not. Offline, the last good answer holds for a week; a definite "no" locks at once. */
export async function check(): Promise<{ pro: boolean; why: string }> {
  const saved = load();
  if (!saved) return { pro: false, why: "no license on this machine" };
  try {
    const result = await client().validate({ key: saved.key, product: product(), instance: saved.activation });
    if (!result.valid) return { pro: false, why: result.reason ?? "not valid" };
    writeFileSync(licenseFile(), JSON.stringify({ ...saved, checked_at: Date.now() }, null, 2));
    return { pro: true, why: "valid" };
  } catch (error) {
    if (error instanceof ConnectionError && Date.now() - saved.checked_at < OFFLINE_GRACE_MS) return { pro: true, why: "offline, last check was good" };
    throw error;
  }
}

export async function deactivate(): Promise<void> {
  const saved = load();
  if (!saved) return;
  await client().deactivate({ key: saved.key, product: product(), instance: saved.activation });
  rmSync(licenseFile());
}
