import { useState, useEffect, useRef, useCallback } from "react";
import { Flame, RefreshCw, MousePointer, ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const PROJECT_ID = 1;

interface Click { x: number; y: number; }
interface HeatmapData { url: string; clicks: Click[]; }
interface PageRow { path: string; title: string; views: number; uniqueVisitors: number; }

function HeatmapCanvas({ clicks, width, height }: { clicks: Click[]; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (clicks.length === 0) return;

    // Draw each click as a radial gradient blob
    for (const c of clicks) {
      const cx = (c.x / 100) * width;
      const cy = (c.y / 100) * height;
      const r = Math.max(20, Math.min(60, width / 20));
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, "rgba(255, 60, 0, 0.25)");
      grad.addColorStop(0.5, "rgba(255, 200, 0, 0.08)");
      grad.addColorStop(1, "rgba(0, 0, 255, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(Math.max(0, cx - r), Math.max(0, cy - r), r * 2, r * 2);
    }

    // Apply a colorize pass using composite operations
    // Convert grayscale to heatmap colors
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;
      if (alpha < 0.01) continue;
      // Map alpha intensity to heatmap colors: blue -> green -> yellow -> red
      const t = Math.min(1, alpha * 4);
      if (t < 0.33) {
        data[i] = 0;
        data[i + 1] = Math.round(t / 0.33 * 255);
        data[i + 2] = 255;
      } else if (t < 0.66) {
        const tt = (t - 0.33) / 0.33;
        data[i] = Math.round(tt * 255);
        data[i + 1] = 255;
        data[i + 2] = Math.round((1 - tt) * 255);
      } else {
        const tt = (t - 0.66) / 0.34;
        data[i] = 255;
        data[i + 1] = Math.round((1 - tt) * 255);
        data[i + 2] = 0;
      }
      data[i + 3] = Math.round(alpha * 200);
    }
    ctx.putImageData(imageData, 0, 0);
  }, [clicks, width, height]);

  return (
    <canvas ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: "screen" }} />
  );
}

export default function Heatmaps() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [heatData, setHeatData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [heatLoading, setHeatLoading] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      setContainerSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, []);

  useEffect(() => {
    const obs = new ResizeObserver(measureContainer);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [measureContainer]);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${BASE}/api/analytics/pages?projectId=${PROJECT_ID}`);
        const data = await r.json();
        setPages(Array.isArray(data) ? data : []);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedUrl) { setHeatData(null); return; }
    const load = async () => {
      setHeatLoading(true);
      try {
        const r = await fetch(`${BASE}/api/analytics/heatmap?projectId=${PROJECT_ID}&url=${encodeURIComponent(selectedUrl)}`);
        setHeatData(await r.json());
      } catch { /* silent */ }
      setHeatLoading(false);
    };
    load();
  }, [selectedUrl]);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Flame className="w-8 h-8 text-primary" /> Heatmaps
        </h1>
        <p className="text-slate-400 mt-1">See where visitors click on your pages.</p>
      </div>

      {loading ? (
        <div className="h-64 glass-panel rounded-2xl flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Page list */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs text-slate-400 uppercase tracking-wider px-1">Tracked Pages</h3>
            {pages.length === 0 ? (
              <div className="glass-panel rounded-xl p-4 border border-slate-800 text-center">
                <MousePointer className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No click data yet. Install the tracking SDK to start recording clicks.</p>
              </div>
            ) : (
              pages.map((p, i) => (
                <button key={i} onClick={() => setSelectedUrl(p.title ?? p.path)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selectedUrl === (p.title ?? p.path) ? "bg-primary/10 border-primary" : "bg-slate-900/50 border-slate-800 hover:border-slate-600"}`}>
                  <div className={`text-sm font-medium truncate ${selectedUrl === (p.title ?? p.path) ? "text-primary" : "text-slate-200"}`}>{p.path}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.views} views · {p.uniqueVisitors} visitors</div>
                </button>
              ))
            )}

            {pages.length > 0 && !selectedUrl && (
              <p className="text-xs text-slate-500 px-1">Select a page to view its click heatmap.</p>
            )}
          </div>

          {/* Heatmap canvas area */}
          <div className="lg:col-span-3">
            {!selectedUrl ? (
              <div className="h-[500px] glass-panel rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-4 text-slate-500">
                <Flame className="w-16 h-16 text-slate-800" />
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-400">Select a page</div>
                  <p className="text-sm mt-1">Click a page on the left to view its heatmap</p>
                </div>
              </div>
            ) : heatLoading ? (
              <div className="h-[500px] glass-panel rounded-2xl border border-slate-800 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : heatData ? (
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white truncate">{selectedUrl}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{heatData.clicks.length} click events recorded (last 30 days)</div>
                  </div>
                  <a href={selectedUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {heatData.clicks.length === 0 ? (
                  <div className="h-[400px] flex flex-col items-center justify-center gap-3 text-slate-500">
                    <MousePointer className="w-10 h-10 text-slate-700" />
                    <div className="text-center">
                      <div className="font-medium text-slate-400">No click data for this page</div>
                      <p className="text-sm mt-1">Clicks will appear here once visitors interact with the page.</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative bg-slate-950" ref={containerRef} style={{ height: "480px" }}>
                    {/* Page wireframe */}
                    <div className="absolute inset-0 opacity-10 p-6 space-y-3 pointer-events-none">
                      <div className="h-8 bg-slate-400 rounded w-3/4" />
                      <div className="h-4 bg-slate-600 rounded w-full" />
                      <div className="h-4 bg-slate-600 rounded w-5/6" />
                      <div className="h-4 bg-slate-600 rounded w-4/6" />
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="h-24 bg-slate-600 rounded" />
                        <div className="h-24 bg-slate-600 rounded" />
                        <div className="h-24 bg-slate-600 rounded" />
                      </div>
                      <div className="h-10 bg-primary rounded w-32 mt-4" />
                    </div>

                    {/* Click dots */}
                    {heatData.clicks.map((c, i) => (
                      <div key={i}
                        className="absolute w-2 h-2 rounded-full bg-orange-500/50 -translate-x-1 -translate-y-1 pointer-events-none"
                        style={{ left: `${c.x}%`, top: `${c.y}%` }} />
                    ))}

                    {/* Heatmap overlay */}
                    <HeatmapCanvas clicks={heatData.clicks} width={containerSize.width} height={containerSize.height} />

                    {/* Legend */}
                    <div className="absolute bottom-3 right-3 bg-slate-900/80 rounded-lg px-3 py-2 border border-slate-700 flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500" />
                      <span className="text-[10px] text-slate-400">Low → High</span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
