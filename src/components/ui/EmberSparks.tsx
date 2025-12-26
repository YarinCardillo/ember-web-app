/**
 * EmberSparks - Ambient fire spark animation overlay
 */

import { useEffect, useState } from 'react';

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
            bottom: '-10px',
            width: `${spark.size}px`,
            height: `${spark.size}px`,
            background: `radial-gradient(circle, #ffaa00 0%, #ff6b35 50%, transparent 100%)`,
            boxShadow: `0 0 ${spark.size * 2}px #ff6b35, 0 0 ${spark.size * 4}px #ffaa0066`,
            opacity: spark.opacity,
            animationDelay: `${spark.delay}s`,
            animationDuration: `${spark.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

