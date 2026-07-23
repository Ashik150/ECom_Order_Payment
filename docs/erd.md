# Entity Relationship Diagram

```mermaid
erDiagram
  USER ||--o{ ORDER : places
  CATEGORY ||--o{ CATEGORY : contains
  CATEGORY ||--o{ PRODUCT : classifies
  ORDER ||--|{ ORDER_ITEM : contains
  PRODUCT ||--o{ ORDER_ITEM : captured_in
  ORDER ||--o{ PAYMENT : receives

  USER {
    uuid id PK
    varchar email UK
    text password_hash
    enum role
    timestamp created_at
    timestamp updated_at
  }
  CATEGORY {
    uuid id PK
    varchar slug UK
    uuid parent_id FK
  }
  PRODUCT {
    uuid id PK
    varchar sku UK
    decimal price
    int stock
    enum status
    int version
    uuid category_id FK
  }
  ORDER {
    uuid id PK
    uuid user_id FK
    decimal total_amount
    enum status
  }
  ORDER_ITEM {
    uuid id PK
    uuid order_id FK
    uuid product_id FK
    int quantity
    decimal price
    decimal subtotal
  }
  PAYMENT {
    uuid id PK
    uuid order_id FK
    enum provider
    varchar transaction_id UK
    enum status
    jsonb raw_response
    timestamp processed_at
  }
```

The migration adds indexes for every assessment query path: user email, category
parent, product SKU/status/category/name, order user/status/date, order-item
order/product, and payment order/provider/status/transaction.
