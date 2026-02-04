import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { NepaliDateHelper } from '../utils/nepaliDateHelper';

const prisma = new PrismaClient();

const carigarList = [
  'ASTA KR',
  'DEBU KR',
  'DEBU MAJI',
  'DEWASIS KR',
  'GAUTAM',
  'GAUTAM KR',
  'LUCKY',
  'MAMA JI GL',
  'MAMA JI KR',
  'MAMA KR',
  'OM PEARL GOLD',
  'OM PEARL GOLD KR',
  'OUT',
  'PATEL OUT',
  'SAMIRPAIK GL',
  'SUBENDU',
  'SUBENDU KR',
  'SUKUMAR-KR',
  'SUMAN KR',
  'UNKNOWN'
];

// Sample Articles CSV data (updated with 4-digit years)
const goldArticlesData = [
  { articleCode: "RNC1250", serialNumber: 39485, issueDateNepali: "27/02/2081", carigarCodeName: "SAMIRPAIK GL", netWeight: 36.12, grossWeight: 36.12, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1271", serialNumber: 39875, issueDateNepali: "07/03/2081", carigarCodeName: "GAUTAM KR", netWeight: 39.42, grossWeight: 39.42, stoneWeight: 0, karat: 22 },
  { articleCode: "RNC1275", serialNumber: 39880, issueDateNepali: "07/03/2081", carigarCodeName: "OM PEARL GOLD KR", netWeight: 38.22, grossWeight: 38.22, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1309", serialNumber: 40442, issueDateNepali: "13/04/2081", carigarCodeName: "SUKUMAR-KR", netWeight: 39.74, grossWeight: 39.74, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1311", serialNumber: 40444, issueDateNepali: "13/04/2081", carigarCodeName: "DEWASIS KR", netWeight: 37.22, grossWeight: 37.22, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1343", serialNumber: 40993, issueDateNepali: "06/05/2081", carigarCodeName: "PATEL OUT", netWeight: 66.18, grossWeight: 66.18, stoneWeight: 0, karat: 22 },
  { articleCode: "RNC1344", serialNumber: 40994, issueDateNepali: "06/05/2081", carigarCodeName: "PATEL OUT", netWeight: 31.32, grossWeight: 31.32, stoneWeight: 0, karat: 22 },
  { articleCode: "RNC1475", serialNumber: 43652, issueDateNepali: "11/08/2081", carigarCodeName: "MAMA JI KR", netWeight: 37.62, grossWeight: 37.62, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1481", serialNumber: 43720, issueDateNepali: "12/08/2081", carigarCodeName: "ASTA KR", netWeight: 20.04, grossWeight: 20.04, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1482", serialNumber: 43721, issueDateNepali: "12/08/2081", carigarCodeName: "SUBENDU KR", netWeight: 33.73, grossWeight: 33.73, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1493", serialNumber: 44034, issueDateNepali: "20/08/2081", carigarCodeName: "OUT", netWeight: 18.55, grossWeight: 18.55, stoneWeight: 0, karat: 22 },
  { articleCode: "RNC1498", serialNumber: 44039, issueDateNepali: "20/08/2081", carigarCodeName: "DEBU KR", netWeight: 29.46, grossWeight: 29.46, stoneWeight: 0, karat: 22 },
  { articleCode: "RNC1513", serialNumber: 44376, issueDateNepali: "01/09/2081", carigarCodeName: "OM PEARL GOLD", netWeight: 44.23, grossWeight: 44.23, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1523", serialNumber: 44526, issueDateNepali: "09/09/2081", carigarCodeName: "GAUTAM KR", netWeight: 59.09, grossWeight: 59.09, stoneWeight: 0, karat: 22 },
  { articleCode: "RNC1532", serialNumber: 44681, issueDateNepali: "23/09/2081", carigarCodeName: "OM PEARL GOLD", netWeight: 49.71, grossWeight: 49.71, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1538", serialNumber: 44819, issueDateNepali: "26/09/2081", carigarCodeName: "OM PEARL GOLD KR", netWeight: 26.17, grossWeight: 26.17, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1539", serialNumber: 44820, issueDateNepali: "26/09/2081", carigarCodeName: "SUKUMAR-KR", netWeight: 28.82, grossWeight: 28.82, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1549", serialNumber: 44978, issueDateNepali: "06/10/2081", carigarCodeName: "SUBENDU", netWeight: 19.3, grossWeight: 19.3, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1550", serialNumber: 44979, issueDateNepali: "06/10/2081", carigarCodeName: "SUBENDU", netWeight: 28.05, grossWeight: 28.05, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1566", serialNumber: 45284, issueDateNepali: "17/10/2081", carigarCodeName: "MAMA JI GL", netWeight: 21.87, grossWeight: 21.87, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1570", serialNumber: 45369, issueDateNepali: "20/10/2081", carigarCodeName: "DEBU MAJI", netWeight: 24.47, grossWeight: 24.47, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1579", serialNumber: 45484, issueDateNepali: "28/10/2081", carigarCodeName: "OM PEARL GOLD", netWeight: 50.36, grossWeight: 50.36, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1580", serialNumber: 45544, issueDateNepali: "28/10/2081", carigarCodeName: "GAUTAM", netWeight: 34.47, grossWeight: 34.47, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1586", serialNumber: 45737, issueDateNepali: "05/11/2081", carigarCodeName: "GAUTAM KR", netWeight: 32.52, grossWeight: 32.52, stoneWeight: 0, karat: 22 },
  { articleCode: "RNC1590", serialNumber: 45850, issueDateNepali: "11/11/2081", carigarCodeName: "MAMA JI KR", netWeight: 31.05, grossWeight: 31.05, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1591", serialNumber: 45924, issueDateNepali: "16/11/2081", carigarCodeName: "DEBU MAJI", netWeight: 50.12, grossWeight: 50.12, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1594", serialNumber: 45995, issueDateNepali: "19/11/2081", carigarCodeName: "GAUTAM", netWeight: 45.59, grossWeight: 46.96, stoneWeight: 1.37, karat: 22 },
  { articleCode: "RNC1595", serialNumber: 46089, issueDateNepali: "21/11/2081", carigarCodeName: "OM PEARL GOLD KR", netWeight: 20.03, grossWeight: 20.03, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1597", serialNumber: 46218, issueDateNepali: "23/11/2081", carigarCodeName: "GAUTAM", netWeight: 30.48, grossWeight: 30.48, stoneWeight: 0, karat: 22 },
  { articleCode: "RNC1609", serialNumber: 46391, issueDateNepali: "07/12/2081", carigarCodeName: "MAMA KR", netWeight: 35.88, grossWeight: 35.88, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1610", serialNumber: 46458, issueDateNepali: "11/12/2081", carigarCodeName: "GAUTAM KR", netWeight: 47.81, grossWeight: 47.81, stoneWeight: 0, karat: 22 },
  { articleCode: "RNC1611", serialNumber: 46459, issueDateNepali: "11/12/2081", carigarCodeName: "LUCKY", netWeight: 32.51, grossWeight: 32.51, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1612", serialNumber: 46475, issueDateNepali: "13/12/2081", carigarCodeName: "GAUTAM KR", netWeight: 48.06, grossWeight: 51.26, stoneWeight: 3.2, karat: 22 },
  { articleCode: "RNC1613", serialNumber: 46488, issueDateNepali: "14/12/2081", carigarCodeName: "MAMA JI KR", netWeight: 46.33, grossWeight: 46.33, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1614", serialNumber: 46489, issueDateNepali: "14/12/2081", carigarCodeName: "MAMA JI KR", netWeight: 35.99, grossWeight: 35.99, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1620", serialNumber: 46828, issueDateNepali: "26/12/2081", carigarCodeName: "GAUTAM KR", netWeight: 31.8, grossWeight: 31.96, stoneWeight: 0.16, karat: 22 },
  { articleCode: "RNC1621", serialNumber: 46839, issueDateNepali: "26/12/2081", carigarCodeName: "SUMAN KR", netWeight: 30.66, grossWeight: 30.66, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1622", serialNumber: 46840, issueDateNepali: "26/12/2081", carigarCodeName: "SUMAN KR", netWeight: 33.13, grossWeight: 33.13, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1626", serialNumber: 46912, issueDateNepali: "29/12/2081", carigarCodeName: "DEBU MAJI", netWeight: 28.94, grossWeight: 28.94, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1631", serialNumber: 47117, issueDateNepali: "12/01/2082", carigarCodeName: "SUBENDU KR", netWeight: 14.78, grossWeight: 14.78, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1634", serialNumber: 47120, issueDateNepali: "12/01/2082", carigarCodeName: "GAUTAM KR", netWeight: 32.26, grossWeight: 32.26, stoneWeight: 0, karat: 22 },
  { articleCode: "RNC1638", serialNumber: 47243, issueDateNepali: "16/01/2082", carigarCodeName: "SUMAN KR", netWeight: 48.81, grossWeight: 48.81, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1640", serialNumber: 47410, issueDateNepali: "29/01/2082", carigarCodeName: "LUCKY", netWeight: 42.87, grossWeight: 42.87, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1641", serialNumber: 47462, issueDateNepali: "31/01/2082", carigarCodeName: "SUBENDU KR", netWeight: 44.11, grossWeight: 44.11, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1642", serialNumber: 47482, issueDateNepali: "01/02/2082", carigarCodeName: "SUBENDU", netWeight: 27.78, grossWeight: 27.78, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1643", serialNumber: 47483, issueDateNepali: "01/02/2082", carigarCodeName: "SUBENDU", netWeight: 26.99, grossWeight: 26.99, stoneWeight: 0, karat: 24 },
  { articleCode: "RNC1645", serialNumber: 47485, issueDateNepali: "01/02/2082", carigarCodeName: "PATEL OUT", netWeight: 43.05, grossWeight: 44.42, stoneWeight: 1.37, karat: 22 },
  { articleCode: "RNC1646", serialNumber: 47533, issueDateNepali: "04/02/2082", carigarCodeName: "OM PEARL GOLD", netWeight: 33.42, grossWeight: 33.42, stoneWeight: 0, karat: 24 }
];

async function seedCarigars() {
  logger.info('🌱 Starting Carigar seeding...');
  
  try {
    // Check if carigars already exist
    const existingCount = await prisma.carigar.count();
    
    if (existingCount > 0) {
      logger.info(`Found ${existingCount} existing carigars. Skipping seed.`);
      return;
    }

    // Create carigars
    const carigars = await Promise.all(
      carigarList.map(codeName => 
        prisma.carigar.create({
          data: {
            codeName,
            isActive: true
          }
        })
      )
    );

    logger.info(`✅ Successfully seeded ${carigars.length} carigars`);
    
    // Log the created carigars
    carigars.forEach(carigar => {
      logger.info(`Created: ${carigar.codeName} (ID: ${carigar.id})`);
    });

  } catch (error) {
    logger.error('❌ Error seeding carigars:', error);
    throw error;
  }
}

async function seedGoldArticles() {
  logger.info('🌱 Starting GoldArticle seeding...');
  
  try {
    // Clear existing gold articles for re-seeding
    logger.info('🗑️  Clearing existing gold articles...');
    const deletedGoldArticles = await prisma.goldArticle.deleteMany({});
    logger.info(`Deleted ${deletedGoldArticles.count} existing gold articles.`);

    // Get all carigars to map codeName to ID
    const carigars = await prisma.carigar.findMany({
      select: { id: true, codeName: true }
    });
    
    const carigarMap = new Map(carigars.map(c => [c.codeName, c.id]));
    
    // Process and create gold articles
    const goldArticles = [];
    
    for (const article of goldArticlesData) {
      try {
        // Find carigar ID
        const carigarId = carigarMap.get(article.carigarCodeName);
        if (!carigarId) {
          logger.warn(`⚠️ Carigar not found for ${article.carigarCodeName}, skipping article ${article.articleCode}`);
          continue;
        }

        // Convert Nepali date to Gregorian
        const { nepaliDate, gregorianDate } = NepaliDateHelper.parseNepaliDateString(article.issueDateNepali);

        // Create gold article
        const createdArticle = await prisma.goldArticle.create({
          data: {
            articleCode: article.articleCode,
            serialNumber: BigInt(article.serialNumber),
            issueDate: gregorianDate,
            issueDateNepali: nepaliDate as any,
            carigarId: carigarId,
            netWeight: article.netWeight,
            grossWeight: article.grossWeight,
            stoneWeight: article.stoneWeight,
            karat: article.karat
          }
        });

        goldArticles.push(createdArticle);
        
      } catch (error) {
        logger.error(`❌ Error processing article ${article.articleCode}:`, error);
        continue;
      }
    }

    logger.info(`✅ Successfully seeded ${goldArticles.length} gold articles`);
    
    // Log first few created articles
    goldArticles.slice(0, 5).forEach(article => {
      logger.info(`Created: ${article.articleCode} (ID: ${article.id})`);
    });

  } catch (error) {
    logger.error('❌ Error seeding gold articles:', error);
    throw error;
  }
}

// Customer seed data
const customersData = [
  {
    firstName: 'Chandan',
    lastName: 'Kumar',
    phone: 9705002288n,
    email: 'bluekanishk@gmail.com'
  },
  {
    firstName: 'Rajni',
    lastName: 'Kumari', 
    phone: 9705002277n,
    email: 'bluerajni@gmail.com'
  },
  {
    firstName: 'Karan',
    lastName: 'Thapa',
    phone: 9705002266n,
    email: null
  }
];

async function seedCustomers() {
  try {
    logger.info('🔄 Starting customer seeding...');

    // Delete existing customers
    await prisma.customer.deleteMany();
    logger.info('🗑️ Cleared existing customers');

    // Create customers
    for (const customerData of customersData) {
      await prisma.customer.create({
        data: customerData
      });
    }

    logger.info(`✅ Successfully seeded ${customersData.length} customers`);
  } catch (error) {
    logger.error('❌ Error seeding customers:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedCarigars();
    await seedGoldArticles();
    await seedCustomers();
    logger.info('🎉 Database seeding completed successfully');
  } catch (error) {
    logger.error('💥 Database seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as seed };