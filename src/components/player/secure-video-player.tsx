"use client";

/**
 * Secure lesson video player with ABR (HLS via hls.js / DASH via dash.js).
 *
 * HARDENING NOTE: Disabling the context menu and hiding native download controls
 * only deters casual users. Determined attackers can still capture the stream
 * (devtools, screen recording, proxy tools). Real protection is:
 *   1) server-side enrollment checks + short-lived signed Cloudinary URLs
 *   2) per-viewer watermark overlays
 *   3) access logging / anomaly flags
 * Do not treat this UI layer as DRM.
 */

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  MediaPlayer,
  type MediaPlayerClass,
} from "dashjs";
import { Loader2, AlertCircle, Settings2 } from "lucide-react";

type Props = {
  lessonId: string;
  blockId?: string;
  initialWatchPosition?: number;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
};

type PlaybackFormat = "hls" | "dash" | "mp4";

type VideoUrlResponse = {
  url: string;
  mp4Url?: string;
  hlsUrl?: string | null;
  dashUrl?: string | null;
  format?: PlaybackFormat;
  sources?: {
    mp4?: string | null;
    hls?: string | null;
    dash?: string | null;
  };
  streamingStatus?: string;
  processing?: boolean;
  processingMessage?: string | null;
  dashProcessing?: boolean;
  watermarkText?: string;
  expiresAt: number;
  expiresInSec: number;
  blockId: string;
};

type QualityLevel = {
  id: string;
  label: string;
  /** -1 = auto */
  height: number;
};

function isSafariNativeHls(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isSafari =
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|CriOS|Edg|Firefox|Android/i.test(ua);
  return isSafari;
}

function pickSource(data: VideoUrlResponse): {
  format: PlaybackFormat;
  url: string;
} | null {
  const hls = data.hlsUrl ?? data.sources?.hls ?? null;
  const dash = data.dashUrl ?? data.sources?.dash ?? null;
  const mp4 = data.mp4Url ?? data.url ?? data.sources?.mp4 ?? null;

  // Prefer API-suggested format when URL is present
  if (data.format === "hls" && hls) return { format: "hls", url: hls };
  if (data.format === "dash" && dash) return { format: "dash", url: dash };
  if (hls) return { format: "hls", url: hls };
  if (dash) return { format: "dash", url: dash };
  if (mp4) return { format: "mp4", url: mp4 };
  return null;
}

export function SecureVideoPlayer({
  lessonId,
  blockId,
  initialWatchPosition = 0,
  onTimeUpdate,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<MediaPlayerClass | null>(null);

  const [playback, setPlayback] = useState<{
    format: PlaybackFormat;
    url: string;
  } | null>(null);
  const [watermarkText, setWatermarkText] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  /** Safari native HLS — quality selector must stay hidden. */
  const [nativeHls, setNativeHls] = useState(false);
  const appliedSeek = useRef(false);

  // Fetch signed playback URLs
  useEffect(() => {
    let cancelled = false;
    appliedSeek.current = false;

    async function loadSignedUrl() {
      setLoading(true);
      setError(null);
      setPlayback(null);
      setProcessingMessage(null);
      setQualities([]);
      setSelectedQuality("auto");
      setNativeHls(false);

      try {
        const qs = blockId ? `?blockId=${encodeURIComponent(blockId)}` : "";
        const res = await fetch(`/api/lessons/${lessonId}/video-url${qs}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as
          | VideoUrlResponse
          | { error?: string };

        if (!res.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Could not load secure video"
          );
        }

        if (cancelled) return;

        const payload = data as VideoUrlResponse;
        setWatermarkText(payload.watermarkText ?? null);

        if (payload.processing && payload.processingMessage) {
          setProcessingMessage(payload.processingMessage);
        }

        const source = pickSource(payload);
        if (!source) {
          if (payload.processing) {
            setError(
              payload.processingMessage ||
                "Video is still processing. Try again shortly."
            );
            return;
          }
          throw new Error("No playable video source");
        }

        setPlayback(source);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load video");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSignedUrl();
    return () => {
      cancelled = true;
    };
  }, [lessonId, blockId]);

  // Attach hls.js / dash.js / progressive based on format
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playback) return;

    let cancelled = false;

    function destroyPlayers() {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        dashRef.current.reset();
        dashRef.current = null;
      }
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    }

    destroyPlayers();
    setQualities([]);
    setSelectedQuality("auto");
    setNativeHls(false);

    const { format, url } = playback;

    if (format === "hls") {
      const useNative = !Hls.isSupported() && isSafariNativeHls();
      const canNative =
        video.canPlayType("application/vnd.apple.mpegurl") !== "";

      if (Hls.isSupported() && !isSafariNativeHls()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (cancelled) return;
          const levels: QualityLevel[] = [
            { id: "auto", label: "Auto", height: -1 },
            ...hls.levels.map((level, index) => ({
              id: String(index),
              label: level.height ? `${level.height}p` : `Level ${index + 1}`,
              height: level.height || 0,
            })),
          ];
          setQualities(levels);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || cancelled) return;
          if (data.response?.code === 423) {
            setError("Video is still processing. Try again shortly.");
            return;
          }
          setError("Playback error — try refreshing the page");
        });
      } else if (useNative || canNative) {
        // Safari: native HLS takes over — no custom quality UI
        setNativeHls(true);
        video.src = url;
      } else {
        setError("HLS playback is not supported in this browser");
      }
    } else if (format === "dash") {
      try {
        const player = MediaPlayer().create();
        dashRef.current = player;
        player.updateSettings({
          streaming: {
            abr: { autoSwitchBitrate: { video: true, audio: true } },
          },
        });
        player.initialize(video, url, false);

        player.on(MediaPlayer.events.STREAM_INITIALIZED, () => {
          if (cancelled) return;
          const reps = player.getRepresentationsByType("video") || [];
          const levels: QualityLevel[] = [
            { id: "auto", label: "Auto", height: -1 },
            ...reps.map((rep, index) => ({
              id: String(index),
              label: rep.height
                ? `${rep.height}p`
                : rep.bandwidth
                  ? `${Math.round(rep.bandwidth / 1000)} kbps`
                  : `Level ${index + 1}`,
              height: rep.height || 0,
            })),
          ];
          setQualities(levels);
        });

        player.on(MediaPlayer.events.ERROR, (e: { error?: { code?: number } }) => {
          if (cancelled) return;
          const code = e?.error?.code;
          if (code === 423) {
            setError("Video is still processing. Try again shortly.");
            return;
          }
          setError("DASH playback error — try refreshing the page");
        });
      } catch {
        setError("DASH playback is not supported in this browser");
      }
    } else {
      video.src = url;
    }

    return () => {
      cancelled = true;
      destroyPlayers();
    };
  }, [playback]);

  // Quality switching
  useEffect(() => {
    if (selectedQuality === "auto") {
      if (hlsRef.current) {
        hlsRef.current.currentLevel = -1;
      }
      if (dashRef.current) {
        dashRef.current.updateSettings({
          streaming: {
            abr: { autoSwitchBitrate: { video: true } },
          },
        });
      }
      return;
    }

    const index = Number(selectedQuality);
    if (Number.isNaN(index)) return;

    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
    }
    if (dashRef.current) {
      dashRef.current.updateSettings({
        streaming: {
          abr: { autoSwitchBitrate: { video: false } },
        },
      });
      dashRef.current.setRepresentationForTypeByIndex("video", index, true);
    }
  }, [selectedQuality]);

  // Resume watch position
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playback || appliedSeek.current) return;
    if (initialWatchPosition > 0) {
      const apply = () => {
        if (!appliedSeek.current && video.readyState >= 1) {
          video.currentTime = initialWatchPosition;
          appliedSeek.current = true;
        }
      };
      video.addEventListener("loadedmetadata", apply);
      apply();
      return () => video.removeEventListener("loadedmetadata", apply);
    }
  }, [playback, initialWatchPosition]);

  if (loading) {
    return (
      <div
        className={`flex aspect-video items-center justify-center bg-black text-white ${className ?? ""}`}
      >
        <Loader2 className="h-8 w-8 animate-spin opacity-70" />
      </div>
    );
  }

  if (error || !playback) {
    return (
      <div
        className={`flex aspect-video flex-col items-center justify-center gap-2 bg-black px-6 text-center text-sm text-white/80 ${className ?? ""}`}
      >
        <AlertCircle className="h-8 w-8 opacity-70" />
        <p>{error || "No video for this lesson"}</p>
        {processingMessage && error !== processingMessage && (
          <p className="text-xs text-white/50">{processingMessage}</p>
        )}
      </div>
    );
  }

  const showQualityUi =
    !nativeHls && qualities.length > 1 && playback.format !== "mp4";

  return (
    <div
      className={`relative overflow-hidden bg-black ${className ?? ""}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
        className="aspect-video w-full"
        onContextMenu={(e) => e.preventDefault()}
        onTimeUpdate={() => {
          if (videoRef.current && onTimeUpdate) {
            onTimeUpdate(videoRef.current.currentTime);
          }
        }}
      />

      {/* DOM watermark — ABR manifests cannot carry per-viewer Cloudinary overlays */}
      {watermarkText && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-10 end-3 max-w-[70%] truncate text-xs font-semibold text-white/45 select-none"
        >
          {watermarkText}
        </div>
      )}

      {processingMessage && playback.format === "mp4" && (
        <div className="absolute start-3 top-3 rounded bg-black/70 px-2 py-1 text-[11px] text-white/80">
          {processingMessage}
        </div>
      )}

      {showQualityUi && (
        <div className="absolute end-3 top-3 z-10">
          <button
            type="button"
            className="flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white/90 hover:bg-black/90"
            onClick={() => setShowQualityMenu((v) => !v)}
            aria-label="Quality"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {qualities.find((q) => q.id === selectedQuality)?.label ?? "Auto"}
          </button>
          {showQualityMenu && (
            <ul className="absolute end-0 mt-1 min-w-[7rem] overflow-hidden rounded bg-black/90 py-1 text-xs text-white shadow-lg">
              {qualities.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    className={`block w-full px-3 py-1.5 text-start hover:bg-white/10 ${
                      selectedQuality === q.id ? "text-primary font-semibold" : ""
                    }`}
                    onClick={() => {
                      setSelectedQuality(q.id);
                      setShowQualityMenu(false);
                    }}
                  >
                    {q.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
