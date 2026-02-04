-- DropForeignKey
ALTER TABLE "gold_articles" DROP CONSTRAINT "gold_articles_carigarId_fkey";

-- AlterTable
ALTER TABLE "gold_articles" ALTER COLUMN "carigarId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "gold_articles" ADD CONSTRAINT "gold_articles_carigarId_fkey" FOREIGN KEY ("carigarId") REFERENCES "carigars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
