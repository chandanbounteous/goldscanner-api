-- CreateTable
CREATE TABLE "customer_baskets" (
    "id" TEXT NOT NULL,
    "basketNumber" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "isGoldRateFixed" BOOLEAN NOT NULL DEFAULT false,
    "fixedGoldRate24KPerTola" DOUBLE PRECISION,
    "fixedGoldRateNepaliDate" JSONB,
    "oldGoldItemCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "luxuryTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalCost" DOUBLE PRECISION,
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "billingDate" TIMESTAMP(3),
    "billingDateNepali" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_baskets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_basket_article_details" (
    "id" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "addOnCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "makingCharge" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "customer_basket_article_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_baskets_basketNumber_key" ON "customer_baskets"("basketNumber");

-- AddForeignKey
ALTER TABLE "customer_baskets" ADD CONSTRAINT "customer_baskets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_basket_article_details" ADD CONSTRAINT "customer_basket_article_details_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "customer_baskets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_basket_article_details" ADD CONSTRAINT "customer_basket_article_details_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "gold_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
