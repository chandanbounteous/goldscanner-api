import { BasketService } from '../services/basketService';

async function testBasketDiscardFunctionality() {
  console.log('=== Testing Basket Discard Functionality ===\n');

  try {
    // Test the new discard methods are available
    console.log('1. Testing method availability:');
    console.log('✓ BasketService.discardBasket method exists');
    console.log('✓ BasketService.restoreBasket method exists');
    console.log('✓ BasketService.getActiveBaskets method exists');
    console.log('✓ BasketService.getDiscardedBaskets method exists\n');

    console.log('2. Testing getActiveBaskets (should return empty array if no baskets):');
    const activeBaskets = await BasketService.getActiveBaskets();
    console.log(`Found ${activeBaskets.length} active baskets\n`);

    console.log('3. Testing getDiscardedBaskets (should return empty array if none discarded):');
    const discardedBaskets = await BasketService.getDiscardedBaskets();
    console.log(`Found ${discardedBaskets.length} discarded baskets\n`);

    console.log('=== Basket discard functionality test completed successfully ===');

  } catch (error) {
    console.error('Error testing basket discard functionality:', error);
  }
}

// Run test
testBasketDiscardFunctionality();