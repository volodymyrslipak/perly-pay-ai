/**
 * What the webhook learned, in memory — a real app writes it to its
 * database (a row per event id, unique, so a repeated delivery is skipped).
 */
interface Store {
  events: Set<string>;
  subscriptions: Map<string, { subscription: string; status: string }>;
}

const g = globalThis as typeof globalThis & { __perlyDemoStore?: Store };
export const store: Store = (g.__perlyDemoStore ??= { events: new Set(), subscriptions: new Map() });
