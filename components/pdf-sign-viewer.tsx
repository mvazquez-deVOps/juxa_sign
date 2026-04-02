"use client";

import { Fragment, useEffect, useMemo } from "react";
import { Worker, Viewer, type RenderPageProps } from "@react-pdf-viewer/core";
import {
  defaultLayoutPlugin,
  type DefaultLayoutPluginProps,
} from "@react-pdf-viewer/default-layout";
import type { TransformToolbarSlot } from "@react-pdf-viewer/toolbar";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const workerUrl = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

export type PdfPickPayload = {
  page: number;
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
};

/**
 * Capa de página con clic para coordenadas + markRendered exigido por @react-pdf-viewer/core
 * para que el visor marque la página como renderizada.
 */
function PdfPageLayer({
  pageProps,
  markMode,
  onPick,
}: {
  pageProps: RenderPageProps;
  markMode: boolean;
  onPick: (p: PdfPickPayload) => void;
}) {
  const {
    pageIndex,
    width,
    height,
    canvasLayerRendered,
    textLayerRendered,
    markRendered,
    canvasLayer,
    textLayer,
    annotationLayer,
  } = pageProps;

  useEffect(() => {
    if (canvasLayerRendered && textLayerRendered) {
      markRendered(pageIndex);
    }
  }, [canvasLayerRendered, textLayerRendered, markRendered, pageIndex]);

  return (
    <div
      className={markMode ? "cursor-crosshair" : ""}
      style={{ position: "relative", width, height }}
      onClick={(e) => {
        if (!markMode) return;
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        onPick({
          page: pageIndex + 1,
          x,
          y,
          widthPx: rect.width,
          heightPx: rect.height,
        });
      }}
    >
      {canvasLayer.children}
      {textLayer.children}
      {annotationLayer.children}
    </div>
  );
}

const empty = () => <Fragment />;

const noopToolbarSlot: TransformToolbarSlot = (slot) => ({
  ...slot,
  Zoom: empty,
  ZoomIn: empty,
  ZoomOut: empty,
  Rotate: empty,
  RotateBackwardMenuItem: empty,
  RotateForwardMenuItem: empty,
});

export default function PdfSignViewer({
  fileUrl,
  markMode,
  onPick,
}: {
  fileUrl: string;
  markMode: boolean;
  onPick: (p: PdfPickPayload) => void;
}) {
  /** Con marcas activas, se ocultan zoom y rotación para que x/y coincidan con AnchoPagina/altoPagina en API 8. */
  const defaultLayoutPluginInstance = useMemo(() => {
    let layout: ReturnType<typeof defaultLayoutPlugin>;
    const props: DefaultLayoutPluginProps = markMode
      ? {
          toolbarPlugin: { zoomPlugin: { enableShortcuts: false } },
          renderToolbar: (Toolbar) => (
            <Toolbar>
              {layout.toolbarPluginInstance.renderDefaultToolbar(noopToolbarSlot)}
            </Toolbar>
          ),
        }
      : {};
    layout = defaultLayoutPlugin(props);
    return layout;
  }, [markMode]);

  const renderPage = (props: RenderPageProps) => (
    <PdfPageLayer pageProps={props} markMode={markMode} onPick={onPick} />
  );

  return (
    <Worker workerUrl={workerUrl}>
      <div className="space-y-2">
        {markMode ? (
          <p className="text-sm text-muted-foreground">
            Modo marca: zoom y rotación desactivados en la barra (escala fija respecto al clic). Coloca
            las firmas con el PDF a tamaño por defecto.
          </p>
        ) : null}
        <div className="h-[min(720px,75vh)] overflow-hidden rounded-lg border bg-muted/20 shadow-inner">
          <Viewer fileUrl={fileUrl} plugins={[defaultLayoutPluginInstance]} renderPage={renderPage} />
        </div>
      </div>
    </Worker>
  );
}
