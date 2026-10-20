/**
 * An MCP server (stdio) whose tools cost credits bought with Perly Pay.
 *
 *   balance        free — credits left
 *   top_up         free — a link where a person buys a pack
 *   word_stats     1 credit — words, sentences, reading time
 *   summarize      3 credits — the first sentences of a text
 *
 * Add it to a client, e.g. Claude Code:
 *   claude mcp add paid-tools -- npx tsx /path/to/examples/paid-mcp-server/src/server.ts
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

try {
  process.loadEnvFile(new URL("../.env", import.meta.url).pathname);
} catch {}

const { balance, charge, topUpUrl } = await import("./credits.js");
const USER = process.env.MCP_USER_ID ?? "demo-user";

const server = new McpServer({ name: "perly-pay-paid-tools", version: "0.1.0" });
const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

server.registerTool("balance", { description: "Credits left for paid tools. Free." }, async () => text(`${await balance(USER)} credits left.`));

server.registerTool("top_up", { description: "A payment link where a person buys more credits (bitcoin, USDC or USDT). Free." }, async () =>
  text(`Buy credits here: ${await topUpUrl(USER)}`),
);

server.registerTool(
  "word_stats",
  { description: "Count words and sentences in a text and estimate reading time. Costs 1 credit.", inputSchema: { text: z.string().max(100_000) } },
  async ({ text: input }, extra) => {
    const refused = await charge(USER, 1, "word_stats", extra.requestId); // spend first, then work
    if (refused) return { ...text(refused), isError: true };
    const words = input.split(/\s+/).filter(Boolean).length;
    const sentences = input.split(/[.!?]+/).filter((s) => s.trim()).length;
    return text(`${words} words, ${sentences} sentences, about ${Math.max(1, Math.round(words / 230))} min to read.`);
  },
);

server.registerTool(
  "summarize",
  { description: "The first sentences of a text, as a short summary. Costs 3 credits.", inputSchema: { text: z.string().max(100_000), sentences: z.number().int().min(1).max(10).default(2) } },
  async ({ text: input, sentences }, extra) => {
    const refused = await charge(USER, 3, "summarize", extra.requestId);
    if (refused) return { ...text(refused), isError: true };
    return text((input.match(/[^.!?]+[.!?]+/g) ?? [input]).slice(0, sentences).join(" ").trim());
  },
);

await server.connect(new StdioServerTransport());
