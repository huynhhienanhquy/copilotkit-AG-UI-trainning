# API Design: [Resource Name]

## Endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/[resource] | List resources |
| GET | /api/v1/[resource]/:id | Get single resource |
| POST | /api/v1/[resource] | Create resource |
| PATCH | /api/v1/[resource]/:id | Update resource |
| DELETE | /api/v1/[resource]/:id | Delete resource |

## Request Schema

### POST /api/v1/[resource]

```json
{
  "field": "string (required)",
  "optionalField": "string (optional)"
}
```

### Validation Rules
- `field`: required, string, max 255 chars
- `optionalField`: optional, string, max 1000 chars

## Response Schema

### Success (200/201)

```json
{
  "id": "string",
  "field": "string",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

### List Response (200)

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

## Error Responses

### Validation Error (400)

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid input",
  "details": {
    "field": "email",
    "reason": "Invalid email format"
  },
  "requestId": "uuid"
}
```

### Not Found (404)

```json
{
  "code": "NOT_FOUND",
  "message": "Resource not found",
  "requestId": "uuid"
}
```

### Unauthorized (401)

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required",
  "requestId": "uuid"
}
```

## Authorization

| Endpoint | Required Role | Notes |
|----------|---------------|-------|
| GET | authenticated | own resources only |
| POST | authenticated | - |
| PATCH | authenticated | own resources only |
| DELETE | authenticated | own resources only |

## Versioning

- Current version: v1
- Strategy: URL path prefix
- Breaking change policy: [describe]

## Pagination

- Default limit: 20
- Max limit: 100
- Cursor-based / offset-based: [choose]

## Examples

### Create Resource

```bash
curl -X POST /api/v1/resource \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

### List Resources

```bash
curl /api/v1/resource?page=1&limit=20
```

## Open Questions
- [ ] Field-level access control needed?
- [ ] Rate limiting per endpoint?
- [ ] Webhook events for mutations?
