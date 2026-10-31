'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

interface UserGreetingRollingProps {
  userName: string;
  className?: string;
}

/**
 * UserGreetingRolling
 * Signature 2-cycle GSAP 3D vertical rolling text reveal for the user greeting.
 * Preserves the white "Hi," and ":)" with the flaming orange `#FF6A00` name glow.
 */
export default function UserGreetingRolling({
  userName,
  className = '',
}: UserGreetingRollingProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  const cleanName = userName?.trim() || 'Fest Participant';
  const nameWords = cleanName.split(/\s+/).filter(Boolean);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const letters = containerRef.current.querySelectorAll('.rolling-letter');
      if (!letters.length) return;

      const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (isReducedMotion) {
        gsap.set(letters, {
          yPercent: 0,
          rotateX: 0,
          opacity: 1,
        });
        return;
      }

      // Initial state: hidden below baseline with 3D rotation
      gsap.set(letters, {
        yPercent: 115,
        rotateX: -45,
        opacity: 0,
        transformOrigin: '50% 100%',
      });

      // 2-Cycle opening vertical rolling text reveal
      const tl = gsap.timeline();

      // Cycle 1: Roll in from below
      tl.to(letters, {
        yPercent: 0,
        rotateX: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.025,
        ease: 'power2.out',
      })
        // Roll out upwards
        .to(
          letters,
          {
            yPercent: -115,
            rotateX: 45,
            opacity: 0,
            transformOrigin: '50% 0%',
            duration: 0.45,
            stagger: 0.015,
            ease: 'power2.in',
          },
          '+=0.15'
        )
        // Reset to bottom baseline instantly
        .set(letters, {
          yPercent: 115,
          rotateX: -45,
          opacity: 0,
          transformOrigin: '50% 100%',
        })
        // Cycle 2: Roll in from below and lock in permanently
        .to(letters, {
          yPercent: 0,
          rotateX: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.025,
          ease: 'power2.out',
        });
    },
    { scope: containerRef, dependencies: [cleanName] }
  );

  return (
    <h1
      ref={containerRef}
      className={`text-2xl sm:text-3xl font-display font-bold uppercase tracking-wider text-white select-none leading-tight flex flex-wrap items-baseline gap-x-2 sm:gap-x-2.5 ${className}`}
      style={{ perspective: '800px' }}
      aria-label={`Hi, ${cleanName} :)`}
    >
      {/* Word: Hi, */}
      <span className="inline-flex items-baseline overflow-visible text-white">
        {'Hi,'.split('').map((char, idx) => (
          <span key={`hi-${idx}`} className="inline-block overflow-hidden py-0.5" aria-hidden="true">
            <span className="rolling-letter inline-block will-change-transform">
              {char}
            </span>
          </span>
        ))}
      </span>

      {/* Words: User Name in Flame Orange with ambient glow */}
      {nameWords.map((word, wordIdx) => (
        <span
          key={`name-word-${wordIdx}`}
          className="inline-flex items-baseline overflow-visible text-[#FF6A00] drop-shadow-[0_0_20px_rgba(255,106,0,0.4)]"
        >
          {word.split('').map((char, charIdx) => (
            <span
              key={`name-char-${wordIdx}-${charIdx}`}
              className="inline-block overflow-hidden py-0.5"
              aria-hidden="true"
            >
              <span className="rolling-letter inline-block will-change-transform">
                {char}
              </span>
            </span>
          ))}
        </span>
      ))}

      {/* Word: :) */}
      <span className="inline-flex items-baseline overflow-visible text-white">
        {':)'.split('').map((char, idx) => (
          <span key={`smile-${idx}`} className="inline-block overflow-hidden py-0.5" aria-hidden="true">
            <span className="rolling-letter inline-block will-change-transform">
              {char}
            </span>
          </span>
        ))}
      </span>
    </h1>
  );
}

