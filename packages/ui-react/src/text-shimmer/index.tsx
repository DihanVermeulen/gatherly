"use client";
import React, { useMemo, type JSX } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextShimmerProps {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

export function TextShimmer({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) {
  const MotionComponent = motion(Component as keyof JSX.IntrinsicElements);

  const dynamicSpread = useMemo(() => {
    return children.length * spread * 2;
  }, [children, spread]);

  return (
    <MotionComponent
      className={cn(
        "relative inline-block bg-clip-text text-transparent bg-no-repeat",
        "bg-size-[250%_100%]",
        "[--base-color:#18181b] [--shimmer-color:#9ca3af]",
        "dark:[--base-color:#a1a1aa] dark:[--shimmer-color:#ffffff]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{
        repeat: Infinity,
        duration,
        ease: "linear",
      }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage: `linear-gradient(90deg, var(--base-color) calc(50% - var(--spread)), var(--shimmer-color) 50%, var(--base-color) calc(50% + var(--spread)))`,
        } as React.CSSProperties
      }
    >
      {children}
    </MotionComponent>
  );
}
