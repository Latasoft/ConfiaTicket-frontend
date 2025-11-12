// src/components/ui/VideoBackground.tsx
import { useEffect, useRef } from "react";

interface VideoBackgroundProps {
  videoUrl?: string;
  fallbackImage?: string;
  overlay?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function VideoBackground({
  videoUrl = "https://cdn.pixabay.com/video/2022/11/28/141046-776636897_large.mp4", // Default concert video
  fallbackImage = "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1920&q=80", // Concert crowd
  overlay = true,
  className = "",
  children,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      // Reducir velocidad del video para efecto cinematográfico
      videoRef.current.playbackRate = 0.75;
    }
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster={fallbackImage}
        >
          <source src={videoUrl} type="video/mp4" />
          {/* Fallback to image if video fails */}
          <img
            src={fallbackImage}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </video>

        {/* Gradient overlay for better text readability */}
        {overlay && <div className="video-overlay" />}
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
