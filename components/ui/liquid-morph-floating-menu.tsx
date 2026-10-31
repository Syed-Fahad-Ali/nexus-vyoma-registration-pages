"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export interface MenuItem {
  label: string;
  onClick?: () => void;
  href?: string;
  badge?: string;
}

export interface FloatingMenuProps {
  items?: MenuItem[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

function MenuButton({
  label,
  onClick,
  isOpen,
  index,
}: {
  label: string;
  onClick?: () => void;
  isOpen: boolean;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const animatingRef = useRef(false);
  const pendingLeaveRef = useRef(false);
  const chars = label.split("");
  const lockDuration = 30 * chars.length + 300;

  const handleEnter = useCallback(() => {
    pendingLeaveRef.current = false;
    if (hovered) return;
    setHovered(true);
    animatingRef.current = true;
    setTimeout(() => {
      animatingRef.current = false;
      if (pendingLeaveRef.current) {
        pendingLeaveRef.current = false;
        setHovered(false);
      }
    }, lockDuration);
  }, [hovered, lockDuration]);

  const handleLeave = useCallback(() => {
    if (animatingRef.current) {
      pendingLeaveRef.current = true;
    } else {
      setHovered(false);
    }
  }, []);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="text-white hover:text-[#FF6A00] text-[20px] sm:text-[22px] uppercase leading-none overflow-hidden transition-colors duration-200 cursor-pointer py-1"
      style={{
        fontFamily: "var(--font-display), 'Bebas Neue', sans-serif",
        letterSpacing: "0.06em",
        height: "1.2em",
      }}
      animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 8 }}
      transition={{
        duration: 0.35,
        delay: isOpen ? 0.3 + 0.05 * index : 0,
        ease,
      }}
    >
      <div className="flex justify-center items-center">
        {chars.map((char, i) => (
          <span
            key={i}
            className="inline-block overflow-hidden"
            style={{ height: "1.2em" }}
          >
            <span
              className="flex flex-col"
              style={{
                transitionProperty: "transform",
                transitionDuration: hovered ? "600ms" : "0ms",
                transitionDelay: hovered ? `${25 * i}ms` : "0ms",
                transform: hovered ? "translateY(-50%)" : "translateY(0%)",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <span
                className="block text-center"
                style={{ height: "1.2em", lineHeight: "1.2em" }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
              <span
                className="block text-center text-[#FF6A00] drop-shadow-[0_0_12px_rgba(255,106,0,0.5)]"
                style={{ height: "1.2em", lineHeight: "1.2em" }}
                aria-hidden
              >
                {char === " " ? "\u00A0" : char}
              </span>
            </span>
          </span>
        ))}
      </div>
    </motion.button>
  );
}

export default function FloatingMenu({
  items,
  isOpen: controlledIsOpen,
  onOpenChange,
  className = "",
}: FloatingMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(isOpen) : value;
      if (!isControlled) {
        setInternalIsOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, isOpen, onOpenChange]
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const menuItems: MenuItem[] = items ?? [
    { label: "Home" },
    { label: "Events" },
    { label: "Organizers" },
    { label: "Contact" },
    { label: "Claim Pass" },
  ];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [isOpen, setIsOpen]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[95] bg-black/65 backdrop-blur-sm pointer-events-auto"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={containerRef}
        className={`fixed top-16 right-3 xs:right-4 sm:right-8 z-[100] ${className}`}
        style={{ pointerEvents: "auto" }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease }}
      >
        <motion.div
          className="relative overflow-hidden flex flex-col shadow-2xl border border-white/20 select-none"
          onClick={() => {
            if (!isOpen) setIsOpen(true);
          }}
          style={{
            fontFamily: "var(--font-display), 'Bebas Neue', sans-serif",
            cursor: isOpen ? "default" : "pointer",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
          }}
          animate={{
            width: isOpen ? 280 : 130,
            height: isOpen ? 320 : 44,
            borderRadius: isOpen ? 24 : 999,
            scale: 1,
          }}
          whileHover={isOpen ? undefined : { scale: 1.03 }}
          transition={{
            duration: 0.5,
            ease,
            height: { duration: isOpen ? 0.5 : 0.2 },
            scale: { duration: 0.2, ease },
          }}
        >
        {/* Brand Liquid Morph Ambient Layer: Amber Flame Glow */}
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundColor: isOpen ? "rgba(255, 106, 0, 0.12)" : "rgba(255, 106, 0, 0.18)",
            borderColor: isOpen ? "rgba(255, 106, 0, 0.5)" : "rgba(255, 106, 0, 0.35)",
          }}
          transition={{ duration: isOpen ? 0.2 : 0.3, ease }}
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: "inherit",
          }}
        />

        {/* Dark Obsidian titanium core expanding from bottom */}
        <motion.div
          className="absolute left-1/2 bg-[#0A0D18]"
          style={{
            width: "220%",
            height: "220%",
            borderRadius: "50%",
            x: "-50%",
          }}
          animate={{ bottom: isOpen ? "-20%" : "-220%" }}
          transition={{
            duration: 0.55,
            ease,
            delay: isOpen ? 0.05 : 0,
          }}
        />

        {/* Menu items */}
        <div
          className="relative z-10 flex flex-col gap-3.5 items-center justify-center pt-4"
          style={{
            pointerEvents: isOpen ? "auto" : "none",
            opacity: isOpen ? 1 : 0,
            flex: isOpen ? 1 : 0,
            overflow: "hidden",
          }}
        >
          {menuItems.map((item, idx) => (
            <MenuButton
              key={item.label}
              label={item.label}
              onClick={() => {
                item.onClick?.();
                setIsOpen(false);
              }}
              isOpen={isOpen}
              index={idx}
            />
          ))}
        </div>

        {/* Bottom bar: Menu + 3-line hamburger / cross toggle */}
        <motion.div
          className="relative z-10 flex items-center justify-between w-full shrink-0 cursor-pointer px-4"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          animate={{
            paddingBottom: isOpen ? 14 : 0,
            height: 44,
          }}
          transition={{ duration: 0.4, ease }}
          style={{ alignItems: "center" }}
        >
          <motion.span
            className="text-[13px] font-mono uppercase tracking-[0.14em] font-bold"
            animate={{ color: isOpen ? "#FF6A00" : "#ffffff" }}
            transition={{ duration: 0.25, ease }}
          >
            {isOpen ? "CLOSE" : "MENU"}
          </motion.span>

          {/* 3 lines / hamburger morphing into cross */}
          <div className="relative w-[20px] h-[20px] flex items-center justify-center">
            {/* Line 1 (Top) */}
            <motion.span
              className="absolute block w-[16px] h-[2px] rounded-full"
              animate={{
                rotate: isOpen ? 45 : 0,
                y: isOpen ? 0 : -5,
                backgroundColor: isOpen ? "#FF6A00" : "#ffffff",
              }}
              transition={{ duration: 0.35, ease }}
            />
            {/* Line 2 (Middle) */}
            <motion.span
              className="absolute block w-[16px] h-[2px] rounded-full"
              animate={{
                opacity: isOpen ? 0 : 1,
                scaleX: isOpen ? 0 : 1,
                backgroundColor: isOpen ? "#FF6A00" : "#ffffff",
              }}
              transition={{ duration: 0.2, ease }}
            />
            {/* Line 3 (Bottom) */}
            <motion.span
              className="absolute block w-[16px] h-[2px] rounded-full"
              animate={{
                rotate: isOpen ? -45 : 0,
                y: isOpen ? 0 : 5,
                backgroundColor: isOpen ? "#FF6A00" : "#ffffff",
              }}
              transition={{ duration: 0.35, ease }}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  </>
  );
}
