-- CreateTable
CREATE TABLE "carigars" (
    "id" TEXT NOT NULL,
    "codeName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carigars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_articles" (
    "id" TEXT NOT NULL,
    "articleCode" TEXT NOT NULL,
    "serialNumber" BIGINT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "issueDateNepali" JSONB NOT NULL,
    "carigarId" TEXT NOT NULL,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "stoneWeight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gold_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carigars_codeName_key" ON "carigars"("codeName");

-- AddForeignKey
ALTER TABLE "gold_articles" ADD CONSTRAINT "gold_articles_carigarId_fkey" FOREIGN KEY ("carigarId") REFERENCES "carigars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
