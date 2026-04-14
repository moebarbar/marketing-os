import { useState, useCallback, useRef, Suspense, lazy } from "react";
import StudioSidebar, { type StudioPanel } from "@/components/studio/StudioSidebar";
import StudioTopBar from "@/components/studio/StudioTopBar";
import AIChatPanel from "@/components/studio/AIChatPanel";
import ProjectPanel from "@/components/studio/ProjectPanel";
import DeployPanel from "@/components/studio/DeployPanel";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// Lazy-load GrapesJS to avoid SSR / heavy bundle issues
const StudioEditor = lazy(() => import("@/components/studio/StudioEditor"));

interface StudioProject {
  id: number;
  name: string;
  projectType: string;
  isPublished: boolean;
  publishedUrl?: string | null;
  updatedAt: string;
}

export default function Studio() {
  const [activePanel, setActivePanel] = useState<StudioPanel | null>("projects");
  const [currentProject, setCurrentProject] = useState<StudioProject | null>(null);
  const [projectType, setProjectType] = useState<"web" | "email">("web");
  const [saved, setSaved] = useState(true);
  const editorRef = useRef<any>(null);

  // ── Editor ready ───────────────────────────────────────────────────────────
  const handleEditorReady = useCallback((editor: any) => {
    editorRef.current = editor;
  }, []);

  // ── Inject AI HTML into canvas ────────────────────────────────────────────
  const handleInject = useCallback((html: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selected = editor.getSelected();
    const wrapper = editor.getWrapper();
    const target = selected || wrapper;
    target.append(html);
    const comps = target.components();
    const last = comps.at(comps.length - 1);
    if (last) editor.select(last);
  }, []);

  // ── Create new project ────────────────────────────────────────────────────
  const handleNewProject = useCallback(async (type: "web" | "email") => {
    const name = prompt(`Name your ${type === "web" ? "landing page" : "email template"}:`, "Untitled Project");
    if (!name) return;
    try {
      const r = await fetch(`${BASE}/api/studio/projects/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, projectType: type, projectId: 1 }),
      });
      const { project } = await r.json();
      setCurrentProject(project);
      setProjectType(type);
      setSaved(true);
    } catch {
      alert("Failed to create project. Please try again.");
    }
  }, []);

  // ── Select existing project ───────────────────────────────────────────────
  const handleSelectProject = useCallback((p: StudioProject) => {
    setCurrentProject(p);
    setProjectType(p.projectType as "web" | "email");
    setSaved(true);
    setActivePanel(null); // close panel to give editor full space
  }, []);

  // ── Toggle AI panel ───────────────────────────────────────────────────────
  const handleToggleAI = useCallback(() => {
    setActivePanel(prev => (prev === "ai" ? null : "ai"));
  }, []);

  // ── Save now (manual) ─────────────────────────────────────────────────────
  const handleSaveNow = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !currentProject) return;
    try {
      await fetch(`${BASE}/api/studio/projects/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentProject.id,
          projectData: editor.getProjectData(),
          projectId: 1,
        }),
      });
      setSaved(true);
    } catch {
      // silent
    }
  }, [currentProject]);

  return (
    <div className="flex h-screen w-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Left icon rail */}
      <StudioSidebar active={activePanel} onChange={setActivePanel} />

      {/* Expandable side panel */}
      {activePanel && (
        <div className="w-72 flex-shrink-0 border-r border-[#21262d] flex flex-col overflow-hidden">
          {activePanel === "projects" && (
            <ProjectPanel
              selectedId={currentProject?.id ?? null}
              onSelect={handleSelectProject}
              onNew={handleNewProject}
            />
          )}
          {activePanel === "ai" && (
            <AIChatPanel onInjectComponent={handleInject} onClose={() => setActivePanel(null)} />
          )}
          {activePanel === "deploy" && (
            <DeployPanel projectId={currentProject?.id ?? null} projectName={currentProject?.name ?? ""} />
          )}
          {(activePanel === "seo" || activePanel === "analytics" || activePanel === "templates") && (
            <div className="flex flex-col h-full bg-[#161b22]">
              <div className="px-4 py-3 border-b border-[#21262d]">
                <span className="text-sm font-semibold text-[#c9d1d9] capitalize">{activePanel}</span>
              </div>
              <div className="flex-1 flex items-center justify-center text-[#8b949e] text-sm p-8 text-center">
                <div>
                  <div className="text-3xl mb-3">🚧</div>
                  <p className="font-medium text-[#c9d1d9] mb-1 capitalize">{activePanel} Panel</p>
                  <p>Coming in the next build sprint.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StudioTopBar
          projectName={currentProject?.name ?? ""}
          saved={saved}
          onSaveNow={handleSaveNow}
          onToggleAI={handleToggleAI}
          onDeploy={() => setActivePanel("deploy")}
        />

        {/* Editor canvas */}
        <div className="flex-1 overflow-hidden">
          {currentProject ? (
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-[#0d1117]">
                <div className="text-center">
                  <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-[#8b949e] text-sm">Loading Studio Editor...</p>
                </div>
              </div>
            }>
              <StudioEditor
                studioProjectId={currentProject.id}
                projectType={projectType}
                onEditorReady={handleEditorReady}
                onSave={() => setSaved(true)}
              />
            </Suspense>
          ) : (
            // Empty state — no project selected
            <div className="w-full h-full flex items-center justify-center bg-[#0d1117]">
              <div className="text-center max-w-md px-8">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🎨</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">ChiefMKT Studio</h2>
                <p className="text-[#8b949e] mb-8 leading-relaxed">
                  Build high-converting landing pages, emails, and funnels with our AI-powered visual editor. No code required.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={() => handleNewProject("web")}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    New Landing Page
                  </button>
                  <button
                    onClick={() => setActivePanel("projects")}
                    className="px-5 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded-xl font-semibold transition-colors border border-[#30363d]"
                  >
                    Open Project
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
