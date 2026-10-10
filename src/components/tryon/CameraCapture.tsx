"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { captureVideoFrame, PhotoError, type PreparedPhoto } from "./image-tools";

/** Full-screen camera sheet. The stream stops as soon as the sheet closes. */
export function CameraCapture({ label, onCapture, onClose }: { label: string; onCapture: (p: PreparedPhoto) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setError(null);
      } catch {
        setError("We couldn’t open your camera. Please allow camera access, or upload a photo instead.");
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      try {
        if (videoRef.current) onCapture(captureVideoFrame(videoRef.current));
      } catch (e) {
        setError(e instanceof PhotoError ? e.message : "Capture failed. Please try again.");
      }
      setCount(null);
      return;
    }
    const t = setTimeout(() => setCount((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [count, onCapture]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Camera — ${label}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col bg-black/95 text-[#f8f5eb]"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#d4af37]">Camera · {label}</p>
        <button onClick={onClose} className="text-[0.62rem] uppercase tracking-[0.3em] text-white/70 hover:text-white">
          Close ✕
        </button>
      </div>
      <div className="relative mx-auto flex w-full max-w-xl flex-1 items-center justify-center overflow-hidden px-5">
        {error ? (
          <p className="max-w-sm text-center text-sm text-white/80">{error}</p>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="max-h-[70vh] w-full object-contain" style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }} />
            {/* Pose guide */}
            <svg aria-hidden viewBox="0 0 100 160" className="pointer-events-none absolute inset-0 m-auto h-[64vh] opacity-40">
              <path d="M50 14a10 10 0 1 1 0 20 10 10 0 0 1 0-20ZM34 40h32l8 46-8 2-4-28v96H54v-58h-8v58H38V60l-4 28-8-2 8-46Z" fill="none" stroke="#d4af37" strokeWidth="0.8" strokeDasharray="2 2" />
            </svg>
            {count !== null && count > 0 && (
              <motion.span key={count} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute font-display text-8xl text-[#d4af37]">
                {count}
              </motion.span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-center gap-6 px-5 py-6">
        <button onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} className="border border-white/25 px-4 py-2.5 text-[0.6rem] uppercase tracking-[0.25em] text-white/80">
          Flip
        </button>
        <button
          onClick={() => setCount(3)}
          disabled={!!error || count !== null}
          aria-label="Take photo in 3 seconds"
          className="grid h-16 w-16 place-items-center rounded-full border-2 border-[#d4af37] disabled:opacity-40"
        >
          <span className="h-12 w-12 rounded-full bg-[#d4af37]" />
        </button>
        <span className="w-[68px] text-center text-[0.55rem] uppercase tracking-[0.2em] text-white/50">3s timer</span>
      </div>
    </motion.div>
  );
}
