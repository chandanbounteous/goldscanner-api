import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// async function testArticleAdditionEndpoint() {
//   console.log('=== Testing Article Addition to Basket Endpoint Logic ===\n');

//   try {
//     // Test 1: Check available data for testing
//     console.log('1. Testing data availability:');
    
//     const customers = await prisma.customer.findMany({ take: 1 });
//     if (customers.length === 0) {
//       console.log('No customers found. Please create a customer first.');
//       return;
//     }
    
//     const articles = await prisma.goldArticle.findMany({ take: 2 });
//     if (articles.length === 0) {
//       console.log('No gold articles found. Please create gold articles first.');
//       return;
//     }
    
//     console.log(`✓ Found customer: ${customers[0].firstName} (ID: ${customers[0].id})`);
//     console.log(`✓ Found ${articles.length} gold articles available`);
    
//     // Test 2: Check existing baskets
//     console.log('\n2. Testing basket availability:');
//     const activeBaskets = await prisma.customerBasket.findMany({
//       where: {
//         customerId: customers[0].id,
//         isBilled: false,
//         isDiscarded: false
//       }
//     });
    
//     if (activeBaskets.length === 0) {
//       console.log('No active baskets found. Create a basket first to test article addition.');
//       console.log('Example: POST /api/v1/customer/:customerId/basket');
//       return;
//     }
    
//     const testBasket = activeBaskets[0];
//     console.log(`✓ Found active basket: #${testBasket.basketNumber} (ID: ${testBasket.id})`);
    
//     // Test 3: Check existing basket articles
//     console.log('\n3. Testing existing basket articles:');
//     const existingArticles = await prisma.customerBasketArticles.findMany({
//       where: { basketId: testBasket.id }
//     });
    
//     console.log(`✓ Basket currently has ${existingArticles.length} articles`);
    
//     // Test 4: Validate article availability
//     console.log('\n4. Testing article validation:');
//     const availableArticle = articles.find(article => 
//       !existingArticles.some(existing => existing.articleId === article.id)
//     );
    
//     if (availableArticle) {
//       console.log(`✓ Article available for testing: ${availableArticle.articleCode} (ID: ${availableArticle.id})`);
//       console.log(`  - Net Weight: ${availableArticle.netWeight}g`);
//       console.log(`  - Karat: ${availableArticle.karat}K`);
//     } else {
//       console.log('All articles are already in the basket. Need additional articles for testing.');
//     }
    
//     console.log('\n=== Endpoint ready for testing ===');
//     console.log('The endpoint can handle:');
//     console.log('- Basket validation (exists, not billed, not discarded)');
//     console.log('- Article validation (exists, not already in basket)');
//     console.log('- Article addition with weight and cost details');
//     console.log('- Proper error responses for various scenarios');

//   } catch (error) {
//     console.error('Error testing article addition logic:', error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// Run test
// testArticleAdditionEndpoint();