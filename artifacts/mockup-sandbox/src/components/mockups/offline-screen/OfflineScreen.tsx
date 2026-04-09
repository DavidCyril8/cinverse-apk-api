import { useState, useEffect } from "react";

const TEAL = "#13CFCF";
const BG = "#141414";
const CARD = "#1a1a1a";
const MUTED = "#555";
const MUTED_FG = "#888";

export function OfflineScreen() {
  const [retrying, setRetrying] = useState(false);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => setRetrying(false), 2800);
  };

  return (
    <div
      style={{
        width: 390,
        height: 844,
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        @keyframes pulse-ring {
          0% { transform: scale(0.7); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes pulse-ring2 {
          0% { transform: scale(0.7); opacity: 0.4; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes signal-bar-off {
          0%, 60%, 100% { opacity: 1; }
          70%, 90% { opacity: 0.15; }
        }
        @keyframes signal-bar-flicker {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.45; }
        }
        @keyframes slash-appear {
          0%, 40% { opacity: 0; transform: scale(0.5) rotate(-20deg); }
          60%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes float-particle {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.06; }
          50% { opacity: 0.12; }
          100% { transform: translateY(-120px) rotate(30deg); opacity: 0; }
        }
        @keyframes spin-retry {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes retry-ripple {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px ${TEAL}55); }
          50% { filter: drop-shadow(0 0 22px ${TEAL}99); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        .ring1 {
          animation: pulse-ring 2.4s ease-out infinite;
        }
        .ring2 {
          animation: pulse-ring2 2.4s ease-out 0.8s infinite;
        }
        .signal-bar-1 { animation: signal-bar-off 3s ease-in-out 0s infinite; }
        .signal-bar-2 { animation: signal-bar-off 3s ease-in-out 0.2s infinite; }
        .signal-bar-3 { animation: signal-bar-flicker 1.6s ease-in-out 0s infinite; }
        .signal-bar-4 { animation: signal-bar-flicker 1.6s ease-in-out 0.3s infinite; }
        .slash { animation: slash-appear 3s ease-in-out infinite; }
        .icon-glow { animation: glow-pulse 2.5s ease-in-out infinite; }
        .fade-up-1 { animation: fade-up 0.6s ease forwards; }
        .fade-up-2 { animation: fade-up 0.6s 0.12s ease forwards; opacity: 0; }
        .fade-up-3 { animation: fade-up 0.6s 0.22s ease forwards; opacity: 0; }
        .retry-spin { animation: spin-retry 0.8s linear infinite; }
        .retry-ripple-anim { animation: retry-ripple 0.9s ease-out forwards; }

        .particle { animation: float-particle linear infinite; }
      `}</style>

      {/* Background film-strip particles */}
      {[
        { x: 30, y: 700, dur: "7s", delay: "0s", size: 22 },
        { x: 340, y: 750, dur: "9s", delay: "2s", size: 16 },
        { x: 80, y: 600, dur: "11s", delay: "1s", size: 14 },
        { x: 300, y: 650, dur: "8s", delay: "3.5s", size: 18 },
        { x: 180, y: 800, dur: "12s", delay: "0.5s", size: 12 },
        { x: 60, y: 400, dur: "10s", delay: "4s", size: 20 },
        { x: 360, y: 500, dur: "7.5s", delay: "1.5s", size: 15 },
      ].map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size * 0.7,
            border: `1.5px solid ${TEAL}`,
            borderRadius: 2,
            animationDuration: p.dur,
            animationDelay: p.delay,
          }}
        />
      ))}

      {/* Scan line overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)`,
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        className="fade-up-1"
        style={{
          position: "absolute",
          top: 54,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span style={{ color: TEAL, fontWeight: 800, fontSize: 18, letterSpacing: 4 }}>
          CINE<span style={{ color: "#fff" }}>VERSE</span>
        </span>
      </div>

      {/* Main icon + pulse rings */}
      <div style={{ position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Pulse rings */}
        <div
          className="ring1"
          style={{
            position: "absolute",
            width: 100,
            height: 100,
            borderRadius: "50%",
            border: `1.5px solid ${TEAL}`,
          }}
        />
        <div
          className="ring2"
          style={{
            position: "absolute",
            width: 100,
            height: 100,
            borderRadius: "50%",
            border: `1px solid ${TEAL}`,
          }}
        />

        {/* Icon circle */}
        <div
          className="icon-glow"
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: `linear-gradient(135deg, #1e2e2e, #1a1a1a)`,
            border: `1.5px solid ${TEAL}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* WiFi bars SVG with broken animation */}
          <svg width="52" height="42" viewBox="0 0 52 42" fill="none">
            {/* Bar 1 - bottom left (off) */}
            <rect className="signal-bar-1" x="4" y="28" width="8" height="10" rx="2" fill={TEAL} />
            {/* Bar 2 - low (off) */}
            <rect className="signal-bar-2" x="16" y="20" width="8" height="18" rx="2" fill={TEAL} />
            {/* Bar 3 - mid (flicker) */}
            <rect className="signal-bar-3" x="28" y="12" width="8" height="26" rx="2" fill={TEAL} />
            {/* Bar 4 - high (flicker) */}
            <rect className="signal-bar-4" x="40" y="4" width="8" height="34" rx="2" fill={TEAL} />

            {/* Slash / X mark */}
            <g className="slash">
              <line x1="6" y1="6" x2="46" y2="38" stroke="#ff4444" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="46" y1="6" x2="6" y2="38" stroke="#ff4444" strokeWidth="3.5" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      </div>

      {/* Text block */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          marginTop: 28,
          paddingHorizontal: 32,
          textAlign: "center",
        }}
      >
        <div
          className="fade-up-2"
          style={{ color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: -0.3, textAlign: "center" }}
        >
          No Internet Connection
        </div>
        <div
          className="fade-up-3"
          style={{
            color: MUTED_FG,
            fontSize: 13.5,
            lineHeight: 1.55,
            textAlign: "center",
            maxWidth: 260,
            fontWeight: 400,
          }}
        >
          CINVERSE needs an internet connection to stream content.{"\n"}
          Check your Wi-Fi or mobile data and try again.
        </div>
      </div>

      {/* Divider with dots */}
      <div style={{ display: "flex", gap: 6, marginTop: 28, alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: i < dots ? TEAL : MUTED,
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>

      {/* Status line */}
      <div style={{ marginTop: 10, color: MUTED_FG, fontSize: 11.5, letterSpacing: 0.5 }}>
        {retrying ? "Reconnecting..." : "Connection lost"}
      </div>

      {/* Retry button */}
      <div style={{ position: "relative", marginTop: 36 }}>
        {retrying && (
          <div
            className="retry-ripple-anim"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 14,
              border: `2px solid ${TEAL}`,
              pointerEvents: "none",
            }}
          />
        )}
        <button
          onClick={handleRetry}
          disabled={retrying}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingLeft: 28,
            paddingRight: 28,
            paddingTop: 14,
            paddingBottom: 14,
            borderRadius: 14,
            background: retrying ? `${TEAL}18` : TEAL,
            border: retrying ? `1.5px solid ${TEAL}55` : "none",
            color: retrying ? TEAL : "#0a1a1a",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 0.2,
            cursor: retrying ? "not-allowed" : "pointer",
            transition: "all 0.25s",
          }}
        >
          <span
            className={retrying ? "retry-spin" : ""}
            style={{ display: "inline-flex" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.06-3.39L10 6.5h5V1.5l-1.35.85z"
                fill="currentColor"
              />
            </svg>
          </span>
          {retrying ? "Retrying..." : "Try Again"}
        </button>
      </div>

      {/* Downloads hint */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 280,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${MUTED}44, transparent)`,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill={TEAL} />
          </svg>
          <span style={{ color: MUTED_FG, fontSize: 12.5 }}>
            You can still watch your{" "}
            <span style={{ color: TEAL, fontWeight: 600 }}>Downloads</span>
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          width: 134,
          height: 5,
          borderRadius: 3,
          background: "#ffffff22",
        }}
      />
    </div>
  );
}
