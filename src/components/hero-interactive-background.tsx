"use client";

import React, { useEffect, useRef } from "react";

interface HeroInteractiveBackgroundProps {
  /** Line stroke color. Defaults to subtle violet/indigo */
  strokeColor?: string;
  /** Canvas background fill. Defaults to transparent */
  backgroundColor?: string;
  /** Target grid cell spacing in pixels. Defaults to 46 */
  gridSize?: number;
  /** Base oscillation movement speed factor. Defaults to 0.75 */
  movement?: number;
  /** Whether mouse hover creates interactive ripple distortion */
  hover?: boolean;
  /** Force / radius of cursor interaction in pixels. Defaults to 180 */
  force?: number;
  /** Canvas resolution multiplier (DPI scaling). Defaults to clamped devicePixelRatio */
  resolution?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * High-performance full-width 2D interactive ripple grid canvas for AutoOps Hero.
 *
 * Key features:
 * - True edge-to-edge full-bleed grid with overscan coverage (no edge cutoffs or missing vertical lines)
 * - Uniform subtle violet/indigo stroke opacity across entire width (left, center, right)
 * - Dense, elegant 2D interconnected grid (horizontal + vertical flowing waves)
 * - Interactive cursor ripple physics and radial glow
 * - Automatically respects `prefers-reduced-motion`
 * - Automatically pauses via `IntersectionObserver` when off-screen for 0% idle CPU
 */
export function HeroInteractiveBackground({
  strokeColor = "rgba(139, 92, 246, 0.16)",
  backgroundColor = "transparent",
  gridSize = 46,
  movement = 0.75,
  hover = true,
  force = 180,
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
      x: -3000,
      y: -3000,
      targetX: -3000,
      targetY: -3000,
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

    // IntersectionObserver to pause when offscreen
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

    // Pointer move handler (tracked across window for edge smoothness)
    const handlePointerMove = (e: PointerEvent) => {
      if (!hover) return;
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
    };

    const handlePointerLeave = () => {
      mouse.active = false;
      mouse.targetX = -3000;
      mouse.targetY = -3000;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);

    // Render loop
    const render = () => {
      if (!isVisible) {
        animationFrameId = 0;
        return;
      }

      // Smooth mouse cursor physics with spring interpolation
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
      } else {
        mouse.x += (-3000 - mouse.x) * 0.05;
        mouse.y += (-3000 - mouse.y) * 0.05;
      }

      // Advance wave time
      if (!isReducedMotion) {
        time += 0.011 * movement;
      }

      ctx.clearRect(0, 0, width, height);

      if (backgroundColor && backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      if (width <= 0 || height <= 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Calculate grid counts dynamically with overscan margins to span far beyond screen borders
      const overscan = 60;
      const stepX = gridSize;
      const numCols = Math.ceil((width + overscan * 2) / stepX);

      const stepY = gridSize;
      const numRows = Math.ceil((height + overscan * 2) / stepY);

      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = strokeColor;

      // -------------------------------------------------------------
      // 1. Draw Horizontal Wave Lines (Full-bleed Left to Right)
      // -------------------------------------------------------------
      const hPointsCount = Math.max(50, Math.floor((width + overscan * 2) / 20));
      const hSampleStep = (width + overscan * 2) / (hPointsCount - 1);

      for (let i = 0; i <= numRows; i++) {
        const baseY = -overscan + i * stepY;
        const linePhase = (i / numRows) * Math.PI * 2;

        ctx.beginPath();

        for (let j = 0; j < hPointsCount; j++) {
          const x = -overscan + j * hSampleStep;

          // Harmonic 2D wave equations
          const wave1 = Math.sin(x * 0.003 + time + linePhase) * 11;
          const wave2 = Math.cos(x * 0.006 - time * 0.75 + (baseY * 0.003)) * 5;
          let y = baseY + wave1 + wave2;

          // Interactive cursor ripple
          if (hover && mouse.x > -2000) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < force) {
              const influence = 1 - dist / force;
              const angle = Math.atan2(dy, dx);
              // Smooth Gaussian-like curved displacement
              y += Math.sin(influence * Math.PI) * 22 * Math.sin(angle);
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

      // -------------------------------------------------------------
      // 2. Draw Vertical Wave Lines (Full-bleed Top to Bottom across entire width)
      // -------------------------------------------------------------
      const vPointsCount = Math.max(40, Math.floor((height + overscan * 2) / 20));
      const vSampleStep = (height + overscan * 2) / (vPointsCount - 1);

      for (let j = 0; j <= numCols; j++) {
        const baseX = -overscan + j * stepX;
        const colPhase = (j / numCols) * Math.PI * 2;

        ctx.beginPath();

        for (let i = 0; i < vPointsCount; i++) {
          const y = -overscan + i * vSampleStep;

          // Harmonic 2D wave equations (matched frequency & amplitude)
          const wave1 = Math.sin(y * 0.003 + time + colPhase) * 11;
          const wave2 = Math.cos(y * 0.006 - time * 0.75 + (baseX * 0.003)) * 5;
          let x = baseX + wave1 + wave2;

          // Interactive cursor ripple
          if (hover && mouse.x > -2000) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < force) {
              const influence = 1 - dist / force;
              const angle = Math.atan2(dy, dx);
              // Smooth Gaussian-like curved displacement
              x += Math.sin(influence * Math.PI) * 22 * Math.cos(angle);
            }
          }

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      // -------------------------------------------------------------
      // 3. Subtle Interactive Cursor Radial Glow Highlight
      // -------------------------------------------------------------
      if (hover && mouse.x > -2000 && mouse.y > -2000) {
        const glowRadius = force * 0.9;
        const glowGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          glowRadius
        );
        glowGrad.addColorStop(0, "rgba(168, 85, 247, 0.10)");
        glowGrad.addColorStop(0.5, "rgba(139, 92, 246, 0.05)");
        glowGrad.addColorStop(1, "rgba(139, 92, 246, 0)");

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
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
  }, [strokeColor, backgroundColor, gridSize, movement, hover, force, resolution]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
      style={{ willChange: "transform" }}
    />
  );
}
