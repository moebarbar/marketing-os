import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { chatWidgetSettingsTable, chatConversationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/chat-widget/settings", async (req, res) => {
  const projectId = req.projectId!;
  const [settings] = await db
    .select()
    .from(chatWidgetSettingsTable)
    .where(eq(chatWidgetSettingsTable.projectId, projectId));

  if (!settings) {
    const [created] = await db
      .insert(chatWidgetSettingsTable)
      .values({ projectId })
      .returning();
    return res.json(created);
  }

  return res.json(settings);
});

router.put("/chat-widget/settings", async (req, res) => {
  const { isEnabled, welcomeMessage, botName, primaryColor, position, qualifyLeads, captureEmail } = req.body;
  const projectId = req.projectId!;

  const [existing] = await db
    .select()
    .from(chatWidgetSettingsTable)
    .where(eq(chatWidgetSettingsTable.projectId, projectId));

  if (existing) {
    const [updated] = await db
      .update(chatWidgetSettingsTable)
      .set({ isEnabled, welcomeMessage, botName, primaryColor, position, qualifyLeads, captureEmail, updatedAt: new Date() })
      .where(eq(chatWidgetSettingsTable.projectId, projectId))
      .returning();
    return res.json(updated);
  }

  const [created] = await db
    .insert(chatWidgetSettingsTable)
    .values({ projectId, isEnabled, welcomeMessage, botName, primaryColor, position, qualifyLeads, captureEmail })
    .returning();
  return res.json(created);
});

router.get("/chat-widget/conversations", async (req, res) => {
  const projectId = req.projectId!;
  const conversations = await db
    .select()
    .from(chatConversationsTable)
    .where(eq(chatConversationsTable.projectId, projectId))
    .orderBy(chatConversationsTable.lastMessageAt);
  res.json(conversations);
});

export default router;
