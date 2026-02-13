-- Modify gold calculator functions to separate addon costs from taxes

-- Drop existing functions first
DROP FUNCTION IF EXISTS calc_article_cost(numeric,integer,numeric,numeric,numeric,numeric,numeric);
DROP FUNCTION IF EXISTS calc_total_basket_cost(numeric,numeric,numeric);

-- 1. Updated Function to calculate article cost
-- Remove add_on_cost from pre_tax calculation and add final_cost field
CREATE OR REPLACE FUNCTION calc_article_cost(
    gold_rate_24k_per_tola NUMERIC,
    article_karat INTEGER,
    article_net_weight NUMERIC,
    add_on_cost NUMERIC,
    wastage NUMERIC,
    making_charge NUMERIC,
    discount NUMERIC
) RETURNS TABLE(
    pre_tax_article_cost NUMERIC,
    luxury_tax_amount NUMERIC,
    post_tax_article_cost NUMERIC,
    final_cost NUMERIC
) AS $$
DECLARE
    one_tola_in_gms CONSTANT NUMERIC := 11.664;
    gold_rate_as_per_karat_per_tola NUMERIC;
    gold_rate_as_per_karat_per_gram NUMERIC;
    pre_tax_cost NUMERIC;
    luxury_tax NUMERIC;
    post_tax_cost NUMERIC;
    final_article_cost NUMERIC;
BEGIN
    -- 1. Get gold rate per karat per gram
    gold_rate_as_per_karat_per_tola := get_gold_rate_as_per_karat(gold_rate_24k_per_tola, article_karat);
    gold_rate_as_per_karat_per_gram := ROUND(gold_rate_as_per_karat_per_tola / one_tola_in_gms, 2);
    
    -- 2. Calculate pre-tax article cost (excluding add_on_cost)
    pre_tax_cost := ROUND(
        (gold_rate_as_per_karat_per_gram * (article_net_weight + wastage)) + 
        making_charge - 
        discount, 
        2
    );
    
    -- 3. Calculate luxury tax (on pre_tax_cost only)
    luxury_tax := calc_luxury_tax(pre_tax_cost);
    
    -- 4. Calculate post-tax cost (pre_tax + luxury_tax)
    post_tax_cost := ROUND(pre_tax_cost + luxury_tax, 2);
    
    -- 5. Calculate final cost (post_tax + add_on_cost)
    final_article_cost := ROUND(post_tax_cost + add_on_cost, 2);
    
    -- Return the results
    pre_tax_article_cost := pre_tax_cost;
    luxury_tax_amount := luxury_tax;
    post_tax_article_cost := post_tax_cost;
    final_cost := final_article_cost;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 2. Updated Function to calculate total basket cost
-- Add total_add_on_cost parameter and total_basket_amount field
CREATE OR REPLACE FUNCTION calc_total_basket_cost(
    total_articles_cost NUMERIC,
    old_gold_items_cost NUMERIC,
    extra_discount NUMERIC,
    total_add_on_cost NUMERIC
) RETURNS TABLE(
    pre_tax_basket_amount NUMERIC,
    taxed_basket_amount NUMERIC,
    post_tax_basket_amount NUMERIC,
    total_basket_amount NUMERIC
) AS $$
DECLARE
    pre_tax_amount NUMERIC;
    tax_amount NUMERIC;
    post_tax_amount NUMERIC;
    total_amount NUMERIC;
BEGIN
    -- 1. Calculate pre-tax basket amount
    pre_tax_amount := ROUND(total_articles_cost - (old_gold_items_cost + extra_discount), 2);
    
    -- 2. Calculate tax on basket amount
    tax_amount := calc_luxury_tax(pre_tax_amount);
    
    -- 3. Calculate post-tax basket amount
    post_tax_amount := ROUND(pre_tax_amount + tax_amount, 2);
    
    -- 4. Calculate total basket amount (post_tax + total_add_on_cost)
    total_amount := ROUND(post_tax_amount + total_add_on_cost, 2);
    
    -- Return the results
    pre_tax_basket_amount := pre_tax_amount;
    taxed_basket_amount := tax_amount;
    post_tax_basket_amount := post_tax_amount;
    total_basket_amount := total_amount;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;