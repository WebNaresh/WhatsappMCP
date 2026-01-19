#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getTemplateFormat } from "./tools/get-format.js";
import { createWhatsappTemplate } from "./tools/create.js";
import { listWhatsappTemplates } from "./tools/list.js";
import { deleteWhatsappTemplate } from "./tools/delete.js";
import { getTemplateStatus } from "./tools/status.js";

// Create MCP server
const server = new McpServer({
    name: "whatsapp-template-manager",
    version: "1.0.0",
});

// Tool 1: get_template_format
server.registerTool(
    "get_template_format",
    {
        title: "Get Template Format",
        description:
            "Get the required format for creating WhatsApp templates. Call this first to understand the correct structure before creating templates.",
        inputSchema: {},
    },
    async () => {
        const format = getTemplateFormat();
        return {
            content: [{ type: "text", text: JSON.stringify(format, null, 2) }],
        };
    },
);

// Tool 2: create_whatsapp_template
server.registerTool(
    "create_whatsapp_template",
    {
        title: "Create WhatsApp Template",
        description:
            "Create ONE WhatsApp message template on Meta. Requires WABA ID and template definition.",
        inputSchema: {
            waba_id: z
                .string()
                .describe(
                    'WhatsApp Business Account ID (numeric string, e.g., "278469610073775")',
                ),
            template: z.object({
                name: z.string().describe("Template name (lowercase_with_underscores)"),
                category: z
                    .enum(["UTILITY", "MARKETING", "AUTHENTICATION"])
                    .describe("Template category"),
                language: z.string().optional().describe("Language code (default: en)"),
                components: z
                    .array(
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
                    )
                    .describe("Template components (BODY required)"),
            }),
        },
    },
    async (input) => {
        const result = await createWhatsappTemplate(input);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    },
);

// Tool 3: list_whatsapp_templates
server.registerTool(
    "list_whatsapp_templates",
    {
        title: "List WhatsApp Templates",
        description:
            "List all WhatsApp templates from a WABA account. Queries Meta API directly.",
        inputSchema: {
            waba_id: z.string().describe("WhatsApp Business Account ID"),
            status: z
                .enum(["APPROVED", "PENDING", "REJECTED"])
                .optional()
                .describe("Filter by status"),
        },
    },
    async (input) => {
        const result = await listWhatsappTemplates(input);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    },
);

// Tool 4: delete_whatsapp_template
server.registerTool(
    "delete_whatsapp_template",
    {
        title: "Delete WhatsApp Template",
        description: "Delete ONE WhatsApp template from Meta.",
        inputSchema: {
            waba_id: z.string().describe("WhatsApp Business Account ID"),
            template_name: z.string().describe("Name of the template to delete"),
        },
    },
    async (input) => {
        const result = await deleteWhatsappTemplate(input);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    },
);

// Tool 5: get_template_status
server.registerTool(
    "get_template_status",
    {
        title: "Get Template Status",
        description:
            "Get detailed status of a specific template, including rejection reason and suggested fix.",
        inputSchema: {
            waba_id: z.string().describe("WhatsApp Business Account ID"),
            template_name: z.string().describe("Name of the template"),
        },
    },
    async (input) => {
        const result = await getTemplateStatus(input);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    },
);

// Start server with stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("WhatsApp MCP Server running...");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
