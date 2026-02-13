import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { supabase } from "@/lib/supabase/client";
import { getPrimaryCompany } from "@/lib/onmx/company";

type PositioningMediaType = "image" | "video";

type PositioningMediaSettings = {
  type: PositioningMediaType;
  url: string;
  posterUrl?: string;
};

function looksLikeMissingColumnError(err: any) {
  return err?.code === "42703" || String(err?.message ?? "").toLowerCase().includes("column");
}

async function getPositioningMedia(): Promise<PositioningMediaSettings | null> {
  const company = await getPrimaryCompany();

  const { data, error } = await supabase
    .from("companies")
    .select("positioning_media_type,positioning_media_url,positioning_media_poster_url")
    .eq("id", company.id)
    .single();

  if (error) {
    if (looksLikeMissingColumnError(error)) return null;
    throw error;
  }

  const type = (data as any)?.positioning_media_type as PositioningMediaType | null;
  const url = String((data as any)?.positioning_media_url ?? "").trim();
  const posterUrl = String((data as any)?.positioning_media_poster_url ?? "").trim();

  if (!type || !url) return null;
  return { type, url, posterUrl: posterUrl || undefined };
}

const Positioning = () => {
  const { data: media } = useQuery({
    queryKey: ["site", "positioning-media"],
    queryFn: getPositioningMedia,
    staleTime: 5 * 60 * 1000,
  });

  const [reduceMotion, setReduceMotion] = React.useState(false);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const imagesRef = React.useRef<Array<HTMLImageElement>>([]);
  const frameIndexRef = React.useRef<number>(0);
  const line1Ref = React.useRef<HTMLDivElement | null>(null);
  const line2Ref = React.useRef<HTMLDivElement | null>(null);
  const line3Ref = React.useRef<HTMLDivElement | null>(null);

  const sequenceFrames = React.useMemo(() => {
    // Files in /public/sequence are named with 5-digit frame numbers.
    // Note: frame 00030 is missing in the exported set, so we skip it.
    const prefix =
      "freepik_faa-um-zoom-in-entrando-dentro-da-tela-do-computad_kling_1080p_16-9_24fps_34930_";
    const pad = (n: number) => String(n).padStart(5, "0");
    const frameNumbers = [
      ...Array.from({ length: 30 }, (_, i) => i), // 00000..00029
      ...Array.from({ length: 90 }, (_, i) => i + 31), // 00031..00120
    ];
    return frameNumbers.map((n) => `/sequence/${prefix}${pad(n)}.jpg`);
  }, []);

  const drawCoverFrame = React.useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const targetH = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const w = canvas.width;
    const h = canvas.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    // object-cover crop
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, dw, dh);
  }, []);

  // Progressive preload of the frame sequence (keeps scroll animation smooth).
  React.useEffect(() => {
    let cancelled = false;
    const imgs = sequenceFrames.map(() => new Image());
    imagesRef.current = imgs;

    // Load first frame ASAP for a quick paint.
    imgs[0].src = sequenceFrames[0];
    imgs[0].onload = () => {
      if (cancelled) return;
      drawCoverFrame(imgs[0]);
    };

    // Load the rest in small chunks to avoid blocking the main thread.
    let i = 1;
    const loadNext = () => {
      if (cancelled) return;
      if (i >= imgs.length) return;

      imgs[i].src = sequenceFrames[i];
      i += 1;
      window.setTimeout(loadNext, 12);
    };
    loadNext();

    return () => {
      cancelled = true;
    };
  }, [sequenceFrames, drawCoverFrame]);

  // Ensure we paint a frame as soon as the canvas has layout.
  React.useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const first = imagesRef.current[frameIndexRef.current] ?? imagesRef.current[0];
    if (first?.complete) {
      requestAnimationFrame(() => drawCoverFrame(first));
      return;
    }
  }, [reduceMotion, drawCoverFrame]);

  React.useLayoutEffect(() => {
    if (reduceMotion) return;
    if (!stageRef.current || !line1Ref.current || !line2Ref.current || !line3Ref.current)
      return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const lines = [line1Ref.current!, line2Ref.current!, line3Ref.current!];
      const enterY = 44;
      const exitY = -44;

      // Start with the first line visible so the section never looks "empty"
      // when it first hits the viewport. The rest start hidden below.
      gsap.set(lines, { autoAlpha: 0, y: enterY });
      gsap.set(lines[0], { autoAlpha: 1, y: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: stageRef.current,
          start: "top top",
          end: "bottom bottom",
          // Slight smoothing makes the reveal feel less "twitchy" on trackpads.
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });

      const enterDuration = 0.7;
      const holdDuration = 1.4; // reading time
      const exitDuration = 0.7;

      const animateLine = (el: HTMLElement, at: number) => {
        // Enter: bottom -> center
        tl.to(
          el,
          { autoAlpha: 1, y: 0, duration: enterDuration, ease: "none" },
          at,
        );
        // Hold: stay visible
        tl.to({}, { duration: holdDuration }, at + enterDuration);
        // Exit: center -> top
        tl.to(
          el,
          { autoAlpha: 0, y: exitY, duration: exitDuration, ease: "none" },
          at + enterDuration + holdDuration,
        );
        return at + enterDuration + holdDuration + exitDuration;
      };

      // Alternate: (line1 already visible) hold -> exit -> enter/hold/exit for the next lines.
      let t = 0;
      tl.to({}, { duration: holdDuration }, t);
      tl.to(lines[0], { autoAlpha: 0, y: exitY, duration: exitDuration, ease: "none" }, t + holdDuration);
      t = t + holdDuration + exitDuration;

      t = animateLine(lines[1], t);
      animateLine(lines[2], t);

      // Sequence frame scrub based on scroll progress.
      // We use a separate ScrollTrigger so we can compute frame index directly.
      let rafId = 0;
      const updateFrame = (progress: number) => {
        if (!imagesRef.current.length) return;
        const max = imagesRef.current.length - 1;
        const nextIndex = Math.max(0, Math.min(max, Math.floor(progress * max)));
        if (nextIndex === frameIndexRef.current) return;
        frameIndexRef.current = nextIndex;

        const img = imagesRef.current[nextIndex];
        if (!img) return;

        if (img.complete && (img.naturalWidth || img.width)) {
          drawCoverFrame(img);
          return;
        }

        img.onload = () => {
          if (frameIndexRef.current !== nextIndex) return;
          drawCoverFrame(img);
        };
      };

      const st = ScrollTrigger.create({
        trigger: stageRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (rafId) return;
          rafId = window.requestAnimationFrame(() => {
            rafId = 0;
            updateFrame(self.progress);
          });
        },
      });

      // Redraw on resize (keeps cover crop correct).
      const onResize = () => {
        const img = imagesRef.current[frameIndexRef.current];
        if (img?.complete) drawCoverFrame(img);
      };
      window.addEventListener("resize", onResize);

      // Ensure measurements are up to date (fonts/media can shift layout).
      requestAnimationFrame(() => ScrollTrigger.refresh());
      setTimeout(() => ScrollTrigger.refresh(), 250);

      return () => {
        if (rafId) window.cancelAnimationFrame(rafId);
        st.kill();
        window.removeEventListener("resize", onResize);
      };
    }, stageRef);

    return () => ctx.revert();
  }, [reduceMotion, drawCoverFrame]);

  React.useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    const onChange = () => setReduceMotion(Boolean(m.matches));
    onChange();
    // Safari < 14 fallback uses addListener/removeListener
    // eslint-disable-next-line deprecation/deprecation
    if (m.addEventListener) m.addEventListener("change", onChange);
    // eslint-disable-next-line deprecation/deprecation
    else m.addListener(onChange);
    return () => {
      // eslint-disable-next-line deprecation/deprecation
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      // eslint-disable-next-line deprecation/deprecation
      else m.removeListener(onChange);
    };
  }, []);

  const lineTextClass =
    "font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white";

  return (
    <section>
      <div className="px-6 md:px-12 lg:px-20">
        {/* Scroll stage: keep the card sticky until reveal finishes */}
        <div ref={stageRef} className="relative min-h-[260vh] md:min-h-[300vh]">
          <div className="sticky top-0 py-10 md:py-12">
            <div className="relative overflow-hidden rounded-3xl bg-card">
              {/* Background */}
              <div className="absolute inset-0" aria-hidden="true">
                {reduceMotion ? (
                  <OptimizedImage
                    src={sequenceFrames[0] || media?.url || "/ONMX_BG.jpg"}
                    alt=""
                    preset="hero"
                    widths={[960, 1440, 1920, 2560, 3200, 3840]}
                    sizes="100vw"
                    className="h-full w-full object-cover opacity-100"
                  />
                ) : (
                  <canvas
                    ref={canvasRef}
                    className="block h-full w-full"
                    aria-hidden="true"
                  />
                )}
                {/* Subtle dark layer for contrast */}
                <div className="absolute inset-0 bg-black/20" />
              </div>

              <div className="relative z-10 min-h-[82vh] md:min-h-[92vh] flex items-center justify-center px-6 md:px-12 lg:px-20">
                <div className="w-full max-w-5xl mx-auto text-center">
                  <div className="relative mx-auto w-full max-w-4xl min-h-[8rem] md:min-h-[10rem]">
                    <div
                      ref={line1Ref}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <h2 className={lineTextClass}>
                        ONMX® é onde campanhas viram movimento.
                      </h2>
                    </div>

                    <div
                      ref={line2Ref}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <p className={lineTextClass}>
                        Uma agência construída para operar no ritmo de empresas modernas
                      </p>
                    </div>

                    <div
                      ref={line3Ref}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <p className={lineTextClass}>
                        unindo branding, comunicação e produção em um fluxo integrado.
                      </p>
                    </div>
                  </div>

                  {reduceMotion ? (
                    <div className="mt-6 space-y-2 md:space-y-3">
                      <p className="text-base md:text-lg text-white/85">
                        ONMX® é onde campanhas viram movimento.
                      </p>
                      <p className="text-base md:text-lg text-white/85">
                        Uma agência construída para operar no ritmo de empresas modernas
                      </p>
                      <p className="text-base md:text-lg text-white/85">
                        unindo branding, comunicação e produção em um fluxo integrado.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Positioning;
