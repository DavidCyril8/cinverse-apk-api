import React, { useState, useEffect } from 'react';

export function VhsGlitch() {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-[390px] h-[844px] bg-[#0a0a0a] overflow-hidden flex flex-col items-center justify-center font-sans text-white select-none">
      
      {/* CSS Animations & Effects */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes glitch-anim {
          0% { clip-path: inset(10% 0 85% 0); transform: translate(-2px, 1px); }
          10% { clip-path: inset(40% 0 43% 0); transform: translate(2px, -1px); }
          20% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, 2px); }
          30% { clip-path: inset(15% 0 70% 0); transform: translate(2px, -2px); }
          40% { clip-path: inset(60% 0 20% 0); transform: translate(-2px, 1px); }
          50% { clip-path: inset(25% 0 55% 0); transform: translate(2px, -1px); }
          60% { clip-path: inset(70% 0 10% 0); transform: translate(-2px, 2px); }
          70% { clip-path: inset(5% 0 80% 0); transform: translate(2px, -2px); }
          80% { clip-path: inset(50% 0 30% 0); transform: translate(-2px, 1px); }
          90% { clip-path: inset(85% 0 5% 0); transform: translate(2px, -1px); }
          100% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 2px); }
        }
        @keyframes rgb-split {
          0% { text-shadow: -2px 0 red, 2px 0 blue; }
          20% { text-shadow: 2px 0 red, -2px 0 blue; }
          40% { text-shadow: -3px 0 red, 1px 0 blue; }
          60% { text-shadow: 3px 0 red, -1px 0 blue; }
          80% { text-shadow: -1px 0 red, 3px 0 blue; }
          100% { text-shadow: 1px 0 red, -3px 0 blue; }
        }
        @keyframes rgb-split-logo {
          0%, 100% { text-shadow: -1px 0 #ff0000, 1px 0 #0000ff; }
          50% { text-shadow: 1px 0 #ff0000, -1px 0 #0000ff; }
        }
        @keyframes vhs-tracking {
          0% { transform: translateY(0); filter: hue-rotate(0deg); opacity: 0.2; }
          50% { transform: translateY(10px); filter: hue-rotate(90deg); opacity: 0.4; }
          100% { transform: translateY(0); filter: hue-rotate(0deg); opacity: 0.2; }
        }
        @keyframes noise {
          0%, 100% { background-position: 0 0; }
          10% { background-position: -5% -10%; }
          20% { background-position: -15% 5%; }
          30% { background-position: 7% -25%; }
          40% { background-position: 20% 25%; }
          50% { background-position: -25% 10%; }
          60% { background-position: 15% 5%; }
          70% { background-position: 0% 15%; }
          80% { background-position: 25% 35%; }
          90% { background-position: -10% 10%; }
        }
        @keyframes sweep {
          0% { transform: translateY(-100px); opacity: 0; }
          10% { opacity: 0.3; }
          50% { transform: translateY(800px); opacity: 0.5; }
          90% { opacity: 0; }
          100% { transform: translateY(1000px); opacity: 0; }
        }
        
        .glitch-wrapper {
          position: relative;
        }
        .glitch-text::before, .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #0a0a0a;
        }
        .glitch-text::before {
          left: 2px;
          text-shadow: -2px 0 red;
          animation: glitch-anim 2s infinite linear alternate-reverse;
        }
        .glitch-text::after {
          left: -2px;
          text-shadow: -2px 0 blue;
          animation: glitch-anim 3s infinite linear alternate-reverse;
        }
        .scanlines {
          background: linear-gradient(
            to bottom,
            rgba(255,255,255,0),
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.2) 50%,
            rgba(0,0,0,0.2)
          );
          background-size: 100% 4px;
        }
      `}} />

      {/* Repeating Scanlines Overlay */}
      <div className="absolute inset-0 pointer-events-none scanlines z-10 mix-blend-overlay"></div>

      {/* Static Noise Bar Sweep */}
      <div 
        className="absolute top-0 left-0 w-full h-32 pointer-events-none z-20 mix-blend-screen"
        style={{
          background: 'linear-gradient(180deg, rgba(0,255,0,0) 0%, rgba(255,0,0,0.2) 40%, rgba(0,0,255,0.4) 50%, rgba(0,255,0,0.2) 60%, rgba(255,0,0,0) 100%)',
          animation: 'sweep 8s infinite ease-in-out'
        }}
      ></div>

      {/* Background Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          animation: 'noise 0.5s infinite steps(1)'
        }}
      ></div>

      {/* Logo */}
      <div className="absolute top-12 left-0 w-full flex justify-center z-30">
        <h1 
          className="text-2xl font-black tracking-[0.3em] text-white opacity-90"
          style={{ animation: 'rgb-split-logo 0.1s infinite' }}
        >
          CINVERSE
        </h1>
      </div>

      <div className="absolute top-12 left-6 text-xs font-mono text-white/50 z-30 tracking-widest uppercase">
        PLAY <span className="animate-pulse">▶</span>
      </div>
      
      <div className="absolute top-12 right-6 text-xs font-mono text-white/50 z-30 tracking-widest">
        SP
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center z-30 w-full px-6 text-center glitch-wrapper">
        
        {/* NO SIGNAL Text */}
        <div className="relative mb-6">
          <h2 
            className="text-6xl font-black tracking-tighter text-white glitch-text"
            data-text="NO SIGNAL"
            style={{ animation: 'rgb-split 0.2s infinite' }}
          >
            NO SIGNAL
          </h2>
        </div>

        {/* Error Details */}
        <div className="flex flex-col gap-1 mb-16 opacity-80">
          <p className="text-[#13CFCF] font-mono text-sm tracking-widest" style={{ textShadow: '1px 0 rgba(255,0,0,0.5)' }}>
            ERR_NET_DISCONNECTED
          </p>
          <p className="text-white/60 font-mono text-xs tracking-widest mt-2 bg-black/50 px-2 py-1 border border-white/10">
            CONNECTION TIMED OUT
          </p>
          <p className="text-white/40 font-mono text-[10px] tracking-widest mt-4">
            CHECK TAPE TRACKING
          </p>
        </div>

        {/* Retry Button */}
        <button 
          className="relative group overflow-hidden bg-transparent border-2 border-[#13CFCF] text-[#13CFCF] px-8 py-3 w-48 transition-all hover:bg-[#13CFCF]/10 active:scale-95 z-30"
          style={{
            boxShadow: '0 0 10px rgba(19, 207, 207, 0.2), inset 0 0 10px rgba(19, 207, 207, 0.1)'
          }}
        >
          <div className="absolute inset-0 bg-[#13CFCF] opacity-0 group-hover:opacity-10 transition-opacity"></div>
          
          <div className="flex items-center justify-center gap-3 font-mono text-lg font-bold tracking-widest">
            <span className="text-xl leading-none">▶</span> RETRY
          </div>
          
          {/* Button scanline */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-[#13CFCF]/50 group-hover:animate-[scanline_2s_linear_infinite]"></div>
        </button>

      </div>

      {/* VCR UI overlays */}
      <div className="absolute bottom-12 left-6 text-xl font-mono text-white/80 z-30" style={{ textShadow: '2px 0 red, -2px 0 blue' }}>
        {String(Math.floor(time / 600)).padStart(2, '0')}:{String(Math.floor((time / 10) % 60)).padStart(2, '0')}:{String(time % 10)}0
      </div>

      <div className="absolute bottom-12 right-6 text-xl font-mono text-white/80 z-30" style={{ textShadow: '2px 0 red, -2px 0 blue' }}>
        CH 03
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-40 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)]"></div>

    </div>
  );
}
