import { useEffect, useState } from "react";

const TEAL = "#13CFCF";
const BG = "#0D0D0D";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${BG}; font-family: 'Inter', sans-serif; }

  @keyframes ringExpand {
    0%   { transform: scale(0.4); opacity: 0.9; }
    100% { transform: scale(2.8); opacity: 0; }
  }
  @keyframes ringExpand2 {
    0%   { transform: scale(0.4); opacity: 0.7; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes posterShrink {
    0%   { transform: scale(1) rotate(0deg);   opacity: 1; filter: brightness(1); }
    60%  { transform: scale(0.5) rotate(-4deg); opacity: 1; filter: brightness(1.4); }
    80%  { transform: scale(0.15) rotate(2deg); opacity: 0.6; filter: brightness(2); }
    100% { transform: scale(0) rotate(0deg);   opacity: 0; }
  }
  @keyframes iconPop {
    0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
    60%  { transform: scale(1.25) rotate(5deg); opacity: 1; }
    80%  { transform: scale(0.9) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg);   opacity: 1; }
  }
  @keyframes particleFly {
    0%   { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
  }
  @keyframes stampIn {
    0%   { transform: scale(1.6); opacity: 0; letter-spacing: 12px; }
    60%  { transform: scale(0.95); opacity: 1; letter-spacing: 1px; }
    100% { transform: scale(1);   opacity: 1; letter-spacing: 2px; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 18px 4px rgba(19,207,207,0.3); }
    50%       { box-shadow: 0 0 36px 12px rgba(19,207,207,0.55); }
  }
  @keyframes scanLine {
    0%   { top: 4px; opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { top: calc(100% - 4px); opacity: 0; }
  }

  .ring1 { animation: ringExpand 0.8s ease-out forwards; }
  .ring2 { animation: ringExpand2 0.8s 0.1s ease-out forwards; }
  .poster-shrink { animation: posterShrink 0.7s ease-in forwards; }
  .icon-pop { animation: iconPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .stamp { animation: stampIn 0.5s ease-out forwards; }
  .fade-up { animation: fadeUp 0.5s ease-out forwards; }
  .glow-pulse { animation: glowPulse 2s ease-in-out infinite; }
`;

const PARTICLES = [
  { px: "-60px", py: "-55px", color: TEAL },
  { px: "65px",  py: "-50px", color: "#fff" },
  { px: "70px",  py: "60px",  color: TEAL },
  { px: "-55px", py: "65px",  color: "#fff" },
  { px: "0px",   py: "-75px", color: TEAL },
  { px: "80px",  py: "5px",   color: "#13cfcf88" },
  { px: "-80px", py: "5px",   color: "#ffffff66" },
  { px: "30px",  py: "80px",  color: TEAL },
];

function PosterMini() {
  return (
    <div style={{
      width: 110, height: 154,
      borderRadius: 14,
      background: "linear-gradient(135deg, #1a2a3a 0%, #0d1f2d 100%)",
      border: "1.5px solid #2a4a5a",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-end",
      padding: 10, gap: 4, overflow: "hidden", position: "relative",
    }}>
      {/* scan line */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${TEAL}88, transparent)`,
        animation: "scanLine 1.5s ease-in-out 0.5s forwards",
        top: 4,
      }} />
      <div style={{ fontSize: 36 }}>🎬</div>
      <div style={{ fontSize: 9, color: "#aaa", fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>
        MOVIE FILE
      </div>
      <div style={{
        position: "absolute", top: 8, right: 8,
        background: TEAL, borderRadius: 4, padding: "2px 5px",
        fontSize: 8, fontWeight: 700, color: "#000",
      }}>1080p</div>
    </div>
  );
}

type Phase = "idle" | "burst" | "icon" | "done";

export function OrbitBurst() {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("burst"), 600);
    const t2 = setTimeout(() => setPhase("icon"), 1400);
    const t3 = setTimeout(() => setPhase("done"), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <>
      <style>{css}</style>
      <div style={{
        minHeight: "100vh", background: BG,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 28px",
      }}>

        {/* Stage */}
        <div style={{
          width: 240, height: 240,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", marginBottom: 16,
        }}>

          {/* Background glow circle */}
          <div style={{
            position: "absolute",
            width: 200, height: 200, borderRadius: "50%",
            background: `radial-gradient(circle, rgba(19,207,207,0.07) 0%, transparent 70%)`,
          }} />

          {/* Burst rings */}
          {phase === "burst" && (
            <>
              <div className="ring1" style={{
                position: "absolute", width: 120, height: 120, borderRadius: "50%",
                border: `2px solid ${TEAL}`,
              }} />
              <div className="ring2" style={{
                position: "absolute", width: 120, height: 120, borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,0.4)",
              }} />
              {PARTICLES.map((p, i) => (
                <div key={i} className="poster-shrink" style={{
                  position: "absolute",
                  width: 6, height: 6, borderRadius: "50%",
                  background: p.color,
                  animation: `particleFly 0.6s ease-out forwards`,
                  ["--px" as any]: p.px, ["--py" as any]: p.py,
                  animationDelay: `${i * 0.03}s`,
                }} />
              ))}
            </>
          )}

          {/* Poster (idle + shrinking on burst) */}
          {(phase === "idle" || phase === "burst") && (
            <div className={phase === "burst" ? "poster-shrink" : ""}>
              <PosterMini />
            </div>
          )}

          {/* Check icon pop-in */}
          {(phase === "icon" || phase === "done") && (
            <div className={phase === "icon" ? "icon-pop glow-pulse" : "glow-pulse"} style={{
              width: 120, height: 120, borderRadius: "50%",
              background: `radial-gradient(circle at 40% 40%, #1adfdf22, #0d0d0d)`,
              border: `2px solid ${TEAL}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <polyline
                  points="10,26 22,38 44,14"
                  stroke={TEAL} strokeWidth="4.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
          )}
        </div>

        {/* SAVED stamp */}
        {phase === "done" && (
          <div className="stamp" style={{
            fontSize: 32, fontWeight: 800,
            letterSpacing: 2,
            color: TEAL,
            marginBottom: 6,
            textShadow: `0 0 20px rgba(19,207,207,0.5)`,
          }}>
            SAVED
          </div>
        )}

        {phase !== "done" && phase !== "idle" && (
          <div style={{
            fontSize: 14, color: "#555", fontWeight: 500,
            marginBottom: 6, letterSpacing: 1,
          }}>
            PROCESSING…
          </div>
        )}

        {phase === "idle" && (
          <div style={{ fontSize: 14, color: "#444", fontWeight: 500, marginBottom: 6 }}>
            Queuing download…
          </div>
        )}

        {/* Info rows */}
        {phase === "done" && (
          <>
            <div className="fade-up" style={{
              fontSize: 13, color: "#666", marginBottom: 24, fontWeight: 400,
            }}>
              Download in progress · 1080p · 1.4 GB
            </div>

            {/* Buttons */}
            <div className="fade-up" style={{ width: "100%", maxWidth: 310, display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={{
                width: "100%", padding: "15px 0",
                borderRadius: 14,
                background: TEAL, border: "none",
                color: "#000", fontSize: 15, fontWeight: 700,
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>
                View Download Manager
              </button>
              <button style={{
                width: "100%", padding: "13px 0",
                borderRadius: 14,
                background: "transparent", border: "1px solid #222",
                color: "#666", fontSize: 14, fontWeight: 500,
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>
                Continue Browsing
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
