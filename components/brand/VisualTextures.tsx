import React from "react";
import Spark from "./Spark";

/**
 * Visual Textures & Atmospheric Background Elements
 * Matching Section 7 of the Brand Style Guide:
 * 1. Gradient Waves
 * 2. Light Glows
 * 3. Star / Spark Elements
 * 4. Abstract Background (subtle grain)
 * 5. Diagonal Streaks
 */
export function MinimalBrandBackground({ className = "" }: { className?: string }) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-[#000000] ${className}`}
      aria-hidden="true"
    >
      {/* 01 — Abstract Background: Dark Textured Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* 02 — Light Glows: Subtle Atmospheric Depth */}
      {/* Top-Left Flame Ember Glow */}
      <div className="absolute -top-[15%] -left-[10%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-br from-[#D8182B]/18 via-[#FF6A00]/10 to-transparent blur-[140px]" />

      {/* Mid-Right Cosmic Electric Blue Glow */}
      <div className="absolute top-[25%] -right-[10%] w-[45vw] h-[45vw] max-w-[650px] max-h-[650px] rounded-full bg-gradient-to-bl from-[#0066FF]/16 via-[#7B2CFF]/10 to-transparent blur-[150px]" />

      {/* Bottom Crimson Atmosphere Glow */}
      <div className="absolute -bottom-[20%] left-[15%] w-[55vw] h-[55vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-t from-[#B80F1F]/15 via-[#FF6A00]/08 to-transparent blur-[160px]" />

      {/* 03 — Gradient Waves: Smooth Poster Wave Ribbons */}
      <svg
        className="absolute inset-0 w-full h-full opacity-25"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="flameWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D8182B" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#FF6A00" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FBB03B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="azureWaveGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0066FF" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#7B2CFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FF207D" stopOpacity="0" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="35" result="blur" />
          </filter>
        </defs>

        {/* Smooth Curved Flame Wave */}
        <path
          d="M-100 160 C 300 40, 720 460, 1500 180"
          stroke="url(#flameWaveGrad)"
          strokeWidth="65"
          fill="none"
          filter="url(#softGlow)"
        />

        {/* Intersecting Azure/Purple Cosmic Wave */}
        <path
          d="M-50 660 C 460 760, 860 340, 1550 490"
          stroke="url(#azureWaveGrad)"
          strokeWidth="75"
          fill="none"
          filter="url(#softGlow)"
        />
      </svg>

      {/* 04 — Diagonal Streaks: Minimal Speed Lines */}
      <div className="absolute top-0 right-1/4 w-[1.5px] h-[160%] rotate-[35deg] bg-gradient-to-b from-transparent via-[#FF6A00]/22 to-transparent opacity-40 blur-[0.5px]" />
      <div className="absolute -top-1/4 left-1/3 w-[1px] h-[160%] rotate-[35deg] bg-gradient-to-b from-transparent via-[#0066FF]/20 to-transparent opacity-35 blur-[0.5px]" />

      {/* 05 — Minimal Star / Spark Elements */}
      <div className="absolute top-[12%] right-[14%] opacity-60">
        <Spark size={20} color="#FBB03B" glow />
      </div>
      <div className="absolute top-[48%] left-[7%] opacity-45">
        <Spark size={16} color="#FFFFFF" glow />
      </div>
      <div className="absolute top-[78%] right-[9%] opacity-55">
        <Spark size={18} color="#FBB03B" glow />
      </div>
    </div>
  );
}

export function CosmicBackground({ className = "" }: { className?: string }) {
  return <MinimalBrandBackground className={className} />;
}

export default CosmicBackground;
