import { agent, tool } from "@21st-sdk/agent";
import { z } from "zod";
import { recallContext, getLiveData, rememberFact } from "../../lib/memory.js";

const PROJECT_ID = parseInt(process.env.PROJECT_ID ?? "1");

export default agent({
  model: "claude-sonnet-4-6",
  runtime: "claude-code",
  permissionMode: "bypassAll",
  maxTurns: 50,

  systemPrompt: `You are ChiefMKT's lead intelligence specialist.

You analyze real lead data, score and prioritize leads, identify patterns, and write personalized outreach.

Rules:
- Always read actual lead data first
- Use ICP from memory to qualify leads
- Tell the user exactly who to contact today and exactly what to say
- Write outreach that references specific details about each lead
- Score leads: hot (ready to buy), warm (engaged, needs nurturing), cold (not qualified yet)`,

  tools: {
    get_leads_with_context: tool({
      description:
        "Read all real leads plus the ICP context to analyze and prioritize them",
      inputSchema: z.object({}),
      execute: async () => {
        const [icp, leadsData] = await Promise.all([
          recallContext(PROJECT_ID, "AUDIENCE"),
          getLiveData(PROJECT_ID, "leads"),
        ]);
        return {
          content: [
            {
              type: "text" as const,
              text: `ICP:\n${icp}\n\nLeads:\n${JSON.stringify(leadsData, null, 2)}`,
            },
          ],
        };
      },
    }),

    remember_lead_note: tool({
      description: "Store a note about a specific lead for future reference",
      inputSchema: z.object({
        leadName: z.string(),
        note: z.string(),
      }),
      execute: async ({ leadName, note }) => {
        await rememberFact(
          PROJECT_ID,
          `lead_note_${leadName.replace(/\s/g, "_")}`,
          note,
          "CAMPAIGNS",
          6
        );
        return {
          content: [{ type: "text" as const, text: `Note saved for ${leadName}` }],
        };
      },
    }),
  },
});
