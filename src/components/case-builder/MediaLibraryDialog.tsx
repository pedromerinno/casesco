import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Search, UploadCloud, Film, Trash2, Loader2, AlertCircle } from "lucide-react";
import { getOptimizedUrl } from "@/lib/onmx/image";
import * as UpChunk from "@mux/upchunk";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import {
  getMediaLibrary,
  uploadToMediaLibrary,
  deleteFromMediaLibrary,
  createMuxUpload,
  syncMuxMedia,
  type MediaItem,
} from "@/lib/case-builder/media-queries";
import { useCompany } from "@/lib/company-context";
import { cn } from "@/lib/utils";

export type MediaSelection = {
  url: string;
  muxPlaybackId?: string;
};

function VideoThumbFallback({ url, displayName }: { url: string; displayName: string }) {
  const [fallback, setFallback] = React.useState(false);
  if (fallback) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Film className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }
  return (
    <video
      src={url}
      muted
      preload="metadata"
      playsInline
      className="w-full h-full object-cover bg-black/10"
      aria-label={displayName}
      onError={() => setFallback(true)}
    />
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selection: MediaSelection) => void;
  accept?: "image" | "video" | "all";
};

export default function MediaLibraryDialog({
  open,
  onOpenChange,
  onSelect,
  accept = "all",
}: Props) {
  const queryClient = useQueryClient();
  const { company } = useCompany();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"cards" | "list">(() => {
    if (typeof window === "undefined") return "cards";
    return (localStorage.getItem("media_library_view") as "cards" | "list") || "cards";
  });
  const lastMuxSyncAtRef = React.useRef<Record<string, number>>({});

  React.useEffect(() => {
    localStorage.setItem("media_library_view", viewMode);
  }, [viewMode]);

  const filter = accept === "all" ? undefined : accept;

  const mediaQuery = useQuery({
    queryKey: ["media-library", company.id, filter],
    queryFn: () => getMediaLibrary(company.id, filter),
    enabled: open,
    refetchInterval: (query) => {
      const data = query.state.data as MediaItem[] | undefined;
      const hasProcessing = (data ?? []).some(
        (i) => i.mux_status === "waiting" || i.mux_status === "preparing",
      );
      return hasProcessing ? 3000 : false;
    },
  });

  const rawItems = (mediaQuery.data as MediaItem[] | undefined) ?? [];
  const items = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rawItems;
    return rawItems.filter((item) => {
      const name =
        item.title ??
        item.storage_path?.split("/").filter(Boolean).pop() ??
        "";
      return name.toLowerCase().includes(q);
    });
  }, [rawItems, searchQuery]);
  const isLoading = mediaQuery.isLoading;

  // Safety net: if the webhook missed an event, we can still resolve the upload
  // by querying Mux using the stored upload id and updating `media_library`.
  React.useEffect(() => {
    if (!open) return;
    const now = Date.now();

    for (const item of items) {
      const processing =
        item.type === "video" &&
        (item.mux_status === "waiting" || item.mux_status === "preparing") &&
        !item.mux_playback_id;
      if (!processing) continue;

      const last = lastMuxSyncAtRef.current[item.id] ?? 0;
      if (now - last < 10_000) continue; // throttle per item
      lastMuxSyncAtRef.current[item.id] = now;

      syncMuxMedia(item.id).catch(() => {
        // silent (best-effort)
      });
    }
  }, [open, items]);

  function getDisplayName(item: MediaItem) {
    return (
      item.title ??
      item.storage_path?.split("/").filter(Boolean).pop() ??
      "arquivo"
    );
  }

  async function uploadOneFile(file: File): Promise<boolean> {
    if (file.type.startsWith("video/")) {
      const { uploadUrl, mediaId } = await createMuxUpload(company.id, file);

      await new Promise<void>((resolve, reject) => {
        const upload = UpChunk.createUpload({
          endpoint: uploadUrl,
          file,
          chunkSize: 5120,
        });

        upload.on("progress", (progress: { detail: number }) => {
          setUploadProgress(Math.round(progress.detail));
        });

        upload.on("success", () => resolve());
        upload.on("error", (err: { detail: { message: string } }) => {
          reject(new Error(err.detail.message));
        });
      });

      await syncMuxMedia(mediaId);
      return true;
    }

    await uploadToMediaLibrary(company.id, file);
    return true;
  }

  async function handleUpload(files: File | FileList) {
    const list = Array.from(files instanceof FileList ? files : [files]);
    if (list.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    let ok = 0;
    let failed = 0;

    for (const file of list) {
      try {
        await uploadOneFile(file);
        ok += 1;
      } catch (err: any) {
        failed += 1;
        toast.error(`${file.name}: ${err?.message ?? "Falha no envio."}`);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["media-library"] });

    if (ok > 0) {
      const hasVideo = list.some((f) => f.type.startsWith("video/"));
      if (list.length === 1) {
        toast.success(
          hasVideo
            ? "Upload concluído. O vídeo está sendo processado."
            : "Upload concluído.",
        );
      } else {
        toast.success(
          `${ok} arquivo(s) enviado(s)${failed > 0 ? `. ${failed} falha(s).` : "."}`,
        );
      }
    }
    setUploading(false);
    setUploadProgress(0);
  }

  async function handleDelete(e: React.MouseEvent, item: MediaItem) {
    e.stopPropagation();
    await deleteFromMediaLibrary(item.id);
    queryClient.invalidateQueries({ queryKey: ["media-library"] });
  }

  function handleSelect(item: MediaItem) {
    if (item.mux_playback_id) {
      onSelect({ url: item.url, muxPlaybackId: item.mux_playback_id });
    } else {
      onSelect({ url: item.url });
    }
    onOpenChange(false);
  }

  function isSelectable(item: MediaItem) {
    if (!item.mux_status) return true; // image or legacy video
    return item.mux_status === "ready";
  }

  const fileAccept =
    accept === "video"
      ? "video/*"
      : accept === "image"
        ? "image/png,image/jpeg,image/webp"
        : "image/png,image/jpeg,image/webp,video/*";

  React.useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Biblioteca de mídia</DialogTitle>
          <DialogDescription>
            Selecione um arquivo existente ou faça upload de um ou mais arquivos.
          </DialogDescription>
        </DialogHeader>

        {/* Buscar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar por nome do arquivo…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
            aria-label="Buscar na biblioteca"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4 mr-1" />
            )}
            {uploading ? "Enviando…" : "Fazer upload"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={fileAccept}
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) handleUpload(files);
              e.target.value = "";
            }}
          />
          {uploading && uploadProgress > 0 && (
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {uploadProgress}%
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 rounded-lg p-0.5 bg-muted/50 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={cn(
                "rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "cards"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Ver em cards"
              title="Cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Ver em lista"
              title="Lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Grid / List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Carregando…
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "Nenhum resultado para a busca."
                : "Nenhum arquivo na biblioteca. Faça upload para começar."}
            </div>
          ) : viewMode === "list" ? (
            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {items.map((item) => {
                const selectable = isSelectable(item);
                const processing =
                  item.mux_status === "waiting" ||
                  item.mux_status === "preparing";
                const errored = item.mux_status === "errored";

                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 bg-background hover:bg-muted/50 transition-colors",
                      !selectable && "opacity-70",
                    )}
                  >
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                      {item.type === "image" ? (
                        <img
                          src={getOptimizedUrl(item.url, { w: 200, q: 75 })}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : item.mux_playback_id ? (
                        <img
                          src={`https://image.mux.com/${item.mux_playback_id}/thumbnail.jpg?width=96&height=96&fit_mode=smartcrop`}
                          alt=""
                          className="w-full h-full object-cover bg-black/10"
                        />
                      ) : item.url ? (
                        <VideoThumbFallback url={item.url} displayName={getDisplayName(item)} />
                      ) : (
                        <Film className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {getDisplayName(item)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.type === "image" ? "Imagem" : "Vídeo"}</span>
                        {processing && (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processando…
                          </span>
                        )}
                        {errored && (
                          <span className="text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Erro
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!selectable}
                        onClick={() => selectable && handleSelect(item)}
                      >
                        Selecionar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, item)}
                        aria-label="Excluir da biblioteca"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {items.map((item) => {
                const selectable = isSelectable(item);
                const processing =
                  item.mux_status === "waiting" ||
                  item.mux_status === "preparing";
                const errored = item.mux_status === "errored";

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-lg border border-border overflow-hidden bg-muted aspect-square ${
                      selectable
                        ? "hover:ring-2 hover:ring-primary focus-within:ring-2 focus-within:ring-primary"
                        : "opacity-70"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!selectable}
                      onClick={() => selectable && handleSelect(item)}
                      className="absolute inset-0 w-full h-full cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                      tabIndex={selectable ? 0 : -1}
                    >
                      <span className="sr-only">
                        {selectable ? "Selecionar" : "Processando"}
                      </span>
                    </button>
                    {item.type === "image" ? (
                      <img
                        src={getOptimizedUrl(item.url, { w: 300, q: 75 })}
                        alt={getDisplayName(item)}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      />
                    ) : item.mux_playback_id ? (
                      <img
                        src={`https://image.mux.com/${item.mux_playback_id}/thumbnail.jpg?width=400&height=400&fit_mode=smartcrop`}
                        alt={getDisplayName(item)}
                        className="absolute inset-0 w-full h-full object-cover bg-black/10 pointer-events-none"
                      />
                    ) : item.url ? (
                      <div className="absolute inset-0 pointer-events-none">
                        <VideoThumbFallback url={item.url} displayName={getDisplayName(item)} />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Film className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    {processing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 pointer-events-none">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                        <span className="text-[10px] text-white mt-1">
                          Processando…
                        </span>
                      </div>
                    )}

                    {errored && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 pointer-events-none">
                        <AlertCircle className="h-6 w-6 text-red-400" />
                        <span className="text-[10px] text-red-400 mt-1">
                          Erro
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item)}
                      className={cn(
                        "absolute top-1 right-1 z-10 p-1 rounded bg-black/60 text-white transition-opacity hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-primary",
                        processing || errored
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                      )}
                      aria-label="Excluir da biblioteca"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>

                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 pointer-events-none">
                      <p className="text-[10px] text-white truncate">
                        {getDisplayName(item)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
