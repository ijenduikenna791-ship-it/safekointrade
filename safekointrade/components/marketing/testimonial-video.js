"use client";

import { useEffect, useRef } from "react";

let activeVideo = null;

export function TestimonialVideo({ src, id }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !("IntersectionObserver" in window)) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            if (motionQuery.matches) continue;

            const previousVideo = activeVideo;
            activeVideo = video;
            if (previousVideo && previousVideo !== video) previousVideo.pause();

            video.muted = true;
            video.play().catch(() => {
              if (activeVideo === video) activeVideo = null;
            });
          } else {
            video.pause();
            if (activeVideo === video) activeVideo = null;
          }
        }
      },
      { threshold: [0, 0.65] },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
      if (activeVideo === video) activeVideo = null;
    };
  }, []);

  function handlePlay() {
    const video = videoRef.current;
    if (!video) return;
    const previousVideo = activeVideo;
    activeVideo = video;
    if (previousVideo && previousVideo !== video) previousVideo.pause();
  }

  function handlePause() {
    if (activeVideo === videoRef.current) activeVideo = null;
  }

  return (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      controls
      muted
      playsInline
      preload="none"
      onPlay={handlePlay}
      onPause={handlePause}
      aria-label={`Investor video ${id}`}
    >
      <source src={src} type="video/mp4" />
      Your browser does not support HTML video.
    </video>
  );
}
