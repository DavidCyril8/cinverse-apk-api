export function Cinematic() {
  return (
    <div
      style={{
        width: 390,
        minHeight: 844,
        backgroundColor: "#0d0d0d",
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* === TOP HALF — Poster area === */}
      <div style={{ position: "relative", height: 380, flexShrink: 0 }}>
        {/* Blurred fake movie poster */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, #1a0a2e 0%, #0d1a3a 30%, #1a150a 65%, #2a0a0a 100%)",
          }}
        />
        {/* Fake poster texture lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)",
          }}
        />
        {/* Silhouette figures */}
        <div
          style={{
            position: "absolute",
            bottom: 70,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: 0.12,
          }}
        >
          <svg width="200" height="160" viewBox="0 0 200 160" fill="none">
            <ellipse cx="100" cy="155" rx="80" ry="8" fill="white" opacity="0.4" />
            <rect x="75" y="60" width="50" height="95" rx="6" fill="white" />
            <circle cx="100" cy="42" r="22" fill="white" />
            <rect x="60" y="85" width="20" height="55" rx="4" fill="white" />
            <rect x="120" y="85" width="20" height="55" rx="4" fill="white" />
          </svg>
        </div>
        {/* Glowing title text behind */}
        <div
          style={{
            position: "absolute",
            bottom: 52,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 11,
            letterSpacing: 4,
            color: "rgba(255,255,255,0.15)",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          SHADOW OF TOMORROW
        </div>

        {/* Big blur overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backdropFilter: "blur(0px)",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 50%, rgba(13,13,13,0.85) 85%, #0d0d0d 100%)",
          }}
        />

        {/* Status bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 14,
            paddingLeft: 20,
            paddingRight: 20,
            zIndex: 10,
          }}
        >
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>9:41</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path d="M8 2.5C10.2 2.5 12.2 3.4 13.6 4.9L15 3.5C13.2 1.7 10.7 0.5 8 0.5C5.3 0.5 2.8 1.7 1 3.5L2.4 4.9C3.8 3.4 5.8 2.5 8 2.5Z" fill="white"/>
              <path d="M8 5.5C9.5 5.5 10.8 6.1 11.8 7.1L13.2 5.7C11.8 4.3 9.9 3.5 8 3.5C6.1 3.5 4.2 4.3 2.8 5.7L4.2 7.1C5.2 6.1 6.5 5.5 8 5.5Z" fill="white"/>
              <circle cx="8" cy="10" r="1.5" fill="white"/>
            </svg>
            <div style={{ width: 25, height: 12, borderRadius: 3, border: "1.5px solid rgba(255,255,255,0.5)", padding: "1.5px", display: "flex", alignItems: "center" }}>
              <div style={{ width: "80%", height: "100%", backgroundColor: "white", borderRadius: 1.5 }} />
            </div>
          </div>
        </div>

        {/* Back button */}
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 16,
            zIndex: 10,
          }}
        >
          <button
            style={{
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 5L7.5 10L12.5 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Unavailable stamp — centered on poster */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -52%) rotate(-8deg)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              border: "3px solid rgba(19,207,207,0.7)",
              borderRadius: 8,
              padding: "8px 18px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "rgba(19,207,207,0.85)",
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              UNAVAILABLE
            </div>
          </div>
        </div>
      </div>

      {/* === BOTTOM HALF — Info panel === */}
      <div
        style={{
          flex: 1,
          padding: "4px 24px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Movie meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>2024</span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>•</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>2h 14m</span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>•</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Action</span>
          <div style={{ marginLeft: "auto", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "2px 7px" }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 600 }}>PG-13</span>
          </div>
        </div>

        {/* Movie title struck out */}
        <h2
          style={{
            color: "rgba(255,255,255,0.25)",
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 6px",
            textDecoration: "line-through",
            textDecorationColor: "rgba(19,207,207,0.4)",
          }}
        >
          Shadow of Tomorrow
        </h2>

        {/* Reason banner */}
        <div
          style={{
            backgroundColor: "rgba(19,207,207,0.07)",
            border: "1px solid rgba(19,207,207,0.2)",
            borderLeft: "3px solid #13CFCF",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 20,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
            <circle cx="8" cy="8" r="7" stroke="#13CFCF" strokeWidth="1.5"/>
            <path d="M8 5V8.5" stroke="#13CFCF" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11" r="0.75" fill="#13CFCF"/>
          </svg>
          <div>
            <div style={{ color: "#13CFCF", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
              Not Available in Your Region
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.5 }}>
              This content is restricted due to licensing agreements in your area.
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 20 }} />

        {/* Action buttons */}
        <button
          style={{
            width: "100%",
            padding: "14px 0",
            backgroundColor: "#13CFCF",
            border: "none",
            borderRadius: 14,
            color: "#0a0a0a",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 10,
            letterSpacing: 0.2,
          }}
        >
          Find Similar Movies
        </button>
        <button
          style={{
            width: "100%",
            padding: "13px 0",
            backgroundColor: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            color: "rgba(255,255,255,0.6)",
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
