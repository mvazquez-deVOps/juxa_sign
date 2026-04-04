/** Coordenadas de marca de firma respecto a la página tal como se muestra en el visor. */
export type PdfPickPayload = {
  page: number;
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
};
