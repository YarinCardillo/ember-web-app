/**
 * TextMorph - Smoothly morphs between strings by animating shared characters
 * (layout) and fading the rest. Adapted from the portfolio's TextMorph.
 */

import { useId, useMemo } from "react";
import {
  AnimatePresence,
  motion,
  type Transition,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface TextMorphProps {
  children: string;
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
  variants?: Variants;
  transition?: Transition;
}

const DEFAULT_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 18,
  mass: 0.3,
};

export function TextMorph({
  children,
  as: Component = "span",
  className,
  style,
  variants,
  transition,
}: TextMorphProps): JSX.Element {
  const uniqueId = useId();

  const characters = useMemo(() => {
    const charCounts: Record<string, number> = {};
    return children.split("").map((char) => {
      const lowerChar = char.toLowerCase();
      charCounts[lowerChar] = (charCounts[lowerChar] || 0) + 1;
      return {
        id: `${uniqueId}-${lowerChar}${charCounts[lowerChar]}`,
        label: char === " " ? " " : char,
      };
    });
  }, [children, uniqueId]);

  return (
    <Component className={cn(className)} aria-label={children} style={style}>
      <AnimatePresence mode="popLayout" initial={false}>
        {characters.map((character) => (
          <motion.span
            key={character.id}
            layoutId={character.id}
            className="inline-block"
            aria-hidden="true"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants || DEFAULT_VARIANTS}
            transition={transition || DEFAULT_TRANSITION}
          >
            {character.label}
          </motion.span>
        ))}
      </AnimatePresence>
    </Component>
  );
}
