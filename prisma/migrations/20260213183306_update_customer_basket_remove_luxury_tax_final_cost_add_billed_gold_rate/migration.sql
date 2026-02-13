-- AlterTable
ALTER TABLE "customer_baskets" DROP COLUMN "luxuryTax";

-- AlterTable
ALTER TABLE "customer_baskets" DROP COLUMN "finalCost";

-- AlterTable
ALTER TABLE "customer_baskets" ADD COLUMN "billedGoldRate24KPerTola" DOUBLE PRECISION;