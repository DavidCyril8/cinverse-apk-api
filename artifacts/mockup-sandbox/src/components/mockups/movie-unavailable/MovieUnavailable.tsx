export function MovieUnavailable() {
  return (
    <div
      style={{
        width: 390,
        minHeight: 844,
        backgroundColor: "#141414",
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow background */}
      <div
        style={{
          position: "absolute",
          top: -80,
          left: "50%",
          transform: "translateX(-50%)",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(19,207,207,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

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
        <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>
          9:41
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
            <rect x="0" y="3" width="3" height="9" rx="1" fill="white" />
            <rect x="4.5" y="2" width="3" height="10" rx="1" fill="white" />
            <rect x="9" y="0" width="3" height="12" rx="1" fill="white" />
            <rect x="13.5" y="0" width="3" height="12" rx="1" fill="white" opacity="0.3" />
          </svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M8 2.5C10.2 2.5 12.2 3.4 13.6 4.9L15 3.5C13.2 1.7 10.7 0.5 8 0.5C5.3 0.5 2.8 1.7 1 3.5L2.4 4.9C3.8 3.4 5.8 2.5 8 2.5Z" fill="white"/>
            <path d="M8 5.5C9.5 5.5 10.8 6.1 11.8 7.1L13.2 5.7C11.8 4.3 9.9 3.5 8 3.5C6.1 3.5 4.2 4.3 2.8 5.7L4.2 7.1C5.2 6.1 6.5 5.5 8 5.5Z" fill="white"/>
            <circle cx="8" cy="10" r="1.5" fill="white"/>
          </svg>
          <div style={{ display: "flex", gap: 1, alignItems: "center" }}>
            <div style={{ width: 25, height: 12, borderRadius: 3, border: "1.5px solid rgba(255,255,255,0.5)", padding: "1.5px", display: "flex", alignItems: "center" }}>
              <div style={{ width: "80%", height: "100%", backgroundColor: "white", borderRadius: 1.5 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px 14px",
        }}
      >
        <button
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none",
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
            <path
              d="M12.5 5L7.5 10L12.5 15"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span
          style={{
            color: "#13CFCF",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 1.5,
            marginLeft: 12,
          }}
        >
          CINVERSE
        </span>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 32,
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        {/* Icon area */}
        <div style={{ position: "relative", marginBottom: 32 }}>
          {/* Outer glow ring */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(19,207,207,0.12) 0%, transparent 70%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(19,207,207,0.15)",
            }}
          >
            {/* Inner circle */}
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                backgroundColor: "rgba(19,207,207,0.08)",
                border: "1.5px solid rgba(19,207,207,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Film + lock SVG icon */}
              <svg
                width="52"
                height="52"
                viewBox="0 0 52 52"
                fill="none"
              >
                {/* Film reel body */}
                <circle cx="26" cy="26" r="18" stroke="#13CFCF" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
                {/* Film strip */}
                <rect x="8" y="22" width="36" height="8" rx="2" stroke="#13CFCF" strokeWidth="1.5" fill="none" opacity="0.5"/>
                <rect x="10" y="22" width="4" height="8" fill="#13CFCF" opacity="0.2" rx="1"/>
                <rect x="17" y="22" width="4" height="8" fill="#13CFCF" opacity="0.2" rx="1"/>
                <rect x="24" y="22" width="4" height="8" fill="#13CFCF" opacity="0.2" rx="1"/>
                <rect x="31" y="22" width="4" height="8" fill="#13CFCF" opacity="0.2" rx="1"/>
                <rect x="38" y="22" width="4" height="8" fill="#13CFCF" opacity="0.2" rx="1"/>
                {/* Lock icon overlaid */}
                <rect x="18" y="28" width="16" height="13" rx="2.5" fill="#13CFCF"/>
                <path d="M20.5 28V24.5C20.5 22 22 20.5 26 20.5C30 20.5 31.5 22 31.5 24.5V28" stroke="#13CFCF" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <circle cx="26" cy="33.5" r="2" fill="#141414"/>
                <rect x="25" y="33.5" width="2" height="3.5" rx="1" fill="#141414"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            color: "#FFFFFF",
            fontSize: 26,
            fontWeight: 700,
            margin: "0 0 10px",
            textAlign: "center",
            letterSpacing: -0.3,
            lineHeight: 1.2,
          }}
        >
          This Title Isn't Available
        </h1>

        {/* Subtitle */}
        <p
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 14,
            textAlign: "center",
            lineHeight: 1.6,
            margin: "0 0 28px",
            maxWidth: 280,
          }}
        >
          We couldn't load this movie. It may have been removed, is restricted
          in your region, or is temporarily unavailable.
        </p>

        {/* Reason chips */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 36,
          }}
        >
          {["Region Restricted", "Content Expired", "Server Error"].map(
            (reason, i) => (
              <div
                key={reason}
                style={{
                  backgroundColor:
                    i === 0 ? "rgba(19,207,207,0.1)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${i === 0 ? "rgba(19,207,207,0.3)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 20,
                  padding: "5px 12px",
                  fontSize: 12,
                  color: i === 0 ? "#13CFCF" : "rgba(255,255,255,0.4)",
                  fontWeight: i === 0 ? 600 : 400,
                  letterSpacing: 0.2,
                }}
              >
                {i === 0 && (
                  <span style={{ marginRight: 4 }}>●</span>
                )}
                {reason}
              </div>
            )
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            width: "100%",
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent)",
            marginBottom: 32,
          }}
        />

        {/* Suggestion text */}
        <p
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: 12,
            textAlign: "center",
            marginBottom: 18,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          What would you like to do?
        </p>

        {/* Action buttons */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Primary CTA */}
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
              letterSpacing: 0.3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="3" width="16" height="12" rx="2" stroke="#0a0a0a" strokeWidth="1.8" fill="none"/>
              <path d="M7 6.5L11.5 9L7 11.5V6.5Z" fill="#0a0a0a"/>
            </svg>
            Browse More Movies
          </button>

          {/* Secondary CTA */}
          <button
            style={{
              width: "100%",
              padding: "14px 0",
              backgroundColor: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              color: "rgba(255,255,255,0.75)",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9L11 14" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Go Back
          </button>
        </div>

        {/* Help link */}
        <p
          style={{
            color: "rgba(255,255,255,0.25)",
            fontSize: 12,
            marginTop: 20,
            textAlign: "center",
          }}
        >
          Having trouble?{" "}
          <span style={{ color: "#13CFCF", opacity: 0.8 }}>Contact Support</span>
        </p>
      </div>

      {/* Bottom safe area */}
      <div style={{ height: 34 }} />
    </div>
  );
}
