"use client";

import { useState, useRef, useEffect } from "react";
import { useBandwidth } from "@/contexts/BandwidthContext";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  lowQualitySrc?: string;
  placeholder?: string;
  threshold?: number;
}

export default function LazyImage({
  src,
  alt,
  lowQualitySrc,
  placeholder,
  threshold = 100,
  ...props
}: LazyImageProps) {
  const { isLowBandwidth } = useBandwidth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: threshold / 100 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
  };

  // In low-bandwidth mode, don't load images unless explicitly requested
  if (isLowBandwidth && !props.loading) {
    return (
      <div
        ref={imgRef}
        style={{
          width: props.width || "100%",
          height: props.height || "auto",
          background: placeholder || "var(--foreground)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted-foreground)",
          fontSize: 12,
          ...props.style,
        }}
      >
        {placeholder || "Image disabled in low-bandwidth mode"}
      </div>
    );
  }

  return (
    <>
      {!isLoaded && lowQualitySrc && (
        <img
          src={lowQualitySrc}
          alt={alt}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: props.width || "100%",
            height: props.height || "auto",
            filter: "blur(10px)",
            transition: "opacity 0.3s",
            opacity: isLoaded ? 0 : 1,
            ...props.style,
          }}
          {...props}
        />
      )}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: "opacity 0.3s",
          ...props.style,
        }}
        loading="lazy"
        {...props}
      />
      {error && (
        <div
          style={{
            width: props.width || "100%",
            height: props.height || "auto",
            background: "var(--foreground)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted-foreground)",
            fontSize: 12,
            ...props.style,
          }}
        >
          Failed to load image
        </div>
      )}
    </>
  );
}
