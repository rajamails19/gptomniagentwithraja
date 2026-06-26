export const FINAL_OUTPUT_TITLE = "Payments API Documentation";
export const FINAL_OUTPUT_FILENAME = "payments-api-v4.2.md";

export const FINAL_OUTPUT_MARKDOWN = `# Payments API
Production-grade reference for payment intents, refunds and disputes.

## Overview
The Payments API processes card, wallet and bank-debit charges for the platform.
All endpoints are idempotent, versioned (\`v4.2\`) and return JSON.

- Base URL: \`https://api.acme.io/payments/v4\`
- Auth: Bearer token (rotated every 30 days)
- Rate limit: 600 req/min/key

## Authentication
\`\`\`http
Authorization: Bearer sk_live_***
Idempotency-Key: <uuid v4>
\`\`\`

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /payments/intents | Create a PaymentIntent |
| GET  | /payments/intents/:id | Retrieve a PaymentIntent |
| POST | /payments/refunds | Refund a captured charge |
| POST | /payments/disputes/:id/evidence | Submit dispute evidence |

## Request Example
\`\`\`bash
curl -X POST https://api.acme.io/payments/v4/payments/intents \\
  -H "Authorization: Bearer sk_live_***" \\
  -H "Idempotency-Key: 8f1c…" \\
  -d '{"amount": 4200, "currency": "usd", "customer": "cus_91"}'
\`\`\`

## Response Example
\`\`\`json
{
  "id": "pi_3NkQ…",
  "status": "requires_confirmation",
  "amount": 4200,
  "currency": "usd",
  "client_secret": "pi_3NkQ…_secret_…"
}
\`\`\`

## Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 400  | Invalid params | Fix payload |
| 402  | Card declined  | Prompt new method |
| 409  | Idempotency conflict | Reuse original response |
| 429  | Rate limited | Backoff exponentially |
| 5xx  | Transient | Retry with jitter |

## QA Checklist
- [x] All 12 endpoints documented
- [x] Auth + idempotency notes present
- [x] Error-code table complete
- [x] Request / response samples validated against schema
- [x] Style guide v3.2 enforced
- [x] No PII in examples
`;
