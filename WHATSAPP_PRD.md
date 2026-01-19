# Product Requirement Document: WhatsApp MCP Server

## 1. Overview

This document defines the requirements for a **WhatsApp MCP (Model Context Protocol) Server**. The primary goal is to **automate the creation and management of WhatsApp Templates** on Meta via AI conversation, eliminating manual dashboard work.

## 2. Problem Statement

- Creating WhatsApp templates manually in Meta Dashboard is tedious and error-prone
- Multiple apps (Practice Stacks, Abhyasika, Sparsh Glow, etc.) each need different templates
- AI can generate template specs but user still has to copy/paste to dashboard manually
- No validation feedback loop between AI and Meta API

## 3. Solution: WhatsApp Management MCP Server

A local MCP server that exposes tools to programmatically manage templates across multiple WhatsApp Business Accounts.

---

## 4. Architecture

### 4.1 Security Model

| Item           | Storage               | Exposed in Chat?     |
| -------------- | --------------------- | -------------------- |
| Access Token   | `.env` file           | ❌ Never             |
| WABA ID        | User provides         | ✅ Safe (not secret) |
| Template specs | Markdown/conversation | ✅ AI reads          |

### 4.2 Server Structure

```
WhatsappMCP/
├── src/
│   ├── server.ts          # MCP server entry point
│   ├── tools/
│   │   ├── create.ts      # create_whatsapp_template
│   │   ├── list.ts        # list_whatsapp_templates
│   │   └── delete.ts      # delete_whatsapp_template
│   ├── schemas/
│   │   └── template.ts    # Zod validation schemas
│   └── lib/
│       └── meta-api.ts    # Meta Graph API client
├── .env                   # WHATSAPP_ACCESS_TOKEN (secret)
├── package.json
└── tsconfig.json
```

### 4.3 Multi-App Support

```
One Business Portfolio (Novibyte Innovations)
├── Practice Stacks    → WABA ID: 278469610073775
├── Abhyasika          → WABA ID: 168563435816817
├── Sparsh Glow        → WABA ID: xxxxxxxxxx
└── Test Account       → WABA ID: xxxxxxxxxx

All share ONE access token in .env
User specifies WABA ID per request
```

---

## 5. MCP Tools Specification

### Tool 1: `create_whatsapp_template`

Creates a single template on Meta.

**Input Schema (Zod):**

```typescript
const CreateTemplateInput = z.object({
  waba_id: z.string().regex(/^\d+$/, "WABA ID must be numeric"),

  template: z.object({
    name: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/, "Name must be lowercase with underscores")
      .max(512, "Name max 512 chars"),

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
              phone_number: z.string().optional(),
            }),
          )
          .optional(),
        example: z
          .object({
            body_text: z.array(z.array(z.string())).optional(),
            header_text: z.array(z.string()).optional(),
          })
          .optional(),
      }),
    ),
  }),
});
```

**Success Response:**

```typescript
{
  success: true,
  template_id: "123456789",
  status: "PENDING" | "APPROVED" | "REJECTED",
  message: "Template created successfully"
}
```

**Error Response (Validation):**

```typescript
{
  success: false,
  error: "VALIDATION_ERROR",
  details: [
    "template.name: Name must be lowercase with underscores",
    "template.category: Expected UTILITY|MARKETING|AUTHENTICATION, got 'utility'"
  ]
}
```

**Error Response (Meta API):**

```typescript
{
  success: false,
  error: "META_API_ERROR",
  code: 100,
  message: "Template with this name already exists",
  suggestion: "Use a different name or delete existing template first"
}
```

---

### Tool 2: `list_whatsapp_templates`

Lists all templates for a WABA.

**Input Schema:**

```typescript
const ListTemplatesInput = z.object({
  waba_id: z.string().regex(/^\d+$/),
  status: z.enum(["APPROVED", "PENDING", "REJECTED"]).optional(),
});
```

**Response:**

```typescript
{
  success: true,
  templates: [
    {
      name: "otp_login_verification",
      status: "APPROVED",
      category: "AUTHENTICATION",
      language: "en",
      id: "123456789"
    },
    // ...
  ],
  total: 9
}
```

---

### Tool 3: `delete_whatsapp_template`

Deletes a template by name.

**Input Schema:**

```typescript
const DeleteTemplateInput = z.object({
  waba_id: z.string().regex(/^\d+$/),
  template_name: z.string(),
});
```

---

### Tool 4: `get_template_status`

Gets detailed status of a specific template.

**Input Schema:**

```typescript
const GetTemplateStatusInput = z.object({
  waba_id: z.string().regex(/^\d+$/),
  template_name: z.string(),
});
```

**Response:**

```typescript
{
  success: true,
  template: {
    name: "proposal_rejected",
    status: "REJECTED",
    rejection_reason: "Template contains promotional content but marked as UTILITY",
    suggested_fix: "Change category to MARKETING or remove promotional language"
  }
}
```

---

## 6. Validation & Error Handling

### 6.1 Why Zod Validation?

When AI sends incorrect format:

```
AI calls: create_whatsapp_template({
  waba_id: "practice_stacks",  // ❌ Should be numeric
  template: {
    name: "OTP-Login",         // ❌ Should be lowercase+underscore
    category: "utility",       // ❌ Should be uppercase
  }
})

MCP returns clear errors:
{
  success: false,
  error: "VALIDATION_ERROR",
  details: [
    "waba_id: Must be numeric string, got 'practice_stacks'",
    "template.name: Must match /^[a-z][a-z0-9_]*$/, got 'OTP-Login'",
    "template.category: Must be UTILITY|MARKETING|AUTHENTICATION, got 'utility'"
  ]
}

AI reads errors, fixes, and retries! ✅
```

### 6.2 Meta API Error Mapping

| Meta Error Code | Friendly Message        | Suggested Fix                       |
| --------------- | ----------------------- | ----------------------------------- |
| 100             | Template already exists | Delete first or use different name  |
| 190             | Invalid access token    | Regenerate token in Meta Developers |
| 368             | Rate limited            | Wait 60 seconds and retry           |
| 131000          | Invalid template format | Check body text and variables       |

---

## 7. User Flow

### One-Time Setup

1. Add `WHATSAPP_ACCESS_TOKEN` to `.env`
2. Configure MCP in Cursor settings
3. Restart Cursor

### Main Flow

```
Step 1: You say "Create templates for WABA ID: 278469610073775"
Step 2: AI asks for template source (markdown file or inline)
Step 3: You point to WHATSAPP_TEMPLATES_LIST.md
Step 4: AI parses file, shows template list
Step 5: You confirm "Create all"
Step 6: AI calls MCP for each template
Step 7: MCP validates with Zod, calls Meta API
Step 8: Results returned to AI
Step 9: AI shows success/failure table
```

### Switching Apps

```
You: "Now create for Abhyasika - WABA ID: 168563435816817"
(Same token, different WABA ID)
```

---

## 8. Technical Stack

### Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "zod": "^3.22.0",
  "axios": "^1.6.0",
  "dotenv": "^16.0.0"
}
```

### Environment Variables

```bash
# .env (never commit!)
WHATSAPP_ACCESS_TOKEN=EAAGm0PX4ZCps...
```

Token must have permission: `whatsapp_business_management`

---

## 9. Template Definitions Source

Templates can come from:

1. **Markdown file** (like `WHATSAPP_TEMPLATES_LIST.md`)
2. **Inline in conversation** (AI builds template object)
3. **TypeScript config** (for frequently used templates)

AI parses the source and extracts template data to pass to MCP tools.

---

## 10. Implementation Steps

1. [ ] Initialize project with dependencies
2. [ ] Create Zod schemas for validation
3. [ ] Implement Meta API client
4. [ ] Implement `create_whatsapp_template` tool
5. [ ] Implement `list_whatsapp_templates` tool
6. [ ] Implement `delete_whatsapp_template` tool
7. [ ] Implement `get_template_status` tool
8. [ ] Add MCP server entry point
9. [ ] Test with single template
10. [ ] Test with batch creation
11. [ ] Document and configure in Cursor

---

## 11. Success Criteria

- [ ] AI can create templates without user touching Meta Dashboard
- [ ] Validation errors help AI self-correct
- [ ] Works across multiple WABA accounts with one command
- [ ] Token never exposed in conversation
- [ ] 9 templates created in under 60 seconds
