/*
  Warnings:

  - Added the required column `updatedAt` to the `customer_basket_articles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "customer_basket_articles" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
