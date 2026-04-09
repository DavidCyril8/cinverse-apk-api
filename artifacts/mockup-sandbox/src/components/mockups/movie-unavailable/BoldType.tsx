export function BoldType() {
  return (
    <div
      style={{
        width: 390,
        minHeight: 844,
        backgroundColor: "#111111",
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Status bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 14,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 4,
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

      {/* Nav bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4.5L6.5 9L11 13.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Movies
        </button>
      </div>

      {/* Film strip decoration */}
      <div
        style={{
          display: "flex",
          gap: 0,
          overflow: "hidden",
          height: 20,
          backgroundColor: "rgba(19,207,207,0.06)",
          borderBottom: "1px solid rgba(19,207,207,0.1)",
        }}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: "100%",
              borderRight: "2px solid rgba(19,207,207,0.12)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "3px 0",
              flexShrink: 0,
            }}
          >
            <div style={{ width: 6, height: 4, backgroundColor: "rgba(19,207,207,0.15)", borderRadius: 1 }} />
            <div style={{ width: 6, height: 4, backgroundColor: "rgba(19,207,207,0.15)", borderRadius: 1 }} />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "0 24px", display: "flex", flexDirection: "column" }}>

        {/* UNAVAILABLE stamp */}
        <div
          style={{
            marginTop: 36,
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px 0",
          }}
        >
          <div
            style={{
              border: "4px solid rgba(19,207,207,0.72)",
              borderRadius: 10,
              padding: "14px 28px",
              textAlign: "center",
              transform: "rotate(-8deg)",
              boxShadow: "0 0 32px rgba(19,207,207,0.08), inset 0 0 20px rgba(19,207,207,0.03)",
            }}
          >
            <div
              style={{
                color: "rgba(19,207,207,0.88)",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: 6,
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              UNAVAILABLE
            </div>
          </div>
        </div>

        {/* Movie card — info shown as greyed */}
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 16,
            display: "flex",
            gap: 14,
            marginBottom: 28,
          }}
        >
          {/* Poster placeholder */}
          <div
            style={{
              width: 60,
              height: 84,
              borderRadius: 8,
              background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 10L19 12L15 14V10Z" fill="rgba(255,255,255,0.2)"/>
              <rect x="3" y="6" width="18" height="13" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none"/>
              <path d="M3 10H21" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </svg>
          </div>
          {/* Info */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "line-through",
                textDecorationColor: "rgba(19,207,207,0.3)",
                marginBottom: 4,
              }}
            >
              Shadow of Tomorrow
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>2024</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.1)" }}>·</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Action · Sci-Fi</span>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                backgroundColor: "rgba(19,207,207,0.1)",
                border: "1px solid rgba(19,207,207,0.2)",
                borderRadius: 6,
                padding: "3px 8px",
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#13CFCF" }} />
              <span style={{ color: "#13CFCF", fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>
                Region Locked
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            color: "rgba(255,255,255,0.38)",
            fontSize: 13.5,
            lineHeight: 1.65,
            margin: "0 0 32px",
          }}
        >
          This movie isn't licensed for streaming in your location. Try using a different network, or explore titles available near you.
        </p>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 28,
            borderTop: "1px solid rgba(255,255,255,0.07)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            paddingTop: 14,
            paddingBottom: 14,
          }}
        >
          {[
            { label: "Error", value: "403" },
            { label: "Region", value: "NG" },
            { label: "Status", value: "Locked" },
          ].map((item, i) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                textAlign: "center",
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
              }}
            >
              <div style={{ color: "#13CFCF", fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                {item.value}
              </div>
              <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <button
          style={{
            width: "100%",
            padding: "15px 0",
            backgroundColor: "#13CFCF",
            border: "none",
            borderRadius: 14,
            color: "#0a0a0a",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 10,
            letterSpacing: 0.3,
          }}
        >
          Browse Available Titles
        </button>
        <button
          style={{
            width: "100%",
            padding: "13px 0",
            backgroundColor: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            color: "rgba(255,255,255,0.5)",
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>

      {/* Bottom film strip */}
      <div style={{ display: "flex", overflow: "hidden", height: 20, backgroundColor: "rgba(19,207,207,0.04)", marginTop: 16, borderTop: "1px solid rgba(19,207,207,0.08)" }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} style={{ width: 14, height: "100%", borderRight: "2px solid rgba(19,207,207,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "3px 0", flexShrink: 0 }}>
            <div style={{ width: 6, height: 4, backgroundColor: "rgba(19,207,207,0.12)", borderRadius: 1 }} />
            <div style={{ width: 6, height: 4, backgroundColor: "rgba(19,207,207,0.12)", borderRadius: 1 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
