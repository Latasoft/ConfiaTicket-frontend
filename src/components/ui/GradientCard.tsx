// src/components/ui/GradientCard.tsx
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type GradientType = "cyan" | "pink" | "purple" | "green";

interface GradientCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  gradient?: GradientType;
  to?: string;
  onClick?: () => void;
  className?: string;
}

const gradientClasses: Record<GradientType, string> = {
  cyan: "card-gradient-cyan",
  pink: "card-gradient-pink",
  purple: "card-gradient-purple",
  green: "card-gradient-green",
};

export default function GradientCard({
  title,
  description,
  gradient = "cyan",
  to,
  onClick,
  className = "",
}: GradientCardProps) {
  const baseClass = `${gradientClasses[gradient]} ${className}`;

  const content = (
    <>
      <h3 className="text-3xl font-display font-bold mb-3">{title}</h3>
      <p className="text-lg opacity-90 leading-relaxed">{description}</p>
      <div className="mt-6 inline-flex items-center gap-2 font-semibold">
        Ver más
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={baseClass}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={baseClass}>
      {content}
    </div>
  );
}
