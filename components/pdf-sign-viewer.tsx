"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { cn } from "@/lib/utils";
import type { PdfPickPayload } from "@/types/pdf-sign";

export type { PdfPickPayload };

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

function PdfCanvasPage({
  pdf,
  pageNumber,
  containerWidth,
  markMode,
  onPick,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  containerWidth: number;
  markMode: boolean;
  onPick: (p: PdfPickPayload) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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
      } catch {
        /* cancelado o error de render */
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, containerWidth]);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!markMode) return;
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      onPick({
        page: pageNumber,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        widthPx: rect.width,
        heightPx: rect.height,
      });
    },
    [markMode, onPick, pageNumber],
  );

  return (
    <div
      ref={wrapRef}
      className={cn("mx-auto w-fit py-2", markMode && "cursor-crosshair")}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="block rounded-sm bg-white shadow-sm dark:bg-white" />
    </div>
  );
}

export default function PdfSignViewer({
  fileUrl,
  markMode,
  onPick,
}: {
  fileUrl: string;
  markMode: boolean;
  onPick: (p: PdfPickPayload) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const outerWidth = useContainerContentWidth(scrollRef);
  /** Si el contenedor aún mide 0 (layout), usar ancho razonable para no dejar el lienzo vacío. */
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
      {markMode ? (
        <p className="text-sm text-muted-foreground">
          Modo marca: el PDF se ajusta al ancho del panel. Haz clic donde va la firma (coordenadas respecto a la página
          tal como se muestra).
        </p>
      ) : null}
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
                markMode={markMode}
                onPick={onPick}
              />
            ))
          : null}
      </div>
      {pdf && numPages > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {numPages} página{numPages === 1 ? "" : "s"} · visor nativo (pdf.js)
        </p>
      ) : null}
    </div>
  );
}
