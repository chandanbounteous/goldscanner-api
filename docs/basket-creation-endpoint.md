# Basket Creation Endpoint

## Overview

The POST `/api/v1/customer/:customerId/basket` endpoint allows creating a new basket for a customer with optional fixed gold rate functionality.

## Endpoint Details

**URL**: `POST /api/v1/customer/:customerId/basket`
**Authentication**: Required (Bearer Token)

### Path Parameters

- `customerId` (UUID, required): The customer's unique identifier

### Request Body Parameters

| Parameter                 | Type    | Required      | Description                                                           |
| ------------------------- | ------- | ------------- | --------------------------------------------------------------------- |
| `isGoldRateFixed`         | boolean | No            | Whether to fix the gold rate for this basket (default: false)         |
| `fixedGoldRate24KPerTola` | number  | Conditional\* | Fixed gold rate per tola (required if isGoldRateFixed is true)        |
| `fixedGoldRateNepaliDate` | object  | Conditional\* | Nepali date when rate was fixed (required if isGoldRateFixed is true) |

\*Required only when `isGoldRateFixed` is `true`

### Nepali Date Format

```json
{
  "year": 2081,
  "month": 10,
  "dayOfMonth": 15
}
```

## Request Examples

### 1. Create Basic Basket (No Fixed Rate)

```bash
curl -X POST http://localhost:3000/api/v1/customer/116de56f-2ea8-444a-ad47-f021b1d4c0a5/basket \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Create Basket with Fixed Gold Rate

```bash
curl -X POST http://localhost:3000/api/v1/customer/116de56f-2ea8-444a-ad47-f021b1d4c0a5/basket \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isGoldRateFixed": true,
    "fixedGoldRate24KPerTola": 95000,
    "fixedGoldRateNepaliDate": {
      "year": 2081,
      "month": 10,
      "dayOfMonth": 15
    }
  }'
```

## Response Examples

### Success Response (201)

```json
{
  "responseCode": 201,
  "responseMessage": "Basket created successfully",
  "body": {
    "basket": {
      "id": "uuid-basket-id",
      "basketNumber": 1000,
      "customerId": "116de56f-2ea8-444a-ad47-f021b1d4c0a5",
      "isGoldRateFixed": true,
      "fixedGoldRate24KPerTola": 95000,
      "fixedGoldRateNepaliDate": {
        "year": 2081,
        "month": 10,
        "dayOfMonth": 15
      },
      "oldGoldItemCost": 0,
      "extraDiscount": 0,
      "luxuryTax": 0,
      "finalCost": null,
      "isBilled": false,
      "isDiscarded": false,
      "createdAt": "2026-01-23T23:35:18.000Z",
      "updatedAt": "2026-01-23T23:35:18.000Z"
    }
  }
}
```

### Error Response - Open Basket Exists (400)

```json
{
  "responseCode": 400,
  "responseMessage": "Customer already has an open basket",
  "body": {
    "openBasketId": "existing-basket-uuid",
    "errors": [
      {
        "field": "basket",
        "message": "Customer already has an open basket (ID: existing-basket-uuid). Close or discard the existing basket before creating a new one."
      }
    ]
  }
}
```

### Error Response - Customer Not Found (404)

```json
{
  "responseCode": 404,
  "responseMessage": "Customer not found",
  "body": {
    "errors": [
      {
        "field": "customerId",
        "message": "Customer with the provided ID does not exist"
      }
    ]
  }
}
```

### Error Response - Validation Error (400)

```json
{
  "responseCode": 400,
  "responseMessage": "Validation failed",
  "body": {
    "errors": [
      {
        "field": "fixedGoldRate24KPerTola",
        "message": "fixedGoldRate24KPerTola is required and must be a positive number when isGoldRateFixed is true"
      }
    ]
  }
}
```

## Business Rules

1. **One Open Basket**: A customer can only have one open basket at a time (not billed and not discarded)
2. **Auto-numbering**: Basket numbers start from 1000 and auto-increment
3. **Fixed Rate Validation**: When `isGoldRateFixed` is true, both `fixedGoldRate24KPerTola` and `fixedGoldRateNepaliDate` are required
4. **Customer Validation**: Customer must exist in the database before creating a basket

## Status Codes

- **201**: Basket created successfully
- **400**: Validation error or open basket exists
- **401**: Authentication required
- **404**: Customer not found
- **500**: Internal server error
