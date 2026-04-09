import { useEffect, useState } from "react";

const TEAL = "#13CFCF";
const TEAL_DIM = "rgba(19,207,207,0.15)";
const TEAL_GLOW = "rgba(19,207,207,0.35)";
const BG = "#0D0D0D";
const CARD = "#161616";
const BORDER = "#222222";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${BG}; font-family: 'Inter', sans-serif; }

  @keyframes floatUp {
    0%   { transform: translateY(0px) scale(1);   opacity: 1; }
    70%  { transform: translateY(-170px) scale(1); opacity: 1; }
    85%  { transform: translateY(-195px) scale(0.6); opacity: 0.6; }
    100% { transform: translateY(-210px) scale(0); opacity: 0; }
  }

  @keyframes driveReceive {
    0%   { transform: scale(1);    box-shadow: 0 0 0px 0px ${TEAL_GLOW}; }
    30%  { transform: scale(1.18); box-shadow: 0 0 28px 10px ${TEAL_GLOW}; }
    60%  { transform: scale(1.08); box-shadow: 0 0 18px 6px  ${TEAL_GLOW}; }
    100% { transform: scale(1);    box-shadow: 0 0 10px 3px  rgba(19,207,207,0.2); }
  }

  @keyframes checkDraw {
    0%   { stroke-dashoffset: 60; opacity: 0; }
    20%  { opacity: 1; }
    100% { stroke-dashoffset: 0;  opacity: 1; }
  }

  @keyframes circleDraw {
    0%   { stroke-dashoffset: 220; opacity: 0; }
    15%  { opacity: 1; }
    100% { stroke-dashoffset: 0;   opacity: 1; }
  }

  @keyframes fadeUp {
    0%   { opacity: 0; transform: translateY(14px); }
    100% { opacity: 1; transform: translateY(0px);  }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }

  @keyframes dotBounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1; }
  }

  .file-fly   { animation: floatUp 1.4s ease-in 0.3s forwards; }
  .drive-pop  { animation: driveReceive 0.6s ease-out forwards; }
  .check-draw { animation: checkDraw 0.5s ease-out forwards; stroke-dasharray: 60; stroke-dashoffset: 60; }
  .circle-draw{ animation: circleDraw 0.6s ease-out forwards; stroke-dasharray: 220; stroke-dashoffset: 220; }
  .fade-up    { animation: fadeUp 0.5s ease-out forwards; }
  .dot1 { animation: dotBounce 1.2s 0s infinite; }
  .dot2 { animation: dotBounce 1.2s 0.2s infinite; }
  .dot3 { animation: dotBounce 1.2s 0.4s infinite; }
`;

function FileIcon({ color }: { color: string }) {
  return (
    <svg width="52" height="62" viewBox="0 0 52 62" fill="none">
      <rect x="1" y="1" width="50" height="60" rx="7" fill="#1a1a1a" stroke={color} strokeWidth="1.5" />
      <path d="M30 1v14h14" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M30 1L44 15" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="10" y="24" width="32" height="3" rx="1.5" fill={color} opacity="0.7" />
      <rect x="10" y="32" width="24" height="3" rx="1.5" fill={color} opacity="0.4" />
      <rect x="10" y="40" width="28" height="3" rx="1.5" fill={color} opacity="0.25" />
    </svg>
  );
}

function DriveIcon({ pulsing, color }: { pulsing: boolean; color: string }) {
  return (
    <div
      className={pulsing ? "drive-pop" : ""}
      style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: TEAL_DIM,
        border: `1.5px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: pulsing ? undefined : `0 0 10px 3px rgba(19,207,207,0.2)`,
      }}
    >
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <rect x="3" y="8" width="32" height="22" rx="4" stroke={color} strokeWidth="1.8" fill="none" />
        <rect x="3" y="22" width="32" height="8" rx="2" fill={color} opacity="0.15" />
        <circle cx="29" cy="26" r="2.5" fill={color} />
        <circle cx="22" cy="26" r="2.5" fill={color} opacity="0.5" />
        <path d="M10 14h18M10 18h10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function CheckCircle() {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
      <circle cx="44" cy="44" r="34" stroke={TEAL_DIM.replace("0.15", "0.12")} strokeWidth="8" fill="none" />
      <circle
        cx="44" cy="44" r="34"
        stroke={TEAL}
        strokeWidth="2.5"
        fill="none"
        className="circle-draw"
        style={{ transformOrigin: "44px 44px", transform: "rotate(-90deg)" }}
      />
      <polyline
        points="28,44 40,56 62,34"
        stroke={TEAL}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="check-draw"
      />
    </svg>
  );
}

type Phase = "idle" | "flying" | "received" | "done";

export function DownloadConfirm() {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("flying"), 400);
    const t2 = setTimeout(() => setPhase("received"), 1900);
    const t3 = setTimeout(() => setPhase("done"), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const showFile = phase === "flying";
  const showDrivePulse = phase === "received" || phase === "done";
  const showCheck = phase === "done";
  const showText = phase === "done";

  return (
    <>
      <style>{style}</style>
      <div style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Ambient glow behind drive */}
        <div style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(19,207,207,0.06) 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }} />

        {/* Main card */}
        <div style={{
          width: "100%",
          maxWidth: 340,
          background: CARD,
          borderRadius: 24,
          border: `1px solid ${BORDER}`,
          padding: "36px 28px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          position: "relative",
          overflow: "hidden",
        }}>

          {/* Top teal line */}
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`,
            opacity: showCheck ? 1 : 0,
            transition: "opacity 0.6s",
          }} />

          {/* Animation stage */}
          <div style={{
            width: 140,
            height: 200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            position: "relative",
            marginBottom: 8,
          }}>
            {/* Drive at top */}
            <div style={{ position: "absolute", top: 10 }}>
              <DriveIcon pulsing={showDrivePulse} color={TEAL} />
            </div>

            {/* Flying file */}
            {showFile && (
              <div className="file-fly" style={{ position: "absolute", bottom: 10, zIndex: 2 }}>
                <FileIcon color={TEAL} />
              </div>
            )}

            {/* Idle state — file waiting */}
            {phase === "idle" && (
              <div style={{ position: "absolute", bottom: 10, opacity: 0.5 }}>
                <FileIcon color={TEAL} />
              </div>
            )}

            {/* Connection line while flying */}
            {showFile && (
              <div style={{
                position: "absolute",
                width: 1,
                height: 120,
                background: `linear-gradient(to top, transparent, ${TEAL})`,
                bottom: 72,
                opacity: 0.3,
              }} />
            )}

            {/* Check circle after received */}
            {showCheck && (
              <div className="fade-up" style={{ position: "absolute", bottom: 40 }}>
                <CheckCircle />
              </div>
            )}
          </div>

          {/* Status text area */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            marginTop: 4,
            minHeight: 100,
            width: "100%",
          }}>

            {/* "Download in progress" label */}
            {showText ? (
              <div className="fade-up" style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: -0.3,
                  marginBottom: 6,
                }}>
                  Download in Progress
                </div>
                <div style={{
                  fontSize: 13,
                  color: "#888",
                  fontWeight: 400,
                  lineHeight: 1.5,
                }}>
                  Your file has been queued and is downloading in the background
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#777", letterSpacing: -0.2 }}>
                  Preparing download
                </div>
                <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 10 }}>
                  {[1,2,3].map((i) => (
                    <div key={i} className={`dot${i}`} style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: TEAL,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* CTA Button */}
            {showText && (
              <div className="fade-up" style={{ width: "100%", marginTop: 8 }}>
                <button style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 14,
                  background: TEAL,
                  border: "none",
                  color: "#000",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: 0.1,
                }}>
                  View Download Manager
                </button>
                <button style={{
                  width: "100%",
                  padding: "12px 0",
                  marginTop: 8,
                  borderRadius: 14,
                  background: "transparent",
                  border: `1px solid ${BORDER}`,
                  color: "#888",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}>
                  Continue Browsing
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom hint */}
        {showText && (
          <div className="fade-up" style={{
            marginTop: 20,
            fontSize: 12,
            color: "#444",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL, opacity: 0.7 }} />
            <span>You'll be notified when the download completes</span>
          </div>
        )}
      </div>
    </>
  );
}
