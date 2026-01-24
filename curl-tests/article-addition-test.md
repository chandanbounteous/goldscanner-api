# Curl Requests for Testing Article Addition to Basket

## Prerequisites

Before testing these endpoints, you'll need:

1. **Authentication token**: Login first to get a JWT token
2. **Customer ID**: A valid customer UUID from the database
3. **Article ID**: A valid gold article UUID from the database

---

## Step 1: Get Authentication Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Save the `accessToken` from the response for subsequent requests.**

---

## Step 2: Create a Basket (if needed)

```bash
curl -X POST http://localhost:3000/api/v1/customer/116de56f-2ea8-444a-ad47-f021b1d4c0a5/basket \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "isGoldRateFixed": false
  }'
```

**Save the `basket.id` from the response for the next request.**

---

## Step 3: Add Article to Basket - Basic Request

```bash
curl -X POST http://localhost:3000/api/v1/customer/basket/BASKET_ID_HERE/article \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "ARTICLE_ID_HERE",
    "netWeight": 25.50,
    "grossWeight": 26.20,
    "wastage": 0.5,
    "makingCharge": 2000
  }'
```

## Step 4: Add Article with All Optional Fields

```bash
curl -X POST http://localhost:3000/api/v1/customer/basket/BASKET_ID_HERE/article \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "ARTICLE_ID_HERE",
    "netWeight": 15.75,
    "grossWeight": 16.50,
    "addOnCost": 1000,
    "wastage": 0.75,
    "makingCharge": 3000,
    "discount": 500
  }'
```

---

## Test With Actual Data from Database

### Get Customer and Article IDs:

```bash
# Get customer ID (run this in your database or via API)
# Example customer ID from previous test: 116de56f-2ea8-444a-ad47-f021b1d4c0a5

# Get article ID (run this in your database or create via gold article endpoint)
# You'll need an actual gold article ID from your database
```

### Complete Example with Real IDs:

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | \
  jq -r '.body.accessToken')

# 2. Create basket
BASKET_ID=$(curl -s -X POST http://localhost:3000/api/v1/customer/116de56f-2ea8-444a-ad47-f021b1d4c0a5/basket \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isGoldRateFixed": false}' | \
  jq -r '.body.basket.id')

# 3. Add article to basket (replace ARTICLE_ID_HERE with actual article ID)
curl -X POST http://localhost:3000/api/v1/customer/basket/$BASKET_ID/article \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "ARTICLE_ID_HERE",
    "netWeight": 25.50,
    "grossWeight": 26.20,
    "addOnCost": 1000,
    "wastage": 0.5,
    "makingCharge": 2000,
    "discount": 250
  }'
```

---

## Expected Responses

### Success Response (201):

```json
{
  "responseCode": 201,
  "responseMessage": "Article added to basket successfully",
  "body": {
    "basketArticleId": "uuid-of-new-record",
    "basketArticle": {
      "id": "uuid-of-new-record",
      "basketId": "basket-uuid",
      "articleId": "article-uuid",
      "netWeight": 25.5,
      "grossWeight": 26.2,
      "addOnCost": 1000,
      "wastage": 0.5,
      "makingCharge": 2000,
      "discount": 250
    }
  }
}
```

### Error Response - Article Already in Basket (400):

```json
{
  "responseCode": 400,
  "responseMessage": "Article already in basket",
  "body": {
    "errors": [
      {
        "field": "articleId",
        "message": "This article is already added to the basket"
      }
    ]
  }
}
```

### Error Response - Basket Not Found (404):

```json
{
  "responseCode": 404,
  "responseMessage": "Basket not found",
  "body": {
    "errors": [
      {
        "field": "basketId",
        "message": "Basket with the provided ID does not exist"
      }
    ]
  }
}
```

---

## Tips for Testing

1. **Get Article IDs**: Use the existing gold articles endpoint to see available articles:

   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/v1/gold/articles
   ```

2. **Check Basket Status**: Ensure the basket is not billed or discarded before adding articles

3. **Validate UUIDs**: Make sure all IDs are valid UUID format

4. **Test Error Cases**: Try adding the same article twice, using invalid IDs, etc.

5. **Verify Data**: Check the database to confirm the article was added to the basket correctly
