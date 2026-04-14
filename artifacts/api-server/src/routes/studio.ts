import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { studioProjectsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AI_SYSTEM_PROMPT = `You are a marketing website builder AI inside ChiefMKT Studio. Your job is to generate clean, responsive HTML+inline CSS components that will be inserted into a GrapesJS visual editor.

RULES:
1. Return ONLY valid HTML with inline styles. No external CSS, no <style> tags, no JavaScript.
2. Use inline styles on every element. GrapesJS needs inline styles to be editable.
3. Make everything responsive using max-width, flexbox with flex-wrap, and relative units.
4. Use modern, professional design patterns. Think high-converting landing pages.
5. Use real-looking placeholder content — never "Lorem ipsum". Write actual marketing copy.
6. Color palette: Use professional gradients and modern colors. Default primary: #7c3aed (purple).
7. Always include proper spacing (padding, margin) for visual breathing room.
8. Structure your HTML with semantic sections.
9. For images, use placeholder divs with background colors or reference https://placehold.co/

RESPOND in this JSON format:
{
  "message": "Brief explanation of what you generated and suggestions for next steps",
  "generatedHtml": "<section>...your generated HTML here...</section>"
}

If the user asks for copy improvements, analysis, or non-HTML tasks, set generatedHtml to null and just provide your advice in the message field.`;

// ─── List studio projects ───────────────────────────────────────────────────
router.get("/studio/projects", async (req: Request, res: Response) => {
  const projectId = parseInt(req.query.projectId as string) || 1;
  const projects = await db
    .select()
    .from(studioProjectsTable)
    .where(eq(studioProjectsTable.projectId, projectId))
    .orderBy(desc(studioProjectsTable.updatedAt));
  res.json({ projects });
});

// ─── Save (create or update) a studio project ───────────────────────────────
router.post("/studio/projects/save", async (req: Request, res: Response) => {
  const { id, name, projectType, projectData, projectId = 1 } = req.body;

  if (id) {
    // Update
    const [updated] = await db
      .update(studioProjectsTable)
      .set({
        name: name || "Untitled Project",
        projectType: projectType || "web",
        projectData: projectData || {},
        updatedAt: new Date(),
      })
      .where(and(eq(studioProjectsTable.id, id), eq(studioProjectsTable.projectId, projectId)))
      .returning();
    return res.json({ project: updated });
  }

  // Create
  const [created] = await db
    .insert(studioProjectsTable)
    .values({
      projectId,
      name: name || "Untitled Project",
      projectType: projectType || "web",
      projectData: projectData || {},
    })
    .returning();
  res.status(201).json({ project: created });
});

// ─── Load a single studio project ───────────────────────────────────────────
router.get("/studio/projects/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const projectId = parseInt(req.query.projectId as string) || 1;

  const [project] = await db
    .select()
    .from(studioProjectsTable)
    .where(and(eq(studioProjectsTable.id, id), eq(studioProjectsTable.projectId, projectId)));

  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json({ project });
});

// ─── Delete a studio project ─────────────────────────────────────────────────
router.delete("/studio/projects/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(studioProjectsTable).where(eq(studioProjectsTable.id, id));
  res.json({ ok: true });
});

// ─── AI Generate ─────────────────────────────────────────────────────────────
router.post("/studio/ai/generate", async (req: Request, res: Response) => {
  const { message, conversationHistory = [] } = req.body;

  if (!message) return res.status(400).json({ error: "message required" });

  if (!process.env.ANTHROPIC_API_KEY) {
    // Demo fallback when key not set
    return res.json({
      message: "Here's a hero section for you! You can click 'Insert into Editor' to add it to your canvas, then click any element to edit it.",
      generatedHtml: `<section style="padding:80px 20px;text-align:center;background:linear-gradient(135deg,#7c3aed 0%,#2563eb 100%);color:white;"><h1 style="font-size:48px;font-weight:800;margin-bottom:16px;line-height:1.1;">Grow Your Business<br/>with AI-Powered Marketing</h1><p style="font-size:20px;max-width:580px;margin:0 auto 36px;opacity:.9;">ChiefMKT gives you all the tools you need to attract, convert, and retain customers — in one powerful platform.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;"><a href="#" style="display:inline-block;padding:16px 32px;background:white;color:#7c3aed;border-radius:10px;font-weight:700;text-decoration:none;font-size:16px;">Start Free Trial</a><a href="#" style="display:inline-block;padding:16px 32px;background:rgba(255,255,255,.15);color:white;border:2px solid rgba(255,255,255,.4);border-radius:10px;font-weight:700;text-decoration:none;font-size:16px;">Watch Demo</a></div></section>`,
    });
  }

  try {
    const messages: Anthropic.MessageParam[] = [
      ...(conversationHistory as Array<{ role: "user" | "assistant"; content: string }>).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: AI_SYSTEM_PROMPT,
      messages,
    });

    const responseText = response.content
      .filter(b => b.type === "text")
      .map(b => (b as Anthropic.TextBlock).text)
      .join("");

    let parsed: { message: string; generatedHtml: string | null };
    try {
      const cleaned = responseText.replace(/```json\n?|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { message: responseText, generatedHtml: null };
    }

    res.json(parsed);
  } catch (err) {
    console.error("Studio AI error:", err);
    res.status(500).json({ message: "AI generation failed. Please try again.", generatedHtml: null });
  }
});

export default router;
