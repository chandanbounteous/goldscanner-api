-- Example Usage of PostgreSQL Gold Calculator Functions

-- 1. Get gold rates for different karats
SELECT 
  24 as karat, get_gold_rate_as_per_karat(100000, 24) as rate
UNION ALL
SELECT 
  22 as karat, get_gold_rate_as_per_karat(100000, 22) as rate
UNION ALL
SELECT 
  18 as karat, get_gold_rate_as_per_karat(100000, 18) as rate
UNION ALL
SELECT 
  14 as karat, get_gold_rate_as_per_karat(100000, 14) as rate
ORDER BY karat DESC;

-- 2. Calculate luxury tax for various amounts
SELECT 
  amount,
  calc_luxury_tax(amount) as luxury_tax
FROM (VALUES (10000), (25000), (50000), (100000)) AS amounts(amount);

-- 3. Calculate article cost example
SELECT 
  'Single Article Cost' as calculation_type,
  pre_tax_article_cost,
  luxury_tax_amount,
  post_tax_article_cost,
  final_cost
FROM calc_article_cost(
  100000::numeric,  -- gold rate 24K per tola
  22::integer,      -- article karat
  15.5::numeric,    -- net weight in grams
  2000::numeric,    -- add-on cost
  1.0::numeric,     -- wastage in grams
  5000::numeric,    -- making charge
  500::numeric      -- discount
);

-- 4. Calculate basket total example
SELECT 
  'Basket Total' as calculation_type,
  pre_tax_basket_amount,
  taxed_basket_amount,
  post_tax_basket_amount,
  total_basket_amount
FROM calc_total_basket_cost(
  200000::numeric,  -- total articles cost
  30000::numeric,   -- old gold items cost
  10000::numeric,   -- extra discount
  15000::numeric    -- total add-on cost
);

-- 5. Complex example: Calculate costs for multiple articles in a basket
WITH article_calculations AS (
  SELECT 
    article_id,
    article_karat,
    article_weight,
    pre_tax_article_cost,
    luxury_tax_amount,
    post_tax_article_cost,
    final_cost
  FROM (
    VALUES 
      ('ART001', 22, 12.5, 100000),
      ('ART002', 24, 8.0, 100000),
      ('ART003', 18, 20.0, 100000)
  ) AS articles(article_id, article_karat, article_weight, gold_rate_24k),
  LATERAL calc_article_cost(
    gold_rate_24k::numeric,
    article_karat::integer,
    article_weight::numeric,
    1000::numeric,   -- add-on cost
    0.5::numeric,    -- wastage
    2000::numeric,   -- making charge
    0::numeric       -- no discount
  )
),
basket_summary AS (
  SELECT 
    SUM(post_tax_article_cost) as total_articles_cost,
    SUM(1000) as total_add_on_cost  -- Each article has 1000 add-on cost
  FROM article_calculations
)
SELECT 
  'Multi-Article Basket' as calculation_type,
  (SELECT total_articles_cost FROM basket_summary) as total_articles_cost,
  (SELECT total_add_on_cost FROM basket_summary) as total_add_on_cost,
  pre_tax_basket_amount,
  taxed_basket_amount,
  post_tax_basket_amount,
  total_basket_amount
FROM basket_summary,
LATERAL calc_total_basket_cost(
  total_articles_cost::numeric,
  5000::numeric,   -- old gold value
  2000::numeric,   -- extra discount
  total_add_on_cost::numeric  -- total add-on cost
);

-- 6. View to get gold rates (can be used in applications)
CREATE OR REPLACE VIEW current_gold_rates AS
SELECT 
  24 as karat, 
  get_gold_rate_as_per_karat(
    (SELECT 95000), -- This could come from a configuration table
    24
  ) as rate_per_tola
UNION ALL
SELECT 
  22 as karat,
  get_gold_rate_as_per_karat(95000, 22) as rate_per_tola
UNION ALL
SELECT 
  18 as karat,
  get_gold_rate_as_per_karat(95000, 18) as rate_per_tola
UNION ALL
SELECT 
  14 as karat,
  get_gold_rate_as_per_karat(95000, 14) as rate_per_tola
ORDER BY karat DESC;