import React from 'react';

/**
 * RegistrationGridBackground
 * Static subtle brand grid background over pure black, shared by the
 * Check Email, Verify Email, and Register pages.
 * 100% static with 0 canvas animations and 0 event listeners for an instant, distraction-free registration experience.
 */
export default function RegistrationGridBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden bg-black"
      aria-hidden="true"
    >
      {/* Static subtle brand grid */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #2a2734 1px, transparent 1px), linear-gradient(to bottom, #2a2734 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Ambient static radial highlight for warmth without motion */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,106,0,0.06),_transparent_70%)]" />
    </div>
  );
}
