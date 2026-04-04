-- AlterTable
ALTER TABLE "SignaturePlacement" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "SignaturePlacement_documentId_sortOrder_idx" ON "SignaturePlacement"("documentId", "sortOrder");
