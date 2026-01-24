/*
  Warnings:

  - You are about to drop the `customer_basket_article_details` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "customer_basket_article_details" DROP CONSTRAINT "customer_basket_article_details_articleId_fkey";

-- DropForeignKey
ALTER TABLE "customer_basket_article_details" DROP CONSTRAINT "customer_basket_article_details_basketId_fkey";

-- DropTable
DROP TABLE "customer_basket_article_details";

-- CreateTable
CREATE TABLE "customer_basket_articles" (
    "id" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "addOnCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "makingCharge" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "customer_basket_articles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "customer_basket_articles" ADD CONSTRAINT "customer_basket_articles_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "customer_baskets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_basket_articles" ADD CONSTRAINT "customer_basket_articles_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "gold_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
