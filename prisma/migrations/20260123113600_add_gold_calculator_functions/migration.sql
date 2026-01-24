-- Add gold calculator functions to PostgreSQL

-- Constants
-- ONE_TOLA_IN_GMS = 11.664
-- LUXURY_TAX_RATE = 0.02

-- 1. Function to get gold rate as per karat
CREATE OR REPLACE FUNCTION get_gold_rate_as_per_karat(
    gold_rate_24_karat NUMERIC,
    karat INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    rate NUMERIC;
BEGIN
    CASE karat
        WHEN 24 THEN
            rate := gold_rate_24_karat;
        WHEN 22 THEN
            rate := gold_rate_24_karat * 0.92;
        WHEN 18 THEN
            rate := gold_rate_24_karat * 0.75;
        WHEN 14 THEN
            rate := gold_rate_24_karat * 0.583;
        ELSE
            RAISE EXCEPTION 'Unsupported karat value: %', karat;
    END CASE;
    
    -- Round to 2 decimal places
    RETURN ROUND(rate, 2);
END;
$$ LANGUAGE plpgsql;

-- 2. Function to calculate luxury tax
CREATE OR REPLACE FUNCTION calc_luxury_tax(
    total_amount NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
    -- Calculate 2% luxury tax and round to 2 decimal places
    RETURN ROUND(total_amount * 0.02, 2);
END;
$$ LANGUAGE plpgsql;

-- 3. Function to calculate article cost
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
    post_tax_article_cost NUMERIC
) AS $$
DECLARE
    one_tola_in_gms CONSTANT NUMERIC := 11.664;
    gold_rate_as_per_karat_per_tola NUMERIC;
    gold_rate_as_per_karat_per_gram NUMERIC;
    pre_tax_cost NUMERIC;
    luxury_tax NUMERIC;
    post_tax_cost NUMERIC;
BEGIN
    -- 1. Get gold rate per karat per gram
    gold_rate_as_per_karat_per_tola := get_gold_rate_as_per_karat(gold_rate_24k_per_tola, article_karat);
    gold_rate_as_per_karat_per_gram := ROUND(gold_rate_as_per_karat_per_tola / one_tola_in_gms, 2);
    
    -- 2. Calculate pre-tax article cost
    pre_tax_cost := ROUND(
        (gold_rate_as_per_karat_per_gram * (article_net_weight + wastage)) + 
        add_on_cost + 
        making_charge - 
        discount, 
        2
    );
    
    -- 3. Calculate luxury tax
    luxury_tax := calc_luxury_tax(pre_tax_cost);
    
    -- 4. Calculate post-tax cost
    post_tax_cost := ROUND(pre_tax_cost + luxury_tax, 2);
    
    -- Return the results
    pre_tax_article_cost := pre_tax_cost;
    luxury_tax_amount := luxury_tax;
    post_tax_article_cost := post_tax_cost;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to calculate total basket cost
CREATE OR REPLACE FUNCTION calc_total_basket_cost(
    total_articles_cost NUMERIC,
    old_gold_items_cost NUMERIC,
    extra_discount NUMERIC
) RETURNS TABLE(
    pre_tax_basket_amount NUMERIC,
    taxed_basket_amount NUMERIC,
    post_tax_basket_amount NUMERIC
) AS $$
DECLARE
    pre_tax_amount NUMERIC;
    tax_amount NUMERIC;
    post_tax_amount NUMERIC;
BEGIN
    -- 1. Calculate pre-tax basket amount
    pre_tax_amount := ROUND(total_articles_cost - (old_gold_items_cost + extra_discount), 2);
    
    -- 2. Calculate tax on basket amount
    tax_amount := calc_luxury_tax(pre_tax_amount);
    
    -- 3. Calculate post-tax basket amount
    post_tax_amount := ROUND(pre_tax_amount + tax_amount, 2);
    
    -- Return the results
    pre_tax_basket_amount := pre_tax_amount;
    taxed_basket_amount := tax_amount;
    post_tax_basket_amount := post_tax_amount;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;