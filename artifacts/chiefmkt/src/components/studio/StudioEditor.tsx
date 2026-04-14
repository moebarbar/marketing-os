import { useEffect, useRef } from "react";
// @ts-ignore — GrapesJS Studio SDK
import StudioSDK from "@grapesjs/studio-sdk/react";
// @ts-ignore
import "@grapesjs/studio-sdk/style";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const LICENSE_KEY = "cca161261a21406b853fb23eb511216774ebba381ef547639d52b9bb223a8512";

interface StudioEditorProps {
  studioProjectId: number | null;
  projectType: "web" | "email";
  onEditorReady?: (editor: any) => void;
  onSave?: (projectData: unknown) => void;
}

export default function StudioEditor({
  studioProjectId,
  projectType,
  onEditorReady,
  onSave,
}: StudioEditorProps) {
  const editorRef = useRef<any>(null);

  const defaultHtml =
    projectType === "web"
      ? `<section style="padding:80px 20px;text-align:center;background:linear-gradient(135deg,#7c3aed 0%,#2563eb 100%);color:white;"><h1 style="font-size:48px;font-weight:800;margin-bottom:16px;">Your Headline Here</h1><p style="font-size:20px;max-width:600px;margin:0 auto 32px;opacity:.9;">Subheadline that explains your value proposition in one clear sentence.</p><a href="#" style="display:inline-block;padding:16px 32px;background:white;color:#7c3aed;border-radius:10px;font-weight:700;text-decoration:none;">Get Started Free</a></section>`
      : `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;"><h2 style="color:#1e293b;font-size:28px;margin-bottom:12px;">Your Email Headline</h2><p style="color:#475569;font-size:16px;line-height:1.6;">Write your email body here. Keep it concise and value-driven.</p><a href="#" style="display:inline-block;margin-top:20px;padding:14px 28px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-weight:600;">Click Here</a></div>`;

  return (
    <div className="w-full h-full">
      <StudioSDK
        options={{
          licenseKey: LICENSE_KEY,

          project: {
            type: projectType,
            id: studioProjectId ? `studio_${studioProjectId}` : `new_${Date.now()}`,
            default: {
              pages: [{ name: "Page 1", component: defaultHtml }],
            },
          },

          identity: { id: "chiefmkt_user" },

          storage: {
            type: "self",
            autosaveChanges: 30,
            autosaveIntervalMs: 10000,
            onSave: async ({ project }: { project: unknown }) => {
              if (!studioProjectId) return;
              try {
                await fetch(`${BASE}/api/studio/projects/save`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: studioProjectId,
                    projectData: project,
                    projectId: 1,
                  }),
                });
                if (onSave) onSave(project);
              } catch (err) {
                console.error("Studio autosave failed:", err);
              }
            },
            onLoad: async () => {
              if (!studioProjectId) return { project: { pages: [{ name: "Page 1", component: defaultHtml }] } };
              try {
                const r = await fetch(`${BASE}/api/studio/projects/${studioProjectId}?projectId=1`);
                if (r.ok) {
                  const { project } = await r.json();
                  return { project: project.projectData };
                }
              } catch {
                // fall through to default
              }
              return { project: { pages: [{ name: "Page 1", component: defaultHtml }] } };
            },
          },

          plugins: [
            (editor: any) => {
              const { Blocks } = editor;

              // ── Marketing Blocks ────────────────────────────────────────
              Blocks.add("hero-section", {
                label: "Hero",
                category: { id: "marketing", label: "Marketing", open: true },
                media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
                content: `<section style="padding:80px 20px;text-align:center;background:linear-gradient(135deg,#7c3aed 0%,#2563eb 100%);color:white;"><h1 style="font-size:48px;font-weight:800;margin-bottom:16px;line-height:1.1;">Your Compelling Headline</h1><p style="font-size:20px;max-width:600px;margin:0 auto 32px;opacity:.9;">A subheadline that clearly explains the value you deliver to customers.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;"><a href="#" style="display:inline-block;padding:16px 32px;background:white;color:#7c3aed;border-radius:10px;font-weight:700;text-decoration:none;">Start Free Trial</a><a href="#" style="display:inline-block;padding:16px 32px;border:2px solid rgba(255,255,255,.5);color:white;border-radius:10px;font-weight:700;text-decoration:none;">Watch Demo</a></div></section>`,
              });

              Blocks.add("cta-section", {
                label: "CTA Section",
                category: "marketing",
                content: `<section style="padding:64px 20px;text-align:center;background:#f8fafc;"><h2 style="font-size:36px;font-weight:800;color:#1e293b;margin-bottom:12px;">Ready to get started?</h2><p style="font-size:18px;color:#64748b;margin-bottom:28px;">Join thousands of marketers who trust ChiefMKT to grow their business.</p><a href="#" style="display:inline-block;padding:16px 36px;background:#7c3aed;color:white;border-radius:10px;font-weight:700;text-decoration:none;font-size:18px;">Get Started Free</a></section>`,
              });

              Blocks.add("features-grid", {
                label: "Features Grid",
                category: "marketing",
                content: `<section style="padding:64px 20px;"><h2 style="text-align:center;font-size:36px;font-weight:800;color:#1e293b;margin-bottom:48px;">Everything You Need</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:32px;max-width:1000px;margin:0 auto;"><div style="text-align:center;padding:24px;"><div style="font-size:40px;margin-bottom:16px;">🚀</div><h3 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px;">Fast Setup</h3><p style="color:#64748b;line-height:1.6;">Launch your campaigns in minutes, not weeks.</p></div><div style="text-align:center;padding:24px;"><div style="font-size:40px;margin-bottom:16px;">🎯</div><h3 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px;">AI Targeting</h3><p style="color:#64748b;line-height:1.6;">Smart audience targeting powered by machine learning.</p></div><div style="text-align:center;padding:24px;"><div style="font-size:40px;margin-bottom:16px;">📊</div><h3 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px;">Analytics</h3><p style="color:#64748b;line-height:1.6;">Track every metric that matters for your growth.</p></div></div></section>`,
              });

              Blocks.add("pricing-table", {
                label: "Pricing Table",
                category: "marketing",
                content: `<section style="padding:64px 20px;"><h2 style="text-align:center;font-size:36px;font-weight:800;color:#1e293b;margin-bottom:48px;">Simple Pricing</h2><div style="display:flex;gap:24px;max-width:800px;margin:0 auto;flex-wrap:wrap;justify-content:center;"><div style="flex:1;min-width:240px;padding:32px;border:1px solid #e2e8f0;border-radius:16px;text-align:center;"><h3 style="font-size:20px;font-weight:700;margin-bottom:8px;">Starter</h3><p style="font-size:42px;font-weight:800;margin:16px 0;">$29<span style="font-size:16px;color:#94a3b8;">/mo</span></p><ul style="list-style:none;padding:0;margin:24px 0;text-align:left;color:#475569;"><li style="padding:8px 0;border-bottom:1px solid #f1f5f9;">✓ 5 Landing Pages</li><li style="padding:8px 0;border-bottom:1px solid #f1f5f9;">✓ Email Builder</li><li style="padding:8px 0;">✓ Basic Analytics</li></ul><a href="#" style="display:block;padding:12px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-weight:600;">Choose Plan</a></div><div style="flex:1;min-width:240px;padding:32px;border:2px solid #7c3aed;border-radius:16px;text-align:center;position:relative;"><span style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:#7c3aed;color:white;padding:4px 20px;border-radius:20px;font-size:12px;font-weight:700;">POPULAR</span><h3 style="font-size:20px;font-weight:700;margin-bottom:8px;">Pro</h3><p style="font-size:42px;font-weight:800;margin:16px 0;">$79<span style="font-size:16px;color:#94a3b8;">/mo</span></p><ul style="list-style:none;padding:0;margin:24px 0;text-align:left;color:#475569;"><li style="padding:8px 0;border-bottom:1px solid #f1f5f9;">✓ Unlimited Pages</li><li style="padding:8px 0;border-bottom:1px solid #f1f5f9;">✓ AI Content Gen</li><li style="padding:8px 0;">✓ Advanced Analytics</li></ul><a href="#" style="display:block;padding:12px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-weight:600;">Choose Plan</a></div></div></section>`,
              });

              Blocks.add("testimonials", {
                label: "Testimonials",
                category: "marketing",
                content: `<section style="padding:64px 20px;background:#f8fafc;"><h2 style="text-align:center;font-size:36px;font-weight:800;color:#1e293b;margin-bottom:48px;">What Customers Say</h2><div style="display:flex;gap:24px;max-width:900px;margin:0 auto;flex-wrap:wrap;"><div style="flex:1;min-width:260px;background:white;padding:28px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);"><p style="color:#475569;font-size:16px;line-height:1.7;margin-bottom:20px;">"This platform completely transformed how we approach marketing. Our revenue grew 3x in 6 months."</p><div style="display:flex;align-items:center;gap:12px;"><div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#2563eb);"></div><div><strong style="color:#1e293b;">Sarah Johnson</strong><div style="color:#94a3b8;font-size:14px;">CEO, TechStart</div></div></div></div><div style="flex:1;min-width:260px;background:white;padding:28px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);"><p style="color:#475569;font-size:16px;line-height:1.7;margin-bottom:20px;">"The AI features save us 20+ hours per week. It's like having an entire marketing team on-demand."</p><div style="display:flex;align-items:center;gap:12px;"><div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#0891b2);"></div><div><strong style="color:#1e293b;">Mark Chen</strong><div style="color:#94a3b8;font-size:14px;">CMO, GrowthLabs</div></div></div></div></div></section>`,
              });

              Blocks.add("lead-form", {
                label: "Lead Form",
                category: "marketing",
                content: `<div style="max-width:480px;margin:40px auto;padding:36px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);"><h3 style="font-size:24px;font-weight:800;color:#1e293b;text-align:center;margin-bottom:8px;">Get Your Free Guide</h3><p style="color:#64748b;text-align:center;margin-bottom:24px;">Join 10,000+ marketers who get our weekly insights.</p><input type="text" placeholder="Full Name" style="width:100%;padding:12px 16px;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:15px;box-sizing:border-box;"/><input type="email" placeholder="Email Address" style="width:100%;padding:12px 16px;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;font-size:15px;box-sizing:border-box;"/><button style="width:100%;padding:14px;background:#7c3aed;color:white;border:none;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;">Download Free Guide →</button><p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:12px;">No spam. Unsubscribe anytime.</p></div>`,
              });

              Blocks.add("faq-section", {
                label: "FAQ",
                category: "marketing",
                content: `<section style="padding:64px 20px;max-width:680px;margin:0 auto;"><h2 style="font-size:36px;font-weight:800;color:#1e293b;text-align:center;margin-bottom:40px;">Frequently Asked Questions</h2><div style="border-bottom:1px solid #e2e8f0;padding:20px 0;"><h4 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:8px;">How does the free trial work?</h4><p style="color:#64748b;line-height:1.6;">You get full access for 14 days. No credit card required. Cancel anytime.</p></div><div style="border-bottom:1px solid #e2e8f0;padding:20px 0;"><h4 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:8px;">Can I cancel anytime?</h4><p style="color:#64748b;line-height:1.6;">Yes, cancel your subscription at any time with no penalties or fees.</p></div><div style="padding:20px 0;"><h4 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:8px;">Do you offer refunds?</h4><p style="color:#64748b;line-height:1.6;">We offer a 30-day money-back guarantee on all plans, no questions asked.</p></div></section>`,
              });

              Blocks.add("navbar", {
                label: "Navigation",
                category: { id: "layout", label: "Layout" },
                content: `<nav style="display:flex;align-items:center;justify-content:space-between;padding:16px 32px;background:white;box-shadow:0 1px 3px rgba(0,0,0,.08);"><div style="font-size:22px;font-weight:800;color:#7c3aed;">YourBrand</div><div style="display:flex;gap:28px;align-items:center;"><a href="#" style="text-decoration:none;color:#475569;font-weight:500;">Features</a><a href="#" style="text-decoration:none;color:#475569;font-weight:500;">Pricing</a><a href="#" style="text-decoration:none;color:#475569;font-weight:500;">About</a><a href="#" style="padding:10px 22px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-weight:600;">Sign Up</a></div></nav>`,
              });

              Blocks.add("footer", {
                label: "Footer",
                category: "layout",
                content: `<footer style="padding:48px 32px 24px;background:#1e293b;color:#94a3b8;"><div style="display:flex;gap:40px;flex-wrap:wrap;max-width:1000px;margin:0 auto;"><div style="flex:1;min-width:200px;"><h4 style="color:white;font-weight:700;margin-bottom:16px;">YourBrand</h4><p style="font-size:14px;line-height:1.6;">Building the future of marketing, one page at a time.</p></div><div style="flex:1;min-width:140px;"><h4 style="color:white;font-weight:700;margin-bottom:16px;">Product</h4><a href="#" style="display:block;color:#94a3b8;text-decoration:none;margin-bottom:8px;font-size:14px;">Features</a><a href="#" style="display:block;color:#94a3b8;text-decoration:none;margin-bottom:8px;font-size:14px;">Pricing</a><a href="#" style="display:block;color:#94a3b8;text-decoration:none;font-size:14px;">Changelog</a></div><div style="flex:1;min-width:140px;"><h4 style="color:white;font-weight:700;margin-bottom:16px;">Company</h4><a href="#" style="display:block;color:#94a3b8;text-decoration:none;margin-bottom:8px;font-size:14px;">About</a><a href="#" style="display:block;color:#94a3b8;text-decoration:none;margin-bottom:8px;font-size:14px;">Blog</a><a href="#" style="display:block;color:#94a3b8;text-decoration:none;font-size:14px;">Contact</a></div></div><div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #334155;font-size:13px;">© 2026 YourBrand. All rights reserved.</div></footer>`,
              });

              // ── Export handler ──────────────────────────────────────────
              editor.onReady(() => {
                if (onEditorReady) onEditorReady(editor);
              });
            },
          ],
        }}
      />
    </div>
  );
}
