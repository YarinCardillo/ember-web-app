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
    const sparkCount = 12;
    const newSparks: Spark[] = [];

    for (let i = 0; i < sparkCount; i++) {
      newSparks.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 20,
        duration: 12 + Math.random() * 14,
        size: 2 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.35,
      });
    }

    setSparks(newSparks);
  }, []);

  const renderSpark = (spark: Spark) => (
    <div
      key={spark.id}
      className="absolute rounded-full"
      style={{
        left: `${spark.left}%`,
        bottom: "-10px",
        width: `${spark.size}px`,
        height: `${spark.size}px`,
        background: `radial-gradient(circle, ${accentBright} 0%, ${accentPrimary} 60%, transparent 100%)`,
        opacity: spark.opacity,
        animation: `ember-float ${spark.duration}s linear ${spark.delay}s infinite`,
      }}
    />
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {sparks.map(renderSpark)}
    </div>
  );
}
