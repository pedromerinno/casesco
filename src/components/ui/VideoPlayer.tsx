import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
} from "lucide-react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";

const isColorDark = (hex: string): boolean => {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.08;
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

function ProgressBar({
  value,
  onChange,
  color = "#9D00F2",
  light = false,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  color?: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("relative w-full cursor-pointer", className)}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        onChange(Math.min(Math.max(percentage, 0), 100));
      }}
    >
      <div
        className={cn(
          "h-[7px] w-full rounded-[10px]",
          light ? "bg-[rgba(255,255,255,0.25)]" : "bg-[rgba(0,0,0,0.19)]",
        )}
      />
      <div
        className="absolute left-0 top-1/2 h-[7px] -translate-y-1/2 rounded-[10px]"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
      <div
        className="absolute top-1/2 h-[17px] w-[17px] -translate-y-1/2 rounded-full"
        style={{ left: `calc(${value}% - 8.5px)`, backgroundColor: color }}
      />
    </div>
  );
}

export interface VideoPlayerProps {
  src: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  accentColor?: string;
  aspectRatio?: string;
  onEnded?: () => void;
}

export default function VideoPlayer({
  src,
  className,
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
  accentColor = "#9D00F2",
  aspectRatio,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const previousVolumeRef = useRef(1);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // --- HLS / direct source setup ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const isHLS = src.includes(".m3u8") || src.includes("stream.mux.com");

    if (isHLS) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startLevel: -1,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          capLevelToPlayerSize: true,
        });

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (video.duration) setDuration(video.duration);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setIsLoading(false);
                break;
            }
          }
        });

        hlsRef.current = hls;
        return () => {
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        };
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = src;
        const onMeta = () => {
          setIsLoading(false);
          if (video.duration) setDuration(video.duration);
        };
        video.addEventListener("loadedmetadata", onMeta);
        return () => {
          video.removeEventListener("loadedmetadata", onMeta);
          video.src = "";
        };
      } else {
        setIsLoading(false);
      }
    } else {
      video.src = src;
      const onMeta = () => {
        setIsLoading(false);
        if (video.duration) setDuration(video.duration);
      };
      video.addEventListener("loadedmetadata", onMeta);
      return () => {
        video.removeEventListener("loadedmetadata", onMeta);
        video.src = "";
      };
    }
  }, [src]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = muted;
    setIsMuted(muted);
    if (muted) previousVolumeRef.current = volume || 1;
  }, [muted]);

  // --- Playback controls ---
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const pct = (video.currentTime / video.duration) * 100;
    const safePct = isFinite(pct) ? pct : 0;
    setProgress(safePct);
    setCurrentTime(video.currentTime);
    if (video.duration) setDuration(video.duration);
  };

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video?.duration) return;
    const time = (value / 100) * video.duration;
    if (isFinite(time)) {
      video.currentTime = time;
      setProgress(value);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!isMuted) {
      previousVolumeRef.current = volume || 1;
      video.muted = true;
      video.volume = 0;
      setVolume(0);
      setIsMuted(true);
    } else {
      const restored = previousVolumeRef.current || 1;
      video.muted = false;
      video.volume = restored;
      setVolume(restored);
      setIsMuted(false);
    }
  };

  const handleVolumeChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = value / 100;
    video.volume = newVolume;
    video.muted = newVolume === 0;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (newVolume > 0) previousVolumeRef.current = newVolume;
  };

  // --- Fullscreen ---
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!isFullscreen) {
      if (container.requestFullscreen) container.requestFullscreen();
      else if ((container as any).webkitRequestFullscreen)
        (container as any).webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen)
        (document as any).webkitExitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement
        ),
      );
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener(
      "webkitfullscreenchange",
      handleFullscreenChange,
    );
    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  // --- Speed ---
  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

  const handleSpeedChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setShowSpeedMenu(false);
  };

  useEffect(() => {
    if (!showSpeedMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        speedMenuRef.current &&
        !speedMenuRef.current.contains(e.target as Node)
      ) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSpeedMenu]);

  // --- No controls mode: render bare <video> ---
  if (!controls) {
    return (
      <video
        ref={videoRef}
        className={cn("w-full h-auto object-cover", className)}
        style={{ aspectRatio, display: "block" }}
        autoPlay={autoPlay}
        muted={muted || autoPlay}
        loop={loop}
        playsInline
        onEnded={onEnded}
      />
    );
  }

  const lightControls = isColorDark(accentColor);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden bg-[#111111]",
        className,
      )}
      style={{ aspectRatio }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
        onLoadedMetadata={() => {
          if (videoRef.current?.duration)
            setDuration(videoRef.current.duration);
          setIsLoading(false);
        }}
        onClick={togglePlay}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
      />

      {/* Custom controls bar */}
      <div
        className={cn(
          "absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-[22px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          showControls
            ? "translate-y-0"
            : "translate-y-[calc(100%+12px)]",
        )}
      >
        {/* Left group: play, volume, time */}
        <div
          className={cn(
            "flex items-center gap-1 rounded-[100px] backdrop-blur-sm p-[6px]",
            lightControls
              ? "bg-[rgba(255,255,255,0.25)]"
              : "bg-[rgba(0,0,0,0.25)]",
          )}
        >
          {/* Play/Pause */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className={cn(
              "flex h-[35px] w-[35px] items-center justify-center rounded-full",
              lightControls
                ? "bg-[rgba(255,255,255,0.5)] text-black"
                : "bg-[rgba(40,40,40,0.45)] text-white",
            )}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>

          {/* Volume */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className={cn(
                "flex h-[35px] w-[35px] items-center justify-center rounded-[31px]",
                lightControls
                  ? "bg-[rgba(255,255,255,0.5)] text-black"
                  : "bg-[rgba(40,40,40,0.45)] text-white",
              )}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : volume > 0.5 ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <Volume1 className="h-4 w-4" />
              )}
            </button>

            {showVolumeSlider && (
              <div
                className={cn(
                  "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center rounded-[12px] backdrop-blur-sm px-2 py-3",
                  lightControls
                    ? "bg-[rgba(255,255,255,0.85)]"
                    : "bg-[rgba(40,40,40,0.85)]",
                )}
              >
                <div
                  className={cn(
                    "relative h-[100px] w-[6px] cursor-pointer rounded-full",
                    lightControls
                      ? "bg-[rgba(0,0,0,0.15)]"
                      : "bg-[rgba(255,255,255,0.2)]",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = rect.bottom - e.clientY;
                    const percentage = (y / rect.height) * 100;
                    handleVolumeChange(
                      Math.min(Math.max(percentage, 0), 100),
                    );
                  }}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-full"
                    style={{
                      height: `${(isMuted ? 0 : volume) * 100}%`,
                      backgroundColor: accentColor,
                    }}
                  />
                  <div
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 h-[12px] w-[12px] rounded-full",
                      lightControls ? "bg-black/80" : "bg-white",
                    )}
                    style={{
                      bottom: `calc(${(isMuted ? 0 : volume) * 100}% - 6px)`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Time */}
          <div
            className={cn(
              "flex h-[35px] items-center rounded-[48px] px-[10px] text-[12px] whitespace-nowrap",
              lightControls
                ? "bg-[rgba(255,255,255,0.5)] text-black"
                : "bg-[rgba(40,40,40,0.45)] text-white",
            )}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Center: progress bar */}
        <div className="flex flex-1 items-center self-stretch">
          <div
            className={cn(
              "flex h-full w-full items-center rounded-[22px] px-[30px] py-[8px] backdrop-blur-sm",
              lightControls
                ? "bg-[rgba(255,255,255,0.25)]"
                : "bg-[rgba(0,0,0,0.25)]",
            )}
          >
            <ProgressBar
              value={progress}
              onChange={handleSeek}
              color={accentColor}
              light={lightControls}
            />
          </div>
        </div>

        {/* Right group: speed, fullscreen */}
        <div className="flex items-center gap-1 self-stretch">
          <div className="relative" ref={speedMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSpeedMenu((v) => !v);
              }}
              className={cn(
                "flex h-full items-center rounded-[48px] px-[14px] py-[10px] text-[12px] font-medium backdrop-blur-sm",
                lightControls
                  ? "bg-[rgba(255,255,255,0.5)] text-black"
                  : "bg-[rgba(40,40,40,0.45)] text-white",
              )}
            >
              {playbackRate === 1 ? "1x" : `${playbackRate}x`}
            </button>

            {showSpeedMenu && (
              <div
                className={cn(
                  "absolute bottom-full right-0 mb-2 flex flex-col rounded-[12px] backdrop-blur-sm py-1 min-w-[80px]",
                  lightControls
                    ? "bg-[rgba(255,255,255,0.9)]"
                    : "bg-[rgba(30,30,30,0.9)]",
                )}
              >
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeedChange(rate);
                    }}
                    className={cn(
                      "px-3 py-1.5 text-[12px] text-left transition-colors",
                      lightControls
                        ? "text-black hover:bg-black/10"
                        : "text-white hover:bg-white/10",
                      playbackRate === rate && "font-bold",
                    )}
                    style={
                      playbackRate === rate
                        ? { color: accentColor }
                        : undefined
                    }
                  >
                    {rate === 1 ? "Normal" : `${rate}x`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className={cn(
              "flex h-full items-center rounded-[48px] px-[24px] py-[10px]",
              lightControls
                ? "bg-[rgba(255,255,255,0.5)] text-black"
                : "bg-[rgba(40,40,40,0.45)] text-white",
            )}
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
