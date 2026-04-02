/**
 * No inserta empresas ni IDs DIGID falsos (evita conflictos con el sandbox).
 * Usa el panel para dar de alta en DIGID; ver docs/checklist-pruebas-firma.md
 */
console.log(
  "[prisma seed] Sin datos automáticos. Flujo: Empresas → Firmantes → Documentos → marcas → Enviar.",
);
process.exit(0);
