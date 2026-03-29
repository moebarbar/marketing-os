import { agent, tool } from "@21st-sdk/agent";
import { z } from "zod";
import { recallContext, getLiveData, rememberFact, updateLeadScore, addLead, getSingleLead, getRecentActivity, markLeadContacted } from "../../lib/memory.js";

const PROJECT_ID = parseInt(process.env.PROJECT_ID ?? "1");

export default agent({
  model: "claude-sonnet-4-6",
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

    update_lead_score: tool({
      description:
        "Update a lead's score and status in the database after analysis. Use this to persist your scoring so the platform reflects it.",
      inputSchema: z.object({
        leadId: z.number().describe("The numeric ID of the lead"),
        score: z.number().min(0).max(10).describe("Score from 0-10"),
        status: z.enum(["new", "contacted", "qualified", "disqualified", "converted"]).optional(),
      }),
      execute: async ({ leadId, score, status }) => {
        await updateLeadScore(PROJECT_ID, leadId, score, status);
        return {
          content: [{ type: "text" as const, text: `Updated lead ${leadId}: score=${score}${status ? `, status=${status}` : ""}` }],
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

    add_lead: tool({
      description: "Create a new lead in the database directly from conversation. Use when the user mentions a new contact or prospect.",
      inputSchema: z.object({
        email: z.string().describe("Lead's email address"),
        name: z.string().optional().describe("Full name"),
        company: z.string().optional().describe("Company name"),
        source: z.string().optional().describe("Where this lead came from e.g. linkedin, referral, cold_outreach"),
        score: z.number().min(0).max(100).optional().describe("Initial lead score 0-100"),
      }),
      execute: async ({ email, name, company, source, score }) => {
        const lead = await addLead(PROJECT_ID, email, name, company, source, score);
        return {
          content: [{ type: "text" as const, text: `Lead created: ${lead.name ?? lead.email} (ID: ${lead.id})` }],
        };
      },
    }),

    get_single_lead: tool({
      description: "Look up a specific lead by email address or name.",
      inputSchema: z.object({
        identifier: z.string().describe("Email address or partial name to search for"),
      }),
      execute: async ({ identifier }) => {
        const lead = await getSingleLead(PROJECT_ID, identifier);
        if (!lead) {
          return { content: [{ type: "text" as const, text: `No lead found matching: ${identifier}` }] };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(lead, null, 2) }],
        };
      },
    }),

    list_recent_activity: tool({
      description: "Show recent leads, content, and SEO activity from the last N days.",
      inputSchema: z.object({
        days: z.number().min(1).max(30).default(7),
      }),
      execute: async ({ days }) => {
        const activity = await getRecentActivity(PROJECT_ID, days);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(activity, null, 2) }],
        };
      },
    }),

    send_outreach_email: tool({
      description: "Send a personalised outreach email to a lead using Resend. Use when you've written an email and the user wants to send it now.",
      inputSchema: z.object({
        to: z.string().describe("Recipient email address"),
        subject: z.string().describe("Email subject line"),
        body: z.string().describe("Full email body text"),
        leadId: z.number().optional().describe("Lead ID to mark as contacted after sending"),
      }),
      execute: async ({ to, subject, body, leadId }) => {
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL ?? "ChiefMKT <onboarding@resend.dev>";

        if (!apiKey) {
          return { content: [{ type: "text" as const, text: "Resend not configured. Add RESEND_API_KEY to Railway environment variables." }] };
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ from: fromEmail, to, subject, text: body, html: body.replace(/\n/g, "<br/>") }),
        });

        if (!res.ok) {
          const err = await res.text();
          return { content: [{ type: "text" as const, text: `Failed to send: ${err}` }] };
        }

        if (leadId) await markLeadContacted(PROJECT_ID, leadId);

        return { content: [{ type: "text" as const, text: `Email sent to ${to}${leadId ? ` — lead ${leadId} marked as contacted` : ""}` }] };
      },
    }),

    mark_lead_contacted: tool({
      description: "Mark a lead's status as 'contacted' after reaching out to them.",
      inputSchema: z.object({
        leadId: z.number().describe("The numeric ID of the lead"),
      }),
      execute: async ({ leadId }) => {
        await markLeadContacted(PROJECT_ID, leadId);
        return { content: [{ type: "text" as const, text: `Lead ${leadId} marked as contacted.` }] };
      },
    }),
  },
});
