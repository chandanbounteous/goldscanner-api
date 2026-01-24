# Customer Basket Discard Functionality

## Overview

The customer basket system now includes discard functionality to allow marking baskets as discarded/deleted without permanently removing them from the database.

## New Database Columns

### customer_baskets table additions:

- `isDiscarded`: Boolean (default: false) - Indicates if the basket is discarded
- `discardedDate`: DateTime (optional) - When the basket was discarded
- `discardedDateNepali`: JSON (optional) - Discarded date in Nepali calendar format

## BasketService Methods

### Discard a Basket

```typescript
// Discard a basket with current date
const discardedBasket = await BasketService.discardBasket(basketId);

// Discard with specific date and Nepali date
const discardedBasket = await BasketService.discardBasket(
  basketId,
  new Date(),
  nepaliDateObject,
);
```

### Restore a Discarded Basket

```typescript
const restoredBasket = await BasketService.restoreBasket(basketId);
```

### Get Active Baskets (Not Discarded)

```typescript
// Get all active baskets
const activeBaskets = await BasketService.getActiveBaskets();

// Get active baskets for specific customer
const customerActiveBaskets = await BasketService.getActiveBaskets(customerId);
```

### Get Discarded Baskets

```typescript
// Get all discarded baskets
const discardedBaskets = await BasketService.getDiscardedBaskets();

// Get discarded baskets for specific customer
const customerDiscardedBaskets =
  await BasketService.getDiscardedBaskets(customerId);
```

## Database Queries

### Check if basket is discarded

```sql
SELECT isDiscarded, discardedDate, discardedDateNepali
FROM customer_baskets
WHERE id = 'basket-uuid';
```

### Get all active baskets

```sql
SELECT * FROM customer_baskets
WHERE isDiscarded = false
ORDER BY createdAt DESC;
```

### Get discarded baskets by date

```sql
SELECT * FROM customer_baskets
WHERE isDiscarded = true
  AND discardedDate >= '2026-01-01'
ORDER BY discardedDate DESC;
```

## Usage Patterns

### Soft Delete Pattern

- Instead of DELETE, use `BasketService.discardBasket()`
- Maintain audit trail with discard timestamps
- Allow data recovery with `BasketService.restoreBasket()`

### Filtering in UI

- Use `getActiveBaskets()` for normal basket listings
- Use `getDiscardedBaskets()` for "recycle bin" views
- Show discard date for historical tracking

### Business Logic

- Discarded baskets should not appear in active reports
- Billing operations should exclude discarded baskets
- Consider automatic cleanup after retention period
