import { z } from "zod";

// Component button schema
export const ButtonSchema = z.object({
    type: z.enum(["URL", "PHONE_NUMBER", "QUICK_REPLY"]),
    text: z.string().max(25, "Button text max 25 chars"),
    url: z.string().url().optional(),
    phone_number: z.string().optional(),
});

// Component schema
export const ComponentSchema = z.object({
    type: z.enum(["HEADER", "BODY", "FOOTER", "BUTTONS"]),
    format: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]).optional(),
    text: z.string().optional(),
    buttons: z.array(ButtonSchema).optional(),
    example: z
        .object({
            body_text: z.array(z.array(z.string())).optional(),
            header_text: z.array(z.string()).optional(),
            header_handle: z.array(z.string()).optional(),
        })
        .optional(),
});

// Template schema
export const TemplateSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(512, "Name max 512 chars")
        .regex(
            /^[a-z][a-z0-9_]*$/,
            "Name must be lowercase with underscores only (e.g., my_template_name)",
        ),

    category: z.enum(["UTILITY", "MARKETING", "AUTHENTICATION"], {
        errorMap: () => ({
            message: "Category must be UTILITY, MARKETING, or AUTHENTICATION",
        }),
    }),

    language: z.string().default("en"),

    components: z
        .array(ComponentSchema)
        .min(1, "At least one component required"),
});

// Create template input schema
export const CreateTemplateInputSchema = z.object({
    waba_id: z
        .string()
        .min(1, "WABA ID is required")
        .regex(/^\d+$/, "WABA ID must be numeric (e.g., 278469610073775)"),

    template: TemplateSchema,
});

// List templates input schema
export const ListTemplatesInputSchema = z.object({
    waba_id: z
        .string()
        .min(1, "WABA ID is required")
        .regex(/^\d+$/, "WABA ID must be numeric"),

    status: z.enum(["APPROVED", "PENDING", "REJECTED"]).optional(),
});

// Delete template input schema
export const DeleteTemplateInputSchema = z.object({
    waba_id: z
        .string()
        .min(1, "WABA ID is required")
        .regex(/^\d+$/, "WABA ID must be numeric"),

    template_name: z.string().min(1, "Template name is required"),
});

// Get template status input schema
export const GetTemplateStatusInputSchema = z.object({
    waba_id: z
        .string()
        .min(1, "WABA ID is required")
        .regex(/^\d+$/, "WABA ID must be numeric"),

    template_name: z.string().min(1, "Template name is required"),
});

// Type exports
export type Template = z.infer<typeof TemplateSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>;
export type ListTemplatesInput = z.infer<typeof ListTemplatesInputSchema>;
export type DeleteTemplateInput = z.infer<typeof DeleteTemplateInputSchema>;
export type GetTemplateStatusInput = z.infer<
    typeof GetTemplateStatusInputSchema
>;
