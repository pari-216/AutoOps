"use client";

import React, { useEffect, useRef } from "react";

interface HeroInteractiveBackgroundProps {
  /** Line stroke color. Defaults to subtle violet/indigo */
  strokeColor?: string;
  /** Canvas background fill. Defaults to transparent/subtle lavender */
  backgroundColor?: string;
  /** Number of flowing wave lines. Defaults to 32 */
  count?: number;
  /** Base oscillation movement speed factor. Defaults to 1 */
  movement?: number;
  /** Whether mouse hover creates interactive ripple distortion */
  hover?: boolean;
  /** Force / radius of cursor interaction. Defaults to 120 */
  force?: number;
  /** Canvas resolution multiplier (DPI scaling). Defaults to auto (clamped devicePixelRatio) */
  resolution?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * High-performance interactive flowing lines/ripple canvas for AutoOps Hero.
 *
 * Visual Treatment:
 * - Extremely subtle violet/indigo harmonic wave lines
 * - Smooth cursor hover ripple distortion with spring damping
 * - Automatically respects `prefers-reduced-motion`
 * - Pauses via `IntersectionObserver` when scrolled out of view for 0% idle CPU
 * - Clean devicePixelRatio handling
 */
export function HeroInteractiveBackground({
  strokeColor = "rgba(139, 92, 246, 0.16)",
  backgroundColor = "transparent",
  count = 28,
  movement = 0.8,
  hover = true,
  force = 140,
  resolution,
  className = "",
}: HeroInteractiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let time = 0;

    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isReducedMotion = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    // Mouse coordinates & smoothed cursor target (lerp)
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      active: false,
    };

    // Resize canvas to element bounds
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = resolution || Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(canvas);

    // IntersectionObserver to stop animation when not in viewport
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible && !animationFrameId) {
            render();
          }
        });
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(canvas);

    // Mouse move handler
    const handlePointerMove = (e: PointerEvent) => {
      if (!hover) return;
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
    };

    const handlePointerLeave = () => {
      mouse.active = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);

    // Render loop
    const render = () => {
      if (!isVisible) {
        animationFrameId = 0;
        return;
      }

      // Smooth mouse cursor physics
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
      } else {
        mouse.x += (-1000 - mouse.x) * 0.05;
        mouse.y += (-1000 - mouse.y) * 0.05;
      }

      // Progress animation time
      if (!isReducedMotion) {
        time += 0.012 * movement;
      }

      ctx.clearRect(0, 0, width, height);

      if (backgroundColor && backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      // Render flowing harmonic lines
      const stepY = height / (count + 1);
      const pointsPerLine = Math.max(30, Math.floor(width / 32));
      const stepX = width / (pointsPerLine - 1);

      ctx.lineWidth = 1.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i < count; i++) {
        const baseY = stepY * (i + 1);
        const lineOffset = (i / count) * Math.PI * 2;

        // Subtle gradient variation across lines (violet -> indigo -> lavender)
        const alpha = Math.sin((i / count) * Math.PI) * 0.22 + 0.06;
        ctx.strokeStyle = `rgba(139, 92, 246, ${alpha.toFixed(3)})`;

        ctx.beginPath();

        for (let j = 0; j < pointsPerLine; j++) {
          const x = j * stepX;

          // Wave equation: combination of multiple harmonic sine waves
          const wave1 = Math.sin(x * 0.0035 + time + lineOffset) * 16;
          const wave2 = Math.cos(x * 0.007 - time * 0.8 + lineOffset * 0.5) * 8;
          let y = baseY + wave1 + wave2;

          // Interactive ripple / cursor repulsion effect
          if (hover && mouse.x > -500) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < force) {
              const influence = (1 - dist / force);
              const angle = Math.atan2(dy, dx);
              // Displace away from cursor with smooth sine falloff
              y += Math.sin(influence * Math.PI) * 24 * Math.sin(angle);
            }
          }

          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      mediaQuery.removeEventListener("change", handleMotionChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [strokeColor, backgroundColor, count, movement, hover, force, resolution]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
      style={{ willChange: "transform" }}
    />
  );
}
