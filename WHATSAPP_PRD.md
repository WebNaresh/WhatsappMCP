# Product Requirement Document: WhatsApp MCP Server

## 1. Overview

A **WhatsApp MCP Server** that enables AI to create and manage WhatsApp Templates on Meta via conversation. No manual dashboard work required.

---

## 2. Core Principles

| Principle          | Description                                              |
| ------------------ | -------------------------------------------------------- |
| **No Storage**     | We don't store templates. All data lives on Meta.        |
| **One at a Time**  | Create/delete one template per call. AI loops if needed. |
| **Direct API**     | All operations go directly to Meta Graph API.            |
| **Token in Env**   | Access token stays in `.env`, never in conversation.     |
| **WABA from User** | User provides WABA ID per request.                       |

---

## 3. Security Model

| Item         | Location      | In Conversation?     |
| ------------ | ------------- | -------------------- |
| Access Token | `.env` file   | ❌ Never             |
| WABA ID      | User provides | ✅ Safe (not secret) |

---

## 4. MCP Tools Specification

### Tool 1: `get_template_format`

**Purpose:** AI calls this first to learn the correct template format.

**Input:** None (or optional category filter)

**Output:**

```typescript
{
  format: {
    name: "lowercase_with_underscores (max 512 chars)",
    category: "UTILITY | MARKETING | AUTHENTICATION",
    language: "en (default)",
    components: "array of HEADER, BODY, FOOTER, BUTTONS"
  },
  example: {
    name: "order_confirmation",
    category: "UTILITY",
    language: "en",
    components: [
      {
        type: "BODY",
        text: "Hi {{1}}! Your order {{2}} is confirmed.",
        example: { body_text: [["John", "ORD-12345"]] }
      }
    ]
  },
  rules: [
    "name: lowercase, underscores only",
    "variables: {{1}}, {{2}}, max 10",
    "AUTHENTICATION: max 1 variable",
    "example values required for approval"
  ]
}
```

---

### Tool 2: `create_whatsapp_template`

**Purpose:** Create ONE template on Meta.

**Input Schema (Zod):**

```typescript
const CreateTemplateInput = z.object({
  waba_id: z.string().regex(/^\d+$/, "Must be numeric"),

  template: z.object({
    name: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/, "lowercase_with_underscores")
      .max(512),

    category: z.enum(["UTILITY", "MARKETING", "AUTHENTICATION"]),

    language: z.string().default("en"),

    components: z.array(
      z.object({
        type: z.enum(["HEADER", "BODY", "FOOTER", "BUTTONS"]),
        text: z.string().optional(),
        format: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]).optional(),
        buttons: z
          .array(
            z.object({
              type: z.enum(["URL", "PHONE_NUMBER", "QUICK_REPLY"]),
              text: z.string(),
              url: z.string().optional(),
            }),
          )
          .optional(),
        example: z
          .object({
            body_text: z.array(z.array(z.string())).optional(),
          })
          .optional(),
      }),
    ),
  }),
});
```

**API Call:**

```http
POST https://graph.facebook.com/v21.0/{waba_id}/message_templates
Authorization: Bearer {token from .env}
```

**Success Response:**

```json
{
  "success": true,
  "template_id": "123456789",
  "status": "PENDING",
  "message": "Template created"
}
```

**Validation Error:**

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": ["template.name: Must be lowercase_with_underscores"]
}
```

---

### Tool 3: `list_whatsapp_templates`

**Purpose:** List all templates from Meta (not our storage).

**Input Schema:**

```typescript
const ListTemplatesInput = z.object({
  waba_id: z.string().regex(/^\d+$/),
  status: z.enum(["APPROVED", "PENDING", "REJECTED"]).optional(),
});
```

**API Call:**

```http
GET https://graph.facebook.com/v21.0/{waba_id}/message_templates
Authorization: Bearer {token from .env}
```

**Response:**

```json
{
  "success": true,
  "templates": [
    { "name": "otp_login", "status": "APPROVED", "id": "123" },
    { "name": "booking", "status": "PENDING", "id": "456" }
  ],
  "total": 2
}
```

---

### Tool 4: `delete_whatsapp_template`

**Purpose:** Delete ONE template from Meta.

**Input Schema:**

```typescript
const DeleteTemplateInput = z.object({
  waba_id: z.string().regex(/^\d+$/),
  template_name: z.string(),
});
```

**API Call:**

```http
DELETE https://graph.facebook.com/v21.0/{waba_id}/message_templates?name={template_name}
Authorization: Bearer {token from .env}
```

---

### Tool 5: `get_template_status`

**Purpose:** Get detailed status of ONE template from Meta.

**Input Schema:**

```typescript
const GetTemplateStatusInput = z.object({
  waba_id: z.string().regex(/^\d+$/),
  template_name: z.string(),
});
```

**Response:**

```json
{
  "success": true,
  "template": {
    "name": "proposal_rejected",
    "status": "REJECTED",
    "rejection_reason": "URL in body without URL button",
    "suggested_fix": "Add URL button or remove URL from body"
  }
}
```

---

## 5. Tools Summary

| Tool                       | Purpose                | Queries            |
| -------------------------- | ---------------------- | ------------------ |
| `get_template_format`      | Learn format           | Static (hardcoded) |
| `create_whatsapp_template` | Create 1 template      | POST to Meta       |
| `list_whatsapp_templates`  | List all templates     | GET from Meta      |
| `delete_whatsapp_template` | Delete 1 template      | DELETE on Meta     |
| `get_template_status`      | Get 1 template details | GET from Meta      |

**All read/write operations go directly to Meta. We store nothing.**

---

### Tool 6: `list_connected_wabas`

**Purpose:** List all WhatsApp Business Accounts (WABAs) accessible by the current access token.

**Input Schema:**

```typescript
const ListWabasInput = z.object({
  limit: z.number().optional().default(25),
});
```

**API Calls:**

1. Get System User ID:

   ```http
   GET https://graph.facebook.com/v21.0/me
   Authorization: Bearer {token}
   ```

   Response: `{ "id": "12345", "name": "System User" }`

2. Get WABAs:
   ```http
   GET https://graph.facebook.com/v21.0/{user_id}/assigned_whatsapp_business_accounts
   Authorization: Bearer {token}
   ```

**Response:**

```json
{
  "success": true,
  "wabas": [
    { "id": "278469...", "name": "Practice Stacks", "currency": "INR" },
    { "id": "168563...", "name": "Abhyasika", "currency": "INR" }
  ]
}
```

---

## 6. Project Structure

```
WhatsappMCP/
├── src/
│   ├── server.ts              # MCP entry point
│   ├── tools/
│   │   ├── get-format.ts      # get_template_format
│   │   ├── create.ts          # create_whatsapp_template
│   │   ├── list.ts            # list_whatsapp_templates
│   │   ├── delete.ts          # delete_whatsapp_template
│   │   └── status.ts          # get_template_status
│   ├── schemas/
│   │   └── template.ts        # Zod schemas
│   └── lib/
│       └── meta-api.ts        # Meta Graph API client
├── .env                       # WHATSAPP_ACCESS_TOKEN
├── package.json
└── tsconfig.json
```

---

## 7. Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "zod": "^3.22.0",
  "axios": "^1.6.0",
  "dotenv": "^16.0.0"
}
```

---

## 8. Environment Variables

```bash
# .env (never commit!)
WHATSAPP_ACCESS_TOKEN=EAAGm0PX4ZCps...
```

Required permission: `whatsapp_business_management`

---

## 9. Error Handling

### Zod Validation Errors

When AI sends wrong format, MCP returns clear errors:

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": ["template.name: Must be lowercase"]
}
```

AI reads errors, fixes, and retries.

### Meta API Errors

| Code   | Meaning         | Suggested Fix                 |
| ------ | --------------- | ----------------------------- |
| 100    | Template exists | Delete first or rename        |
| 190    | Invalid token   | Regenerate in Meta Developers |
| 368    | Rate limited    | Wait 60s and retry            |
| 131000 | Invalid format  | Check body/variables          |

---

## 10. Multi-App Support

```
One Business (Novibyte Innovations) → One Access Token
├── Practice Stacks    → WABA: 278469610073775
├── Abhyasika          → WABA: 168563435816817
├── Sparsh Glow        → WABA: xxxxxxxxxx
└── Test Account       → WABA: xxxxxxxxxx

User provides WABA ID per request.
Token shared across all apps.
```

---

## 11. Implementation Checklist

- [ ] Initialize project with dependencies
- [ ] Create Zod schemas
- [ ] Implement `get_template_format`
- [ ] Implement `create_whatsapp_template`
- [ ] Implement `list_whatsapp_templates`
- [ ] Implement `delete_whatsapp_template`
- [ ] Implement `get_template_status`
- [ ] Add Meta API client
- [ ] Add MCP server entry point
- [ ] Test single template creation
- [ ] Configure in Cursor
