'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

interface PackagesTitleRollingProps {
  className?: string;
}

export default function PackagesTitleRolling({ className = '' }: PackagesTitleRollingProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  const words = ['PACKAGES'];

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

      gsap.set(letters, {
        yPercent: 115,
        rotateX: -45,
        opacity: 0,
        transformOrigin: '50% 100%',
      });

      const tl = gsap.timeline();

      tl.to(letters, {
        yPercent: 0,
        rotateX: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.03,
        ease: 'power2.out',
      })
        .to(
          letters,
          {
            yPercent: -115,
            rotateX: 45,
            opacity: 0,
            transformOrigin: '50% 0%',
            duration: 0.45,
            stagger: 0.02,
            ease: 'power2.in',
          },
          '+=0.1'
        )
        .set(letters, {
          yPercent: 115,
          rotateX: -45,
          opacity: 0,
          transformOrigin: '50% 100%',
        })
        .to(letters, {
          yPercent: 0,
          rotateX: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.03,
          ease: 'power2.out',
        });
    },
    { scope: containerRef }
  );

  return (
    <h1
      ref={containerRef}
      className={`font-[family-name:var(--font-display)] text-4xl xs:text-5xl sm:text-6xl md:text-7xl tracking-tight sm:tracking-normal text-white uppercase select-none leading-none flex flex-wrap items-baseline gap-x-3 sm:gap-x-4 ${className}`}
      style={{ perspective: '800px' }}
      aria-label="PACKAGES"
    >
      {words.map((word, wordIdx) => (
        <span key={wordIdx} className="inline-flex items-baseline overflow-visible">
          {word.split('').map((char, charIdx) => (
            <span
              key={charIdx}
              className="inline-block overflow-hidden py-1"
              aria-hidden="true"
            >
              <span className="rolling-letter inline-block will-change-transform">
                {char}
              </span>
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}

