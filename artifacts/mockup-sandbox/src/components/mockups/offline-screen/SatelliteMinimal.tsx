import React from 'react';

export function SatelliteMinimal() {
  return (
    <div
      className="relative flex flex-col w-[390px] h-[844px] overflow-hidden items-center justify-between"
      style={{ backgroundColor: '#141414', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes orbit1 {
          0% { transform: rotate(0deg) translateX(80px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
        }
        @keyframes orbit2 {
          0% { transform: rotate(120deg) translateX(100px) rotate(-120deg); }
          100% { transform: rotate(480deg) translateX(100px) rotate(-480deg); }
        }
        @keyframes orbit3 {
          0% { transform: rotate(240deg) translateX(120px) rotate(-240deg); }
          100% { transform: rotate(600deg) translateX(120px) rotate(-600deg); }
        }
        @keyframes pulseBar {
          0% { opacity: 0.2; width: 20%; }
          50% { opacity: 0.5; width: 40%; }
          100% { opacity: 0.2; width: 20%; }
        }
      `}} />

      {/* Top spacer */}
      <div className="flex-1" />

      {/* Center content: Satellite and text */}
      <div className="flex flex-col items-center flex-[2]">
        
        {/* Animated Satellite Graphic */}
        <div className="relative w-[240px] h-[240px] flex items-center justify-center mb-16">
          {/* Orbiting dots */}
          <div 
            className="absolute w-2 h-2 rounded-full bg-white/20"
            style={{ animation: 'orbit1 8s linear infinite' }}
          />
          <div 
            className="absolute w-2 h-2 rounded-full bg-white/10"
            style={{ animation: 'orbit2 12s linear infinite' }}
          />
          <div 
            className="absolute w-2 h-2 rounded-full bg-[#13CFCF]"
            style={{ animation: 'orbit3 15s linear infinite', boxShadow: '0 0 8px rgba(19, 207, 207, 0.5)' }}
          />

          {/* Satellite SVG */}
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="M17.657 6.343l-1.414 1.414" />
            <path d="M7.757 16.243l-1.414 1.414" />
            <path d="M17.657 17.657l-1.414-1.414" />
            <path d="M7.757 7.757l-1.414-1.414" />
            <circle cx="12" cy="12" r="4" />
            <path d="M12 4a8 8 0 0 1 8 8" strokeDasharray="2 4" />
          </svg>
        </div>

        {/* Typography */}
        <div className="flex flex-col items-center space-y-3 px-8 text-center">
          <h1 className="text-white text-[56px] font-bold leading-none tracking-tight">
            No<br />Connection
          </h1>
          <p className="text-white/40 text-[13px] font-medium tracking-wide uppercase mt-4">
            Satellite link dropped
          </p>
        </div>
      </div>

      {/* Action area */}
      <div className="flex-1 flex flex-col items-center justify-end w-full pb-12">
        <button 
          className="px-8 py-3 rounded-full border border-[#13CFCF]/30 text-[#13CFCF] text-sm font-medium tracking-wide transition-colors active:bg-[#13CFCF]/10 hover:bg-[#13CFCF]/5"
          onClick={() => console.log("Retrying connection...")}
        >
          Retry Connection
        </button>

        {/* Pulsing bar */}
        <div className="mt-12 h-[2px] bg-white/10 w-1/3 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/30 rounded-full mx-auto"
            style={{ animation: 'pulseBar 2s ease-in-out infinite' }}
          />
        </div>
      </div>

    </div>
  );
}
