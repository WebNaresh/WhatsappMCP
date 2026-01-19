import { ListTemplatesInputSchema } from "../schemas/template.js";
import { listTemplates } from "../lib/meta-api.js";
import type { ZodError } from "zod";

interface TemplateInfo {
    name: string;
    status: string;
    category: string;
    language: string;
    id: string;
}

interface ListResult {
    success: boolean;
    templates?: TemplateInfo[];
    total?: number;
    error?: string;
    details?: string[];
}

function formatZodErrors(error: ZodError): string[] {
    return error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
}

export async function listWhatsappTemplates(
    input: unknown,
): Promise<ListResult> {
    // Validate input with Zod
    const parsed = ListTemplatesInputSchema.safeParse(input);

    if (!parsed.success) {
        return {
            success: false,
            error: "VALIDATION_ERROR",
            details: formatZodErrors(parsed.error),
        };
    }

    const { waba_id, status } = parsed.data;

    try {
        const templates = await listTemplates(waba_id, status);

        return {
            success: true,
            templates: templates.map((t) => ({
                name: t.name,
                status: t.status,
                category: t.category,
                language: t.language,
                id: t.id,
            })),
            total: templates.length,
        };
    } catch (error) {
        return {
            success: false,
            error: "META_API_ERROR",
            details: [error instanceof Error ? error.message : "Unknown error"],
        };
    }
}
