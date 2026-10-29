import React from 'react';

/**
 * PosterEdgeRibbons — High-contrast flowing neon ribbons along the outer perimeter edges
 * in Red, Orange, Electric Blue, and Purple, inspired by the Nexus Vyoma festival poster.
 * Features dual-layer core spines, outer neon glow, and 35° brand corner streaks.
 * Keeps the central content area dark and 100% readable.
 */
export default function PosterEdgeRibbons() {
  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* 01 — Atmospheric Edge Nebulas (Optimized for Mobile GPU) */}
      {/* Top-Right Flame Nebula (Orange / Red) */}
      <div
        className="absolute -top-[12%] -right-[6%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full blur-[40px] sm:blur-[130px] opacity-40 pointer-events-none transform-gpu"
        style={{
          background:
            'radial-gradient(circle, rgba(255,106,0,0.7) 0%, rgba(216,24,43,0.35) 45%, transparent 75%)',
        }}
      />

      {/* Bottom-Left Electric Nebula (Blue / Purple) */}
      <div
        className="absolute -bottom-[16%] -left-[6%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full blur-[45px] sm:blur-[140px] opacity-35 pointer-events-none transform-gpu"
        style={{
          background:
            'radial-gradient(circle, rgba(0,102,255,0.6) 0%, rgba(123,44,255,0.35) 45%, rgba(255,32,125,0.15) 70%, transparent 80%)',
        }}
      />

      {/* 02 — Flowing Neon Vector Ribbons (Perimeter Hugging) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-80 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <style>{`
            @media (max-width: 640px) {
              .poster-glow-wide { filter: url(#neonBlurCore) !important; }
            }
          `}</style>
          {/* Flame Ribbon Gradient */}
          <linearGradient id="posterFlameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6A00" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#D8182B" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#FFA040" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FBB03B" stopOpacity="0.75" />
          </linearGradient>

          {/* Electric Blue / Purple Gradient */}
          <linearGradient id="posterElectricGrad" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0066FF" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#00E5FF" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#7B2CFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FF207D" stopOpacity="0.6" />
          </linearGradient>

          {/* Neon Glow Filters */}
          <filter id="neonBlurWide" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="12" result="blurWide" />
            <feGaussianBlur stdDeviation="4" result="blurTight" />
            <feMerge>
              <feMergeNode in="blurWide" />
              <feMergeNode in="blurTight" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="neonBlurCore" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Top-Right Flame Ribbon Swoop */}
        <path
          d="M 820 -80 C 1040 60, 1220 -20, 1420 80 C 1480 110, 1530 180, 1560 340"
          fill="none"
          stroke="url(#posterFlameGrad)"
          strokeWidth="3.5"
          filter="url(#neonBlurWide)"
          className="poster-glow-wide"
        />
        <path
          d="M 820 -80 C 1040 60, 1220 -20, 1420 80 C 1480 110, 1530 180, 1560 340"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          opacity="0.8"
        />

        {/* Top-Right Secondary Ribbon Accent */}
        <path
          d="M 980 -50 C 1140 30, 1310 10, 1460 160"
          fill="none"
          stroke="url(#posterFlameGrad)"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Bottom-Left Electric Blue & Purple Ribbon Loop */}
        <path
          d="M -140 580 C 40 700, 220 640, 360 820 C 440 910, 520 960, 680 1020"
          fill="none"
          stroke="url(#posterElectricGrad)"
          strokeWidth="3.5"
          filter="url(#neonBlurWide)"
          className="poster-glow-wide"
        />
        <path
          d="M -140 580 C 40 700, 220 640, 360 820 C 440 910, 520 960, 680 1020"
          fill="none"
          stroke="#00E5FF"
          strokeWidth="1.2"
          opacity="0.8"
        />

        {/* Bottom-Left Secondary Electric Accent */}
        <path
          d="M -60 680 C 120 760, 260 740, 420 920"
          fill="none"
          stroke="url(#posterElectricGrad)"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* 35° Brand Corner Diagonal Laser Streaks */}
        <line
          x1="-40"
          y1="160"
          x2="240"
          y2="-60"
          stroke="url(#posterFlameGrad)"
          strokeWidth="1.5"
          strokeDasharray="40 120"
          opacity="0.55"
        />
        <line
          x1="1260"
          y1="960"
          x2="1520"
          y2="760"
          stroke="url(#posterElectricGrad)"
          strokeWidth="1.5"
          strokeDasharray="50 110"
          opacity="0.5"
        />
      </svg>

      {/* 03 — Center High-Contrast Vignette Scrim (100% Center Readability) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.98) 100%)',
        }}
      />
    </div>
  );
}
