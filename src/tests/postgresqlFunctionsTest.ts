import { PrismaClient } from '@prisma/client';
import { GoldCalculator } from '../utils/goldCalculator';

const prisma = new PrismaClient();

// async function testPostgreSQLFunctions() {
//   console.log('=== Testing PostgreSQL Gold Calculator Functions ===\n');

//   try {
//     // Test data
//     const goldRate24K = 100000;
//     const testAmount = 50000;
    
//     // Test 1: get_gold_rate_as_per_karat
//     console.log('1. Testing get_gold_rate_as_per_karat:');
    
//     const sqlKaratRates = await Promise.all([
//       prisma.$queryRaw<Array<{ get_gold_rate_as_per_karat: number }>>`
//         SELECT get_gold_rate_as_per_karat(${goldRate24K}, 24)
//       `,
//       prisma.$queryRaw<Array<{ get_gold_rate_as_per_karat: number }>>`
//         SELECT get_gold_rate_as_per_karat(${goldRate24K}, 22)
//       `,
//       prisma.$queryRaw<Array<{ get_gold_rate_as_per_karat: number }>>`
//         SELECT get_gold_rate_as_per_karat(${goldRate24K}, 18)
//       `,
//       prisma.$queryRaw<Array<{ get_gold_rate_as_per_karat: number }>>`
//         SELECT get_gold_rate_as_per_karat(${goldRate24K}, 14)
//       `
//     ]);

//     console.log('PostgreSQL Results:');
//     console.log(`24K rate: ${sqlKaratRates[0][0].get_gold_rate_as_per_karat}`);
//     console.log(`22K rate: ${sqlKaratRates[1][0].get_gold_rate_as_per_karat}`);
//     console.log(`18K rate: ${sqlKaratRates[2][0].get_gold_rate_as_per_karat}`);
//     console.log(`14K rate: ${sqlKaratRates[3][0].get_gold_rate_as_per_karat}`);

//     console.log('\nTypeScript Results:');
//     console.log(`24K rate: ${GoldCalculator.getGoldRateAsPerKarat(goldRate24K, 24)}`);
//     console.log(`22K rate: ${GoldCalculator.getGoldRateAsPerKarat(goldRate24K, 22)}`);
//     console.log(`18K rate: ${GoldCalculator.getGoldRateAsPerKarat(goldRate24K, 18)}`);
//     console.log(`14K rate: ${GoldCalculator.getGoldRateAsPerKarat(goldRate24K, 14)}\n`);

//     // Test 2: calc_luxury_tax
//     console.log('2. Testing calc_luxury_tax:');
    
//     const sqlLuxuryTax = await prisma.$queryRaw<Array<{ calc_luxury_tax: number }>>`
//       SELECT calc_luxury_tax(${testAmount})
//     `;
    
//     console.log(`PostgreSQL luxury tax on ${testAmount}: ${sqlLuxuryTax[0].calc_luxury_tax}`);
//     console.log(`TypeScript luxury tax on ${testAmount}: ${GoldCalculator.calcLuxuryTax(testAmount)}\n`);

//     // Test 3: calc_article_cost
//     console.log('3. Testing calc_article_cost:');
    
//     const sqlArticleCost = await prisma.$queryRaw<Array<{
//       pre_tax_article_cost: number;
//       luxury_tax_amount: number;
//       post_tax_article_cost: number;
//     }>>`
//       SELECT * FROM calc_article_cost(
//         ${100000}::numeric,  -- goldRate24KPerTola
//         ${22}::integer,      -- articleKarat
//         ${10.5}::numeric,    -- articleNetWeight
//         ${5000}::numeric,    -- addOnCost
//         ${0.5}::numeric,     -- wastage
//         ${3000}::numeric,    -- makingCharge
//         ${1000}::numeric     -- discount
//       )
//     `;

//     const tsArticleCost = GoldCalculator.calcArticleCost(100000, 22, 10.5, 5000, 0.5, 3000, 1000);
    
//     console.log('PostgreSQL article cost:');
//     console.log(`Pre-tax cost: ${sqlArticleCost[0].pre_tax_article_cost}`);
//     console.log(`Luxury tax: ${sqlArticleCost[0].luxury_tax_amount}`);
//     console.log(`Post-tax cost: ${sqlArticleCost[0].post_tax_article_cost}`);
    
//     console.log('\nTypeScript article cost:');
//     console.log(`Pre-tax cost: ${tsArticleCost.preTaxArticleCost}`);
//     console.log(`Luxury tax: ${tsArticleCost.luxuryTaxAmount}`);
//     console.log(`Post-tax cost: ${tsArticleCost.postTaxArticleCost}\n`);

//     // Test 4: calc_total_basket_cost
//     console.log('4. Testing calc_total_basket_cost:');
    
//     const sqlBasketCost = await prisma.$queryRaw<Array<{
//       pre_tax_basket_amount: number;
//       taxed_basket_amount: number;
//       post_tax_basket_amount: number;
//     }>>`
//       SELECT * FROM calc_total_basket_cost(
//         ${150000}::numeric,  -- totalArticlesCost
//         ${20000}::numeric,   -- oldGoldItemsCost
//         ${5000}::numeric     -- extraDiscount
//       )
//     `;

//     const tsBasketCost = GoldCalculator.calcTotalBasketCost(150000, 20000, 5000);
    
//     console.log('PostgreSQL basket cost:');
//     console.log(`Pre-tax amount: ${sqlBasketCost[0].pre_tax_basket_amount}`);
//     console.log(`Tax amount: ${sqlBasketCost[0].taxed_basket_amount}`);
//     console.log(`Post-tax total: ${sqlBasketCost[0].post_tax_basket_amount}`);
    
//     console.log('\nTypeScript basket cost:');
//     console.log(`Pre-tax amount: ${tsBasketCost.preTaxBasketAmount}`);
//     console.log(`Tax amount: ${tsBasketCost.taxedBasketAmount}`);
//     console.log(`Post-tax total: ${tsBasketCost.postTaxBasketAmount}\n`);

//     console.log('=== All PostgreSQL function tests completed ===');

//   } catch (error) {
//     console.error('Error testing PostgreSQL functions:', error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // Run tests
// testPostgreSQLFunctions();