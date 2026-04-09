import { useState } from "react";

export function GhostCity() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => setIsRetrying(false), 2000);
  };

  // Generate 48 seats (6 rows, 8 cols)
  const seats = Array.from({ length: 48 }, (_, i) => i);
  
  // Film strip holes
  const holes = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="w-[390px] h-[844px] bg-[#141414] text-white flex flex-col relative overflow-hidden font-sans selection:bg-[#13CFCF] selection:text-black">
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          
          @keyframes goDark {
            0% { background-color: #1a1a1a; box-shadow: 0 0 5px rgba(19, 207, 207, 0.2); }
            100% { background-color: #050505; box-shadow: none; border-color: #0f0f0f; }
          }
          
          @keyframes filmScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-24px); }
          }
          
          .animate-broadcast-blink {
            animation: blink 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          .seat {
            animation: goDark 0.5s forwards;
            background-color: #1a1a1a;
            border: 1px solid #222;
          }
          
          .film-strip {
            background-image: repeating-linear-gradient(
              to right,
              transparent,
              transparent 12px,
              #222 12px,
              #222 24px
            );
            background-size: 24px 100%;
            animation: filmScroll 2s linear infinite;
          }
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Top Section */}
      <div className="flex flex-col items-center pt-16 px-6 z-10">
        <div className="flex items-center gap-2 px-3 py-1 border border-red-600/80 bg-red-950/20 rounded-sm mb-12 animate-broadcast-blink">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-red-600 text-xs font-mono font-bold tracking-[0.2em]">SIGNAL LOST</span>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tighter uppercase mb-2 text-white/90 drop-shadow-md">
            The Screen <br/> Went Dark
          </h1>
          <p className="text-[#888] text-sm font-medium tracking-wide max-w-[260px] mx-auto">
            Connection severed. The broadcast cannot continue at this time.
          </p>
        </div>
      </div>

      {/* Middle Section: Cinema Seats */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-8 relative z-10 perspective-1000">
        {/* Glow behind the "screen" */}
        <div className="absolute top-0 w-3/4 h-24 bg-[#13CFCF] opacity-5 blur-[60px] rounded-full" />
        
        {/* The "Screen" edge */}
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#13CFCF]/30 to-transparent mb-12" />

        <div className="grid grid-cols-8 gap-x-3 gap-y-4 w-full">
          {seats.map((seat) => {
            const row = Math.floor(seat / 8);
            const col = seat % 8;
            // Center seats go dark last, edges go dark first, top row goes dark first
            const delay = (row * 0.2) + (Math.abs(col - 3.5) * 0.1);
            
            return (
              <div 
                key={seat}
                className="seat w-full aspect-square rounded-[2px]"
                style={{ animationDelay: `${delay}s` }}
              />
            );
          })}
        </div>
      </div>

      {/* Film Strip Divider */}
      <div className="w-full h-8 bg-[#0a0a0a] border-y border-[#1a1a1a] flex items-center overflow-hidden relative opacity-60">
        <div className="absolute inset-0 film-strip" />
        <div className="absolute inset-y-0 w-full bg-gradient-to-r from-[#141414] via-transparent to-[#141414]" />
      </div>

      {/* Bottom Section */}
      <div className="pb-12 pt-8 px-6 flex flex-col items-center z-10">
        <button 
          onClick={handleRetry}
          disabled={isRetrying}
          className="group relative w-full h-14 bg-[#1a1a1a] border border-[#333] overflow-hidden transition-all duration-300 active:scale-[0.98] disabled:opacity-70"
        >
          {/* Clapperboard stripes */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#13CFCF]/20 to-transparent" />
          <div className="absolute top-0 left-0 w-[200%] h-[6px] bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#333_10px,#333_20px)] transition-transform duration-700 ease-out group-hover:-translate-x-12" />
          
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            {isRetrying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: "#13CFCF", animation: "spinSlow 1.5s linear infinite" }}>
                <path d="M12 2a10 10 0 1 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: "#13CFCF" }}>
                <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
            <span className="text-sm font-bold tracking-[0.15em] text-white uppercase mt-0.5">
              {isRetrying ? "Tuning In..." : "Resume Broadcast"}
            </span>
          </div>
          
          {/* Subtle teal hover glow */}
          <div className="absolute inset-0 bg-[#13CFCF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>

        <p className="mt-6 text-xs text-[#666] uppercase tracking-wider font-semibold">
          Offline content available
        </p>
      </div>

      {/* Subtle grain overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />
    </div>
  );
}
