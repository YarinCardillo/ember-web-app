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
    // Generate random sparks
    const sparkCount = 20;
    const newSparks: Spark[] = [];

    for (let i = 0; i < sparkCount; i++) {
      newSparks.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 15,
        duration: 8 + Math.random() * 12,
        size: 2 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.5,
      });
    }

    setSparks(newSparks);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {sparks.map((spark) => (
        <div
          key={spark.id}
          className="absolute rounded-full animate-ember-float"
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
          }}
        />
      ))}
    </div>
  );
}
