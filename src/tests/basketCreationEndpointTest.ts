import { BasketService } from '../services/basketService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// async function testBasketCreationEndpoint() {
//   console.log('=== Testing Basket Creation Endpoint Logic ===\n');

//   try {
//     // Test 1: Check if we can get customer data
//     console.log('1. Testing customer lookup:');
//     const customers = await prisma.customer.findMany({ take: 1 });
    
//     if (customers.length === 0) {
//       console.log('No customers found in database. Create a customer first to test basket creation.');
//       return;
//     }
    
//     const testCustomer = customers[0];
//     console.log(`✓ Found test customer: ${testCustomer.firstName} ${testCustomer.lastName || ''} (ID: ${testCustomer.id})`);
    
//     // Test 2: Check for existing open baskets
//     console.log('\n2. Testing open basket detection:');
//     const existingOpenBasket = await prisma.customerBasket.findFirst({
//       where: {
//         customerId: testCustomer.id,
//         isBilled: false,
//         isDiscarded: false
//       }
//     });
    
//     if (existingOpenBasket) {
//       console.log(`✓ Customer has existing open basket: ${existingOpenBasket.id} (Basket #${existingOpenBasket.basketNumber})`);
//       console.log('This would trigger the "open basket exists" error in the endpoint.');
//     } else {
//       console.log('✓ Customer has no open baskets. Basket creation would be allowed.');
//     }
    
//     // Test 3: Test basket numbering
//     console.log('\n3. Testing basket numbering:');
//     const nextBasketNumber = await BasketService.getNextBasketNumber();
//     console.log(`✓ Next basket number would be: ${nextBasketNumber}`);
    
//     console.log('\n=== Basket creation endpoint logic test completed ===');
//     console.log('The endpoint is ready to handle:');
//     console.log('- Customer validation');
//     console.log('- Open basket detection');
//     console.log('- Basket creation with auto-numbering');
//     console.log('- Fixed gold rate handling');

//   } catch (error) {
//     console.error('Error testing basket creation logic:', error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // Run test
// testBasketCreationEndpoint();