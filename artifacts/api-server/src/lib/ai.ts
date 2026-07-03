import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { agentMemory } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "./logger.js";

// Central AI service — the single place the platform talks to the Anthropic API.
// Cost model (see PLAN.md): deterministic code gathers data for free; Claude is
// called once per feature with a bounded max_tokens. Sonnet for user-facing
// generation, Haiku for cheap classification/summarization.
export const MODELS = {
  generation: "claude-sonnet-5",
  fast: "claude-haiku-4-5",
} as const;

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export function aiAvailable(): boolean {
  return client !== null;
}

export interface GenerateOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  model?: keyof typeof MODELS;
}

// Returns the generated text, or null when no API key is configured or the
// call fails — callers degrade to their deterministic fallback.
export async function generateText({ system, prompt, maxTokens = 3000, model = "generation" }: GenerateOptions): Promise<string | null> {
  if (!client) return null;
  try {
    const response = await client.messages.create({
      model: MODELS[model],
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("");
  } catch (err) {
    logger.error({ err, model: MODELS[model] }, "AI generation failed");
    return null;
  }
}

// Business context from agent memory, injected into generation prompts so
// output reflects the project's brand/audience instead of generic copy.
export async function getProjectContext(projectId: number): Promise<string> {
  try {
    const memories = await db
      .select({ category: agentMemory.category, key: agentMemory.key, value: agentMemory.value })
      .from(agentMemory)
      .where(eq(agentMemory.projectId, projectId))
      .orderBy(desc(agentMemory.importance))
      .limit(10);
    if (!memories.length) return "";
    return `\n\nBusiness context (use it to tailor the output):\n${memories
      .map((m) => `- [${m.category}] ${m.key}: ${m.value}`)
      .join("\n")}`;
  } catch {
    return "";
  }
}
