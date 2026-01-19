# WhatsApp MCP Server

An MCP (Model Context Protocol) server that enables AI to create and manage WhatsApp Templates on Meta via conversation.

## Features

- **No Manual Dashboard Work** - Create templates via AI conversation
- **Multi-App Support** - Works with multiple WhatsApp Business Accounts
- **Validation** - Zod schemas ensure correct format, AI self-corrects on errors
- **Direct to Meta** - No storage, all operations go directly to Meta API

## Tools

| Tool                       | Purpose                          |
| -------------------------- | -------------------------------- |
| `get_template_format`      | Get the required template format |
| `create_whatsapp_template` | Create ONE template on Meta      |
| `list_whatsapp_templates`  | List templates from Meta         |
| `delete_whatsapp_template` | Delete ONE template              |
| `get_template_status`      | Get template approval status     |

## Installation

```bash
# Clone the repo
cd WhatsappMCP

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

### 1. Add Access Token

Create `.env` file:

```bash
WHATSAPP_ACCESS_TOKEN=your_meta_access_token_here
```

> Token must have `whatsapp_business_management` permission.

### 2. Configure Cursor

Add to `~/.cursor/mcp_settings.json`:

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "node",
      "args": ["c:/coding-line/WhatsappMCP/dist/server.js"]
    }
  }
}
```

### 3. Restart Cursor

## Usage

### Design Phase (No MCP)

```
YOU: I need a booking confirmation template

AI: Here's a draft:
    Hi {{customer_name}}!
    Your booking for {{service_name}} is confirmed.
    Date: {{date}}

YOU: Add booking ID

AI: Updated:
    Hi {{customer_name}}!
    Your booking for {{service_name}} is confirmed.
    Date: {{date}}
    Booking ID: {{booking_id}}
```

### Create Phase (With MCP)

```
YOU: Create this on WhatsApp

AI: Let me check the format...
    [calls get_template_format()]

    Converting to correct format:
    - name: booking_confirmation
    - variables: {{1}}, {{2}}, {{3}}, {{4}}

    I need your WABA ID to create this.

YOU: 278469610073775

AI: Creating...
    [calls create_whatsapp_template()]

    ✅ Created! Status: Pending Approval
```

### Other Operations

```
YOU: List templates for WABA 278469610073775
AI: [calls list_whatsapp_templates()]
    Shows all templates from Meta

YOU: Delete booking_confirmation from WABA 278469610073775
AI: [calls delete_whatsapp_template()]
    ✅ Deleted!

YOU: Why was my template rejected?
AI: [calls get_template_status()]
    Reason: "URL in body without URL button"
```

## Project Structure

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
│   │   └── template.ts        # Zod validation schemas
│   └── lib/
│       └── meta-api.ts        # Meta Graph API client
├── .env                       # Access token (not committed)
├── package.json
├── tsconfig.json
└── README.md
```

## Security

| Item         | Location     | Exposed? |
| ------------ | ------------ | -------- |
| Access Token | `.env`       | ❌ Never |
| WABA ID      | Conversation | ✅ Safe  |

## License

MIT
