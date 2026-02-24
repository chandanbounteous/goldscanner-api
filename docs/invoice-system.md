# Invoice Generation System

## Overview

The invoice generation system automatically creates invoice snapshots when a basket is billed. It captures the complete state of the basket at billing time, including all calculations and customer details, ensuring the invoice remains consistent even if master data changes later.

## Key Components

### 1. Database Schema

The `CustomerInvoice` model stores invoice information:

```prisma
model CustomerInvoice {
  id              String   @id @default(uuid())
  basketId        String   @unique
  invoiceNumber   String   @unique
  invoiceSnapshot Json     // Complete invoice snapshot
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  basket CustomerBasket @relation(fields: [basketId], references: [id])

  @@map("customer_invoices")
}
```

### 2. Invoice Number Generation

Invoice numbers follow the format `GL-XXXX` starting from `GL-0001` and increment sequentially.

### 3. Invoice Snapshot Structure

The invoice snapshot captures:

- **Basket Information**: Billing details, gold rates, discounts
- **Customer Information**: Complete customer details
- **Articles**: All article details with calculated amounts
- **Calculations**: Subtotals, adjustments, and final amounts
- **Metadata**: Creation info (using user's full name), version, currency

## API Endpoints

### Automatic Invoice Creation

When updating a basket with `isBilled: true`, the system automatically creates an invoice after successfully updating the basket with all provided fields:

```http
PATCH /api/v1/customer/basket/{basketId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "isBilled": true,
  "billingDate": "2024-02-24T10:30:00Z",
  "billingDateNepali": {
    "year": 2080,
    "month": 11,
    "day": 12
  },
  "billedGoldRate24KPerTola": 89000
}
```

The system automatically:

1. Updates the basket billing information
2. Creates an invoice record with generated invoice number
3. Captures complete invoice snapshot

### Manual Invoice Creation

If needed, invoices can be created manually:

```http
POST /api/v1/invoice/create/{basketId}
Authorization: Bearer <token>
```

### Invoice Retrieval

Get invoice by basket ID:

```http
GET /api/v1/invoice/basket/{basketId}
```

Get invoice by invoice number:

```http
GET /api/v1/invoice/number/{invoiceNumber}
```

## Calculation Functions

### Article Invoice Calculations

```typescript
GoldCalculator.calcArticleInvoiceCalculations(
  billedGoldRate24KPerTola,
  karat,
  netWeight,
  wastage,
  stoneWeight,
);
```

Returns:

- `ratePerGram`: Gold rate per gram for the specific karat
- `totalWeightWithWastage`: Net weight + wastage
- `totalAmountForWeightWithWastage`: Amount for weight including wastage
- `totalWeightWithWastageAndStoneWeight`: Total weight including stones
- `totalAmountForWeightWithWastageAndStoneWeight`: Final amount including stones

### Consolidated Invoice Calculations

```typescript
GoldCalculator.calcConsolidatedInvoiceCalculations(
  articles,
  totalDiscount,
  extraDiscount,
);
```

Returns:

- `consolidatedTotalAmountForAllArticles`: Sum of all article amounts
- `discount`: Total discounts (article + extra)
- `taxableAmount`: Amount after discounts
- `luxuryTax`: 2% luxury tax on taxable amount
- `netAmount`: Final amount including tax

## Usage Examples

### 1. Billing a Basket

```javascript
// Client-side request
const response = await fetch(
  "/api/v1/customer/basket/123e4567-e89b-12d3-a456-426614174000",
  {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      isBilled: true,
      billingDate: new Date().toISOString(),
      billingDateNepali: { year: 2080, month: 11, day: 12 },
      billedGoldRate24KPerTola: 89000,
    }),
  },
);

// Invoice is automatically created
```

### 2. Retrieving Invoice for PDF Generation

```javascript
const invoiceResponse = await fetch(
  "/api/v1/invoice/basket/123e4567-e89b-12d3-a456-426614174000",
  {
    headers: {
      Authorization: "Bearer " + token,
    },
  },
);

const invoiceData = await invoiceResponse.json();
const snapshot = invoiceData.body.invoice.invoiceSnapshot;

// Use snapshot data to generate PDF
generatePDF(snapshot);
```

## Error Handling

The system handles various error scenarios:

1. **Duplicate Invoice Creation**: Prevents creating multiple invoices for the same basket
2. **Non-billed Basket**: Ensures invoices are only created for billed baskets
3. **Missing Data**: Validates all required data is present
4. **Calculation Errors**: Handles mathematical edge cases

## Benefits

1. **Data Integrity**: Invoice snapshot preserves exact billing state
2. **Audit Trail**: Complete record of what was billed and when
3. **Performance**: Pre-calculated amounts avoid complex runtime calculations
4. **Consistency**: Invoice remains unchanged even if master data changes
5. **Flexibility**: JSON structure allows for easy PDF generation and reporting

## Migration

When deploying this feature:

1. Run the Prisma migration to create the `customer_invoices` table
2. Existing billed baskets can have invoices created manually using the manual creation endpoint
3. New basket billing will automatically create invoices

```bash
# Run migration
npx prisma migrate deploy

# Create invoices for existing billed baskets (optional)
POST /api/v1/invoice/create/{basketId} for each billed basket
```
