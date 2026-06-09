/**
 * Layout for /agents/* pages.
 * These pages host the agent surface full-screen — no studio chrome needed.
 * The API key is available via the fal_key cookie which StandaloneShell sets.
 */
export const metadata = {
  title: "Agent Chat — Open Generative AI",
};

export default function AgentsLayout({ children }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-black">
      <div className="border-b border-white/10 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-100/90">
        This route is a compatibility surface for the legacy agent backend. The fal-backed studio
        remains the primary experience.
      </div>
      {children}
    </div>
  );
}
