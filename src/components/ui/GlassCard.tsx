// src/components/ui/GlassCard.tsx
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "light";
}

export default function GlassCard({
  children,
  className = "",
  variant = "default",
}: GlassCardProps) {
  const baseClass = variant === "light" ? "glass-light" : "glass";

  return (
    <div className={`${baseClass} rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}
