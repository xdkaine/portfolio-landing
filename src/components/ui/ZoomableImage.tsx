"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useMotionValue, animate } from "motion/react";
import { X, ZoomIn } from "lucide-react";

interface ZoomableImageProps {
  src: string;
  alt: string;
}

export function ZoomableImage({ src, alt }: ZoomableImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // Reset values when closing/opening
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      x.set(0);
      y.set(0);
      scale.set(1);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, x, y, scale]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom in/out to cursor, clamp between 0.5x and 5x
    const currentScale = scale.get();
    let newScale = currentScale;

    // Smooth proportional zoom
    if (e.deltaY < 0) {
      newScale *= 1.15; 
    } else {
      newScale /= 1.15;
    }

    newScale = Math.min(Math.max(0.5, newScale), 5);

    // Calculate ratio of change
    const ratio = newScale / currentScale;

    // Get current position
    const currentX = x.get();
    const currentY = y.get();

    // Mouse position relative to center of viewport
    const dx = e.clientX - window.innerWidth / 2;
    const dy = e.clientY - window.innerHeight / 2;

    // The point under the mouse moves outwards from the image center by the scale ratio.
    // We want to translate the image to keep that spot under the mouse.
    const newX = currentX * ratio - dx * (ratio - 1);
    const newY = currentY * ratio - dy * (ratio - 1);

    // Animate to new values
    animate(x, newX, { type: "spring", bounce: 0, duration: 0.3 });
    animate(y, newY, { type: "spring", bounce: 0, duration: 0.3 });
    animate(scale, newScale, { type: "spring", bounce: 0, duration: 0.3 });
  };

  return (
    <>
      <div 
        className="relative group cursor-zoom-in"
        onClick={() => setIsOpen(true)}
      >
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={1000}
          unoptimized
          className="block w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-surface/80 text-bone px-3 py-2 rounded-full backdrop-blur-sm border border-iron flex items-center gap-2 text-xs tracking-[0.2em]">
            <ZoomIn className="w-4 h-4" />
            <span>ENLARGE</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center overflow-hidden"
            onClick={() => setIsOpen(false)} // Click background to close
            onWheel={handleWheel}
            ref={containerRef}
          >
            {/* Controls */}
            <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
              <span className="text-ash text-xs tracking-[0.2em] hidden md:block select-none pointer-events-none">
                SCROLL TO ZOOM &bull; DRAG TO PAN
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="bg-surface/50 hover:bg-surface text-bone p-3 rounded-full border border-iron transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <motion.div
              className="relative w-full h-full flex items-center justify-center cursor-zoom-out"
              onClick={() => setIsOpen(false)} // Clicking open space around the image
            >
              <motion.img
                src={src}
                alt={alt}
                style={{ x, y, scale }}
                drag
                dragMomentum={false} // Prevents sliding away endlessly
                className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl select-none cursor-move"
                draggable={false}
                onClick={(e) => e.stopPropagation()} // Clicking image itself
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
