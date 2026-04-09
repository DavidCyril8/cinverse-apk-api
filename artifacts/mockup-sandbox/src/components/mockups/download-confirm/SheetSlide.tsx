import { useEffect, useState } from "react";

const TEAL = "#13CFCF";
const BG = "#0D0D0D";
const SHEET_BG = "#111111";
const BORDER = "#1e1e1e";
const GREEN = "#4ade80";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${BG}; font-family: 'Inter', sans-serif; overflow: hidden; }

  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes backdropIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes barFill {
    from { width: 0%; }
    to   { width: 100%; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dotScale {
    0%, 100% { transform: scale(0.7); opacity: 0.4; }
    50%       { transform: scale(1.2); opacity: 1; }
  }
  @keyframes rowSlideIn {
    from { opacity: 0; transform: translateX(-10px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* Orbit burst keyframes */
  @keyframes ringExpand1 {
    0%   { transform: scale(0.3); opacity: 0.9; }
    100% { transform: scale(3.2); opacity: 0; }
  }
  @keyframes ringExpand2 {
    0%   { transform: scale(0.3); opacity: 0.6; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes circleStroke {
    0%   { stroke-dashoffset: 226; opacity: 0; }
    15%  { opacity: 1; }
    100% { stroke-dashoffset: 0;   opacity: 1; }
  }
  @keyframes checkDraw {
    0%   { stroke-dashoffset: 65; opacity: 0; }
    30%  { opacity: 1; }
    100% { stroke-dashoffset: 0;  opacity: 1; }
  }
  @keyframes iconPop {
    0%   { transform: scale(0); opacity: 0; }
    55%  { transform: scale(1.2); opacity: 1; }
    75%  { transform: scale(0.93); }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 22px 6px rgba(19,207,207,0.28); }
    50%       { box-shadow: 0 0 42px 14px rgba(19,207,207,0.5); }
  }
  @keyframes particleFly {
    0%   { transform: translate(0,0) scale(1.2); opacity: 1; }
    100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
  }
  @keyframes checkBgPop {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes successRowIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .sheet-up   { animation: sheetUp 0.45s cubic-bezier(0.32,0.72,0,1) forwards; }
  .backdrop   { animation: backdropIn 0.35s ease forwards; }
  .bar-fill   { animation: barFill 1.4s cubic-bezier(0.4,0,0.2,1) 0.2s forwards; width: 0%; }
  .fade-up    { animation: fadeUp 0.45s ease-out forwards; }
  .icon-pop   { animation: iconPop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .glow-pulse { animation: glowPulse 2.2s ease-in-out 0.6s infinite; }
  .ring1      { animation: ringExpand1 0.75s ease-out forwards; }
  .ring2      { animation: ringExpand2 0.75s 0.12s ease-out forwards; }
  .circle-stroke { animation: circleStroke 0.55s ease-out 0.1s forwards; stroke-dasharray: 226; stroke-dashoffset: 226; }
  .check-draw { animation: checkDraw 0.45s ease-out 0.55s forwards; stroke-dasharray: 65; stroke-dashoffset: 65; }
  .bg-pop     { animation: checkBgPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
`;

const PARTICLES = [
  { px: "-68px", py: "-58px", color: TEAL,      size: 7 },
  { px: "72px",  py: "-54px", color: "#ffffff",  size: 5 },
  { px: "76px",  py: "66px",  color: TEAL,       size: 6 },
  { px: "-62px", py: "72px",  color: "#ffffff",  size: 5 },
  { px: "4px",   py: "-82px", color: TEAL,       size: 8 },
  { px: "88px",  py: "6px",   color: TEAL+"99",  size: 5 },
  { px: "-86px", py: "4px",   color: "#ffffff66", size: 4 },
  { px: "34px",  py: "86px",  color: TEAL,       size: 6 },
  { px: "-40px", py: "-82px", color: "#ffffff55", size: 4 },
];

function BurstCheckmark() {
  return (
    <div style={{ position: "relative", width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Burst rings */}
      <div className="ring1" style={{
        position: "absolute", width: 100, height: 100, borderRadius: "50%",
        border: `2.5px solid ${TEAL}`,
        pointerEvents: "none",
      }} />
      <div className="ring2" style={{
        position: "absolute", width: 100, height: 100, borderRadius: "50%",
        border: "1.5px solid rgba(255,255,255,0.35)",
        pointerEvents: "none",
      }} />

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          width: p.size, height: p.size,
          borderRadius: "50%",
          background: p.color,
          animation: `particleFly 0.65s ease-out ${i * 0.025}s forwards`,
          ["--px" as any]: p.px,
          ["--py" as any]: p.py,
          pointerEvents: "none",
        }} />
      ))}

      {/* Circle + check SVG */}
      <div className="icon-pop glow-pulse" style={{
        width: 100, height: 100, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" style={{ position: "absolute" }}>
          {/* Dim track */}
          <circle cx="50" cy="50" r="36" stroke="rgba(19,207,207,0.1)" strokeWidth="10" fill="rgba(19,207,207,0.06)" />
          {/* Animated stroke */}
          <circle
            cx="50" cy="50" r="36"
            stroke={TEAL} strokeWidth="2.5" fill="none"
            className="circle-stroke"
            style={{ transformOrigin: "50px 50px", transform: "rotate(-90deg)" }}
          />
        </svg>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ position: "relative", zIndex: 1 }}>
          <polyline
            points="8,22 18,32 36,12"
            stroke={TEAL} strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round"
            fill="none"
            className="check-draw"
          />
        </svg>
      </div>
    </div>
  );
}

function RowItem({ icon, label, value, delay, color }: {
  icon: string; label: string; value: string; delay: number; color?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 0",
      borderBottom: `1px solid ${BORDER}`,
      animation: `successRowIn 0.35s ease-out ${delay}s both`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: color || "#bbb" }}>{value}</span>
    </div>
  );
}

type Phase = "hidden" | "loading" | "success";

export function SheetSlide() {
  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("loading"), 300);
    const t2 = setTimeout(() => setPhase("success"), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <>
      <style>{css}</style>

      {/* Blurred movie background */}
      <div style={{
        position: "fixed", inset: 0, background: BG,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 60,
      }}>
        <div style={{ width: "100%", maxWidth: 390, padding: "0 20px", opacity: 0.2, filter: "blur(3px)", pointerEvents: "none" }}>
          <div style={{ width: 180, height: 252, borderRadius: 16, background: "#1a2a3a", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>🎬</div>
          <div style={{ height: 18, borderRadius: 8, background: "#333", width: "60%", margin: "0 auto 8px" }} />
          <div style={{ height: 12, borderRadius: 6, background: "#222", width: "80%", margin: "0 auto 6px" }} />
          <div style={{ height: 12, borderRadius: 6, background: "#222", width: "55%", margin: "0 auto" }} />
        </div>
      </div>

      {/* Backdrop */}
      {phase !== "hidden" && (
        <div className="backdrop" style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(6px)",
        }} />
      )}

      {/* Orbit burst checkmark — floats above the sheet */}
      {phase === "success" && (
        <div className="fade-up" style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          marginTop: -120,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}>
          <BurstCheckmark />
          <div className="fade-up" style={{
            fontSize: 20, fontWeight: 800,
            color: "#fff", letterSpacing: -0.3,
            textShadow: `0 0 24px rgba(19,207,207,0.4)`,
            animationDelay: "0.7s",
            opacity: 0,
          }}>
            Download in Progress
          </div>
        </div>
      )}

      {/* Loading indicator above sheet */}
      {phase === "loading" && (
        <div style={{
          position: "fixed",
          top: "38%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          zIndex: 20,
        }}>
          <div style={{ display: "flex", gap: 7 }}>
            {[0, 0.18, 0.36].map((d, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: TEAL,
                animation: `dotScale 1s ${d}s ease-in-out infinite`,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 13, color: "#555", fontWeight: 500, letterSpacing: 0.5 }}>
            Preparing download…
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      {phase !== "hidden" && (
        <div className="sheet-up" style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: SHEET_BG,
          borderRadius: "24px 24px 0 0",
          border: `1px solid ${BORDER}`,
          borderBottom: "none",
          padding: "12px 22px 44px",
          zIndex: 10,
        }}>
          {/* Handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "#2a2a2a", margin: "0 auto 18px",
          }} />

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: phase === "success" ? "rgba(74,222,128,0.08)" : "rgba(19,207,207,0.08)",
                border: `1.5px solid ${phase === "success" ? GREEN : TEAL}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.4s ease",
              }}>
                {phase === "success" ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <polyline points="3,8 7,12 13,4" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v7M5 7l3 3 3-3" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 13h12" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                  {phase === "success" ? "Download Queued" : "Starting Download"}
                </div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                  {phase === "success" ? "Running in background" : "Fetching file info…"}
                </div>
              </div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: phase === "success" ? GREEN : TEAL,
              padding: "4px 10px", borderRadius: 20,
              background: phase === "success" ? "rgba(74,222,128,0.08)" : "rgba(19,207,207,0.08)",
              border: `1px solid ${phase === "success" ? GREEN + "44" : TEAL + "44"}`,
              transition: "all 0.4s ease",
            }}>
              {phase === "success" ? "Ready" : "Active"}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, borderRadius: 2, background: "#1c1c1c", marginBottom: 16, overflow: "hidden" }}>
            <div
              className={phase === "loading" ? "bar-fill" : ""}
              style={{
                height: "100%", borderRadius: 2,
                background: `linear-gradient(90deg, ${TEAL}77, ${TEAL})`,
                width: phase === "success" ? "100%" : "0%",
                transition: phase === "success" ? "width 0.2s" : undefined,
              }}
            />
          </div>

          {/* Info rows */}
          <RowItem icon="🎬" label="Title"     value="SpongeBob — S1E1" delay={0.08} />
          <RowItem icon="📺" label="Quality"   value="1080p Full HD"    delay={0.14} color={TEAL} />
          <RowItem icon="💾" label="File size" value="1.4 GB"           delay={0.20} />
          <RowItem icon="🔤" label="Subtitles" value="English"          delay={0.26} />

          {/* Buttons */}
          {phase === "success" ? (
            <div className="fade-up" style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={{
                width: "100%", padding: "14px 0", borderRadius: 14,
                background: TEAL, border: "none",
                color: "#000", fontSize: 15, fontWeight: 700,
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>
                View Download Manager
              </button>
              <button style={{
                width: "100%", padding: "12px 0", borderRadius: 14,
                background: "transparent", border: `1px solid ${BORDER}`,
                color: "#555", fontSize: 14, fontWeight: 500,
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>
                Continue Browsing
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 6 }}>
              {[0, 0.15, 0.3].map((d, i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: TEAL, opacity: 0.5,
                  animation: `dotScale 1s ${d}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
