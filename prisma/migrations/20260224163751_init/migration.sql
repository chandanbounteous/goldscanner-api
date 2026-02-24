-- CreateTable
CREATE TABLE "customer_invoices" (
    "id" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_invoices_basketId_key" ON "customer_invoices"("basketId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_invoices_invoiceNumber_key" ON "customer_invoices"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "customer_baskets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
