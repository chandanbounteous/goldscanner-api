import { GoldCalculator } from '../utils/goldCalculator';

// Test the gold calculator functions
async function testGoldCalculator() {
  console.log('=== Testing Gold Calculator Functions ===\n');

  // Test 1: getGoldRateAsPerKarat
  console.log('1. Testing getGoldRateAsPerKarat:');
  const goldRate24K = 100000; // 100,000 per tola for 24K
  
  console.log(`24K rate: ${GoldCalculator.getGoldRateAsPerKarat(goldRate24K, 24)}`);
  console.log(`22K rate: ${GoldCalculator.getGoldRateAsPerKarat(goldRate24K, 22)}`);
  console.log(`18K rate: ${GoldCalculator.getGoldRateAsPerKarat(goldRate24K, 18)}`);
  console.log(`14K rate: ${GoldCalculator.getGoldRateAsPerKarat(goldRate24K, 14)}\n`);

  // Test 2: calcLuxuryTax
  console.log('2. Testing calcLuxuryTax:');
  const testAmount = 50000;
  const luxuryTax = GoldCalculator.calcLuxuryTax(testAmount);
  console.log(`Luxury tax on ${testAmount}: ${luxuryTax}\n`);

  // Test 3: calcArticleCost
  console.log('3. Testing calcArticleCost:');
  const articleCost = GoldCalculator.calcArticleCost(
    100000,    // goldRate24KPerTola
    22,        // articleKarat
    10.5,      // articleNetWeight (grams)
    5000,      // addOnCost
    0.5,       // wastage (grams)
    3000,      // makingCharge
    1000       // discount
  );
  
  console.log('Article cost calculation:');
  console.log(`Pre-tax cost: ${articleCost.preTaxArticleCost}`);
  console.log(`Luxury tax: ${articleCost.luxuryTaxAmount}`);
  console.log(`Post-tax cost: ${articleCost.postTaxArticleCost}`);
  console.log(`Final cost: ${articleCost.finalCost}\n`);

  // Test 4: calcTotalBasketCost
  console.log('4. Testing calcTotalBasketCost:');
  const basketCost = GoldCalculator.calcTotalBasketCost(
    150000,    // totalArticlesCost
    20000,     // oldGoldItemsCost
    5000,      // extraDiscount
    8000       // totalAddOnCost
  );
  
  console.log('Basket cost calculation:');
  console.log(`Pre-tax amount: ${basketCost.preTaxBasketAmount}`);
  console.log(`Tax amount: ${basketCost.taxedBasketAmount}`);
  console.log(`Post-tax total: ${basketCost.postTaxBasketAmount}`);
  console.log(`Total basket amount: ${basketCost.totalBasketAmount}\n`);

  console.log('=== All tests completed ===');
}

// Run tests
testGoldCalculator().catch(console.error);