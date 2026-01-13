/**
 * EmberSparks - Ambient fire spark animation overlay
 */

import { useEffect, useState, useMemo } from "react";

interface Spark {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  aboveContent: boolean;
  swayAmount: number;
  pulseSpeed: number;
}

export function EmberSparks(): JSX.Element {
  const [sparks, setSparks] = useState<Spark[]>([]);

  // Get CSS variables for colors
  const accentPrimary = useMemo(() => {
    if (typeof window !== "undefined") {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent-primary")
          .trim() || "#F59E0B"
      );
    }
    return "#F59E0B";
  }, []);

  const accentBright = useMemo(() => {
    if (typeof window !== "undefined") {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--amber-glow")
          .trim() || "#FBBF24"
      );
    }
    return "#FBBF24";
  }, []);

  useEffect(() => {
    // Generate random sparks
    const sparkCount = 30;
    const newSparks: Spark[] = [];

    for (let i = 0; i < sparkCount; i++) {
      newSparks.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 20,
        duration: 10 + Math.random() * 15,
        size: 2 + Math.random() * 4,
        opacity: 0.4 + Math.random() * 0.5,
        aboveContent: Math.random() > 0.7,
        swayAmount: 15 + Math.random() * 30,
        pulseSpeed: 1 + Math.random() * 2,
      });
    }

    setSparks(newSparks);
  }, []);

  // Split sparks into background and foreground layers
  const backgroundSparks = sparks.filter((s) => !s.aboveContent);
  const foregroundSparks = sparks.filter((s) => s.aboveContent);

  const renderSpark = (spark: Spark) => (
    <div
      key={spark.id}
      className="absolute rounded-full"
      style={{
        left: `${spark.left}%`,
        bottom: "-10px",
        width: `${spark.size}px`,
        height: `${spark.size}px`,
        background: `radial-gradient(circle, ${accentBright} 0%, ${accentPrimary} 50%, transparent 100%)`,
        boxShadow: `0 0 ${spark.size * 2}px ${accentPrimary}, 0 0 ${spark.size * 4}px ${accentBright}50`,
        opacity: spark.opacity * 0.7,
        animationDelay: `${spark.delay}s`,
        animationDuration: `${spark.duration}s`,
        // CSS custom properties for variation
        ["--sway-amount" as string]: `${spark.swayAmount}px`,
        ["--pulse-speed" as string]: `${spark.pulseSpeed}s`,
        animation: `ember-float ${spark.duration}s linear ${spark.delay}s infinite, ember-sway ${6 + Math.random() * 8}s ease-in-out ${spark.delay}s infinite, ember-pulse ${spark.pulseSpeed}s ease-in-out ${spark.delay}s infinite`,
      }}
    />
  );

  return (
    <>
      {/* Background layer - behind cards */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {backgroundSparks.map(renderSpark)}
      </div>
      {/* Foreground layer - above cards */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
        {foregroundSparks.map(renderSpark)}
      </div>
    </>
  );
}
