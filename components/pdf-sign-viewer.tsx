"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PdfPickPayload, PdfPlacementVisual } from "@/types/pdf-sign";

export type { PdfPickPayload, PdfPlacementVisual };

const BOX_W = 120;
const BOX_H = 44;

function useContainerContentWidth(ref: RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setW(Math.max(0, Math.floor(r.width)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function placementToDisplay(
  p: PdfPlacementVisual,
  layoutW: number,
  layoutH: number,
): { left: number; top: number } {
  const rw = p.widthPx > 0 ? p.widthPx : layoutW;
  const rh = p.heightPx > 0 ? p.heightPx : layoutH;
  return {
    left: (p.x / rw) * layoutW,
    top: (p.y / rh) * layoutH,
  };
}

function PdfCanvasPage({
  pdf,
  pageNumber,
  containerWidth,
  readOnly,
  activeSignatoryLabel,
  placements,
  onPick,
  onRemovePlacement,
  onMovePlacement,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  containerWidth: number;
  readOnly: boolean;
  activeSignatoryLabel: string;
  placements: PdfPlacementVisual[];
  onPick: (p: PdfPickPayload) => void;
  onRemovePlacement: (placementId: string) => void;
  onMovePlacement: (placementId: string, p: PdfPickPayload) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<{ w: number; h: number } | null>(null);
  const [layout, setLayout] = useState<{ w: number; h: number } | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    void (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.max(0.1, containerWidth / base.width);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);

        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
        if (!cancelled) {
          const L = { w: viewport.width, h: viewport.height };
          layoutRef.current = L;
          setLayout(L);
        }
      } catch {
        /* cancelado o error de render */
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, containerWidth]);

  const pagePlacements = placements.filter((p) => p.page === pageNumber);

  const handleWrapPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (readOnly || draggingId) return;
      const el = wrapRef.current;
      const L = layoutRef.current;
      if (!el || !L) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > L.w || y > L.h) {
        setGhost(null);
        return;
      }
      setGhost({
        x: Math.max(0, Math.min(x, L.w - BOX_W)),
        y: Math.max(0, Math.min(y, L.h - BOX_H)),
      });
    },
    [readOnly, draggingId],
  );

  const handleWrapLeave = useCallback(() => {
    if (!draggingId) setGhost(null);
  }, [draggingId]);

  const handleWrapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly) return;
      const t = e.target as HTMLElement;
      if (t.closest("[data-placement-marker]") || t.closest("[data-placement-remove]")) return;
      const el = wrapRef.current;
      const L = layoutRef.current;
      if (!el || !L) return;
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const x = Math.max(0, Math.min(cx, L.w - BOX_W));
      const y = Math.max(0, Math.min(cy, L.h - BOX_H));
      onPick({
        page: pageNumber,
        x,
        y,
        widthPx: L.w,
        heightPx: L.h,
      });
    },
    [readOnly, onPick, pageNumber],
  );

  const beginMarkerDrag = useCallback(
    (p: PdfPlacementVisual, e: React.PointerEvent) => {
      if (readOnly) return;
      if ((e.target as HTMLElement).closest("[data-placement-remove]")) return;
      e.stopPropagation();
      e.preventDefault();
      const L = layoutRef.current;
      if (!L) return;
      const { left, top } = placementToDisplay(p, L.w, L.h);
      setGhost(null);
      setDraggingId(p.id);
      setDragDelta({ dx: 0, dy: 0 });
      const startX = e.clientX;
      const startY = e.clientY;
      const move = (ev: PointerEvent) => {
        setDragDelta({ dx: ev.clientX - startX, dy: ev.clientY - startY });
      };
      let finished = false;
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        if (finished) return;
        finished = true;
        const Lay = layoutRef.current;
        if (!Lay) {
          setDraggingId(null);
          setDragDelta(null);
          return;
        }
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let dispLeft = left + dx;
        let dispTop = top + dy;
        dispLeft = Math.max(0, Math.min(dispLeft, Lay.w - BOX_W));
        dispTop = Math.max(0, Math.min(dispTop, Lay.h - BOX_H));
        onMovePlacement(p.id, {
          page: pageNumber,
          x: dispLeft,
          y: dispTop,
          widthPx: Lay.w,
          heightPx: Lay.h,
        });
        setDraggingId(null);
        setDragDelta(null);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
      window.addEventListener("pointercancel", up, { once: true });
    },
    [readOnly, onMovePlacement, pageNumber],
  );

  const labelInside = activeSignatoryLabel.trim() || "Firma aquí";

  return (
    <div
      ref={wrapRef}
      className={cn("relative mx-auto w-fit py-2", !readOnly && "cursor-crosshair")}
      onPointerMove={handleWrapPointerMove}
      onPointerLeave={handleWrapLeave}
      onClick={handleWrapClick}
    >
      <canvas ref={canvasRef} className="relative z-0 block rounded-sm bg-white shadow-sm dark:bg-white" />
      {layout ? (
        <div
          className="pointer-events-none absolute left-0 top-0 z-[1]"
          style={{ width: layout.w, height: layout.h }}
        >
          {!readOnly && ghost && !draggingId ? (
            <div
              className="pointer-events-none absolute border-2 border-primary bg-primary/20 text-center shadow-sm"
              style={{ left: ghost.x, top: ghost.y, width: BOX_W, height: BOX_H }}
            >
              <span className="flex h-full items-center justify-center px-1 text-[10px] font-medium leading-tight text-primary">
                {labelInside}
              </span>
            </div>
          ) : null}
          {pagePlacements.map((p) => {
            const { left, top } = placementToDisplay(p, layout.w, layout.h);
            const dx = dragDelta && draggingId === p.id ? dragDelta.dx : 0;
            const dy = dragDelta && draggingId === p.id ? dragDelta.dy : 0;
            let dispLeft = left + dx;
            let dispTop = top + dy;
            dispLeft = Math.max(0, Math.min(dispLeft, layout.w - BOX_W));
            dispTop = Math.max(0, Math.min(dispTop, layout.h - BOX_H));
            return (
              <div
                key={p.id}
                data-placement-marker
                className="pointer-events-auto absolute z-[2] cursor-grab border-2 border-primary bg-primary/20 shadow-sm active:cursor-grabbing"
                style={{ left: dispLeft, top: dispTop, width: BOX_W, height: BOX_H }}
                onPointerDown={(e) => beginMarkerDrag(p, e)}
              >
                {!readOnly ? (
                  <button
                    type="button"
                    data-placement-remove
                    className="pointer-events-auto absolute -right-1 -top-1 z-[3] flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-destructive/40 bg-background text-destructive shadow hover:bg-destructive/10"
                    title="Quitar marca"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onRemovePlacement(p.id);
                    }}
                  >
                    <X className="h-3 w-3" aria-hidden />
                    <span className="sr-only">Quitar marca</span>
                  </button>
                ) : null}
                <span className="pointer-events-none flex h-full items-center justify-center px-1 text-center text-[10px] font-medium leading-tight text-primary">
                  {p.signatoryName || labelInside}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function PdfSignViewer({
  fileUrl,
  readOnly,
  placements,
  activeSignatoryLabel,
  onPick,
  onRemovePlacement,
  onMovePlacement,
}: {
  fileUrl: string;
  readOnly: boolean;
  placements: PdfPlacementVisual[];
  activeSignatoryLabel: string;
  onPick: (p: PdfPickPayload) => void;
  onRemovePlacement: (placementId: string) => void;
  onMovePlacement: (placementId: string, p: PdfPickPayload) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const outerWidth = useContainerContentWidth(scrollRef);
  const innerWidth = Math.max(120, (outerWidth > 0 ? outerWidth : 640) - 24);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const loadingTaskRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setPdf(null);
    setNumPages(0);
    loadingTaskRef.current = null;

    void import("pdfjs-dist")
      .then(async (pdfjs) => {
        if (cancelled || typeof window === "undefined") return;

        pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;

        const resolved =
          fileUrl.startsWith("http://") || fileUrl.startsWith("https://")
            ? fileUrl
            : `${window.location.origin}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;

        const res = await fetch(resolved, { credentials: "same-origin", cache: "no-store" });
        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? "No autorizado al obtener el PDF (sesión). Recarga la página o vuelve a entrar."
              : `El servidor devolvió HTTP ${res.status} al pedir el PDF.`,
          );
        }
        const buf = await res.arrayBuffer();
        if (buf.byteLength < 8) {
          throw new Error("La respuesta del PDF está vacía o es demasiado pequeña.");
        }
        const head = new Uint8Array(buf.slice(0, 5));
        const sig = String.fromCharCode(...head);
        if (sig !== "%PDF-") {
          throw new Error(
            "La respuesta no es un PDF (p. ej. HTML de error o login). Revisa sesión, token DIGID y la URL del documento.",
          );
        }

        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buf),
          useSystemFonts: true,
        });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        setPdf(doc);
        setNumPages(doc.numPages);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "No se pudo cargar el PDF.");
        }
      });

    return () => {
      cancelled = true;
      void loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
    };
  }, [fileUrl]);

  return (
    <div className="space-y-2">
      {readOnly ? (
        <p className="text-sm text-muted-foreground">
          Vista de solo lectura. Las marcas de firma se muestran en su posición guardada.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Haz clic en la página para colocar un recuadro de firma, arrástralo para ajustar.
        </p>
      )}
      <div
        ref={scrollRef}
        className="flex h-[min(720px,75vh)] min-h-[200px] w-full min-w-0 flex-col overflow-auto rounded-lg border bg-muted/20 shadow-inner"
      >
        {loadError ? (
          <p className="p-4 text-sm text-destructive">{loadError}</p>
        ) : null}
        {!loadError && !pdf ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando PDF…</p>
        ) : null}
        {pdf && numPages > 0
          ? Array.from({ length: numPages }, (_, i) => (
              <PdfCanvasPage
                key={`${fileUrl}-${i + 1}`}
                pdf={pdf}
                pageNumber={i + 1}
                containerWidth={innerWidth}
                readOnly={readOnly}
                activeSignatoryLabel={activeSignatoryLabel}
                placements={placements}
                onPick={onPick}
                onRemovePlacement={onRemovePlacement}
                onMovePlacement={onMovePlacement}
              />
            ))
          : null}
      </div>
      {pdf && numPages > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {numPages} página{numPages === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}
