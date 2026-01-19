import { CreateTemplateInputSchema } from "../schemas/template.js";
import { createTemplate } from "../lib/meta-api.js";
import type { ZodError } from "zod";

interface CreateResult {
    success: boolean;
    template_id?: string;
    status?: string;
    message?: string;
    error?: string;
    details?: string[];
}

function formatZodErrors(error: ZodError): string[] {
    return error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
}

export async function createWhatsappTemplate(
    input: unknown,
): Promise<CreateResult> {
    // Validate input with Zod
    const parsed = CreateTemplateInputSchema.safeParse(input);

    if (!parsed.success) {
        return {
            success: false,
            error: "VALIDATION_ERROR",
            details: formatZodErrors(parsed.error),
        };
    }

    const { waba_id, template } = parsed.data;

    try {
        const result = await createTemplate(waba_id, template);

        return {
            success: true,
            template_id: result.id,
            status: result.status,
            message: `Template "${template.name}" created successfully`,
        };
    } catch (error) {
        return {
            success: false,
            error: "META_API_ERROR",
            message: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
