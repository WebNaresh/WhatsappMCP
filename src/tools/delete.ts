import { DeleteTemplateInputSchema } from "../schemas/template.js";
import { deleteTemplate } from "../lib/meta-api.js";
import type { ZodError } from "zod";

interface DeleteResult {
    success: boolean;
    message?: string;
    error?: string;
    details?: string[];
}

function formatZodErrors(error: ZodError): string[] {
    return error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
}

export async function deleteWhatsappTemplate(
    input: unknown,
): Promise<DeleteResult> {
    // Validate input with Zod
    const parsed = DeleteTemplateInputSchema.safeParse(input);

    if (!parsed.success) {
        return {
            success: false,
            error: "VALIDATION_ERROR",
            details: formatZodErrors(parsed.error),
        };
    }

    const { waba_id, template_name } = parsed.data;

    try {
        await deleteTemplate(waba_id, template_name);

        return {
            success: true,
            message: `Template "${template_name}" deleted successfully`,
        };
    } catch (error) {
        return {
            success: false,
            error: "META_API_ERROR",
            details: [error instanceof Error ? error.message : "Unknown error"],
        };
    }
}
