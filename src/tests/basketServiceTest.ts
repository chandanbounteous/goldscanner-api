import { BasketService } from '../services/basketService';

async function testBasketService() {
  console.log('=== Testing Basket Service ===\n');

  try {
    // Test 1: Get next basket number
    console.log('1. Testing getNextBasketNumber:');
    const nextBasketNumber = await BasketService.getNextBasketNumber();
    console.log(`Next basket number: ${nextBasketNumber}\n`);

    console.log('=== Basket Service test completed ===');
  } catch (error) {
    console.error('Error testing basket service:', error);
  }
}

// Run test
testBasketService();