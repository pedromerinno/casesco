import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, Film, Trash2, Loader2, AlertCircle } from "lucide-react";
import * as UpChunk from "@mux/upchunk";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const lastMuxSyncAtRef = React.useRef<Record<string, number>>({});

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

  const items = (mediaQuery.data as MediaItem[] | undefined) ?? [];
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

  async function handleUpload(file: File) {
    if (file.type.startsWith("video/")) {
      // Video upload via Mux
      setUploading(true);
      setUploadProgress(0);
      try {
        const { uploadUrl, mediaId } = await createMuxUpload(company.id, file);

        await new Promise<void>((resolve, reject) => {
          const upload = UpChunk.createUpload({
            endpoint: uploadUrl,
            file,
            chunkSize: 5120, // 5MB chunks
          });

          upload.on("progress", (progress: { detail: number }) => {
            setUploadProgress(Math.round(progress.detail));
          });

          upload.on("success", () => {
            resolve();
          });

          upload.on("error", (err: { detail: { message: string } }) => {
            reject(new Error(err.detail.message));
          });
        });

        // Try to sync immediately (covers webhook misfires / timing issues)
        await syncMuxMedia(mediaId);
        queryClient.invalidateQueries({ queryKey: ["media-library"] });
        toast.success("Upload concluído. O vídeo está sendo processado.");
      } catch (err: any) {
        toast.error(err?.message ?? "Não foi possível enviar o vídeo.");
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    } else {
      // Image upload via Supabase Storage (unchanged)
      setUploading(true);
      try {
        await uploadToMediaLibrary(company.id, file);
        queryClient.invalidateQueries({ queryKey: ["media-library"] });
        toast.success("Upload concluído.");
      } catch (err: any) {
        toast.error(err?.message ?? "Não foi possível enviar o arquivo.");
      } finally {
        setUploading(false);
      }
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Biblioteca de mídia</DialogTitle>
          <DialogDescription>
            Selecione um arquivo existente ou faça upload de um novo.
          </DialogDescription>
        </DialogHeader>

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
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
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
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Carregando…
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Nenhum arquivo na biblioteca. Faça upload para começar.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                        src={item.url}
                        alt={getDisplayName(item)}
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

                    {/* Processing overlay */}
                    {processing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 pointer-events-none">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                        <span className="text-[10px] text-white mt-1">
                          Processando…
                        </span>
                      </div>
                    )}

                    {/* Error overlay */}
                    {errored && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 pointer-events-none">
                        <AlertCircle className="h-6 w-6 text-red-400" />
                        <span className="text-[10px] text-red-400 mt-1">
                          Erro
                        </span>
                      </div>
                    )}

                    {/* Delete button: fora do botão desabilitado para funcionar em itens processando */}
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

                    {/* Filename overlay */}
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
