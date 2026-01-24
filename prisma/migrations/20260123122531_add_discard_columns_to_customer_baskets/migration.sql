-- AlterTable
ALTER TABLE "customer_baskets" ADD COLUMN     "discardedDate" TIMESTAMP(3),
ADD COLUMN     "discardedDateNepali" JSONB,
ADD COLUMN     "isDiscarded" BOOLEAN NOT NULL DEFAULT false;
