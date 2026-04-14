import { useState } from "react";
import { Rocket, Check, Loader2, ExternalLink, Globe } from "lucide-react";

interface Props {
  projectId: number | null;
  projectName: string;
}

export default function DeployPanel({ projectId, projectName }: Props) {
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState("");

  const handle = async () => {
    if (!projectId) return;
    setDeploying(true);
    // Simulate deploy — in production this would call a deploy API
    await new Promise(r => setTimeout(r, 2000));
    const slug = subdomain || `studio-${projectId}`;
    setDeployedUrl(`https://${slug}.chiefmkt.com`);
    setDeploying(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#161b22]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#21262d]">
        <Rocket className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-[#c9d1d9]">Deploy</span>
      </div>

      <div className="p-4 space-y-4">
        {!projectId ? (
          <p className="text-sm text-[#8b949e]">Select or create a project first.</p>
        ) : (
          <>
            <div className="p-3 bg-[#0d1117] rounded-xl border border-[#21262d]">
              <p className="text-xs text-[#8b949e] mb-1">Publishing</p>
              <p className="text-sm font-semibold text-white truncate">{projectName}</p>
            </div>

            <div>
              <label className="text-xs text-[#8b949e] block mb-1.5">Subdomain (optional)</label>
              <div className="flex items-center">
                <input
                  value={subdomain}
                  onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="my-landing-page"
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-l-lg px-3 py-2 text-sm text-white placeholder-[#8b949e] focus:outline-none focus:border-emerald-500"
                />
                <span className="bg-[#21262d] border border-l-0 border-[#30363d] rounded-r-lg px-3 py-2 text-xs text-[#8b949e] whitespace-nowrap">
                  .chiefmkt.com
                </span>
              </div>
            </div>

            <button
              onClick={handle}
              disabled={deploying}
              className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {deploying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</>
              ) : (
                <><Rocket className="w-4 h-4" /> Publish to Web</>
              )}
            </button>

            {deployedUrl && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <Check className="w-4 h-4" /> Live!
                </div>
                <a
                  href={deployedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-400 hover:underline break-all"
                >
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  {deployedUrl}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}

            <div className="pt-4 border-t border-[#21262d]">
              <label className="text-xs text-[#8b949e] block mb-1.5">Custom Domain</label>
              <input
                placeholder="www.yourdomain.com"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#8b949e] focus:outline-none focus:border-emerald-500 mb-2"
              />
              <button className="w-full p-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded-lg text-sm transition-colors">
                Connect Domain
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
