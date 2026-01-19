import { GetTemplateStatusInputSchema } from "../schemas/template.js";
import { getTemplateByName } from "../lib/meta-api.js";
import type { ZodError } from "zod";

interface StatusResult {
    success: boolean;
    template?: {
        name: string;
        status: string;
        category: string;
        language: string;
        id: string;
        rejection_reason?: string;
        suggested_fix?: string;
    };
    error?: string;
    details?: string[];
}

function formatZodErrors(error: ZodError): string[] {
    return error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
}

function getSuggestedFix(rejectionReason?: string): string | undefined {
    if (!rejectionReason) return undefined;

    const reason = rejectionReason.toLowerCase();

    if (reason.includes("url") && reason.includes("button")) {
        return "Add a URL button component when including URLs in the message body.";
    }
    if (reason.includes("promotional") || reason.includes("marketing")) {
        return "Change category to MARKETING or remove promotional language.";
    }
    if (reason.includes("variable") || reason.includes("parameter")) {
        return "Check variable format. Use {{1}}, {{2}}, etc. Ensure example values are provided.";
    }
    if (reason.includes("authentication") && reason.includes("variable")) {
        return "AUTHENTICATION category allows only 1 variable for the OTP code.";
    }

    return "Review Meta template guidelines and adjust content accordingly.";
}

export async function getTemplateStatus(input: unknown): Promise<StatusResult> {
    // Validate input with Zod
    const parsed = GetTemplateStatusInputSchema.safeParse(input);

    if (!parsed.success) {
        return {
            success: false,
            error: "VALIDATION_ERROR",
            details: formatZodErrors(parsed.error),
        };
    }

    const { waba_id, template_name } = parsed.data;

    try {
        const template = await getTemplateByName(waba_id, template_name);

        if (!template) {
            return {
                success: false,
                error: "NOT_FOUND",
                details: [`Template "${template_name}" not found on WABA ${waba_id}`],
            };
        }

        return {
            success: true,
            template: {
                name: template.name,
                status: template.status,
                category: template.category,
                language: template.language,
                id: template.id,
                rejection_reason: template.rejected_reason,
                suggested_fix: getSuggestedFix(template.rejected_reason),
            },
        };
    } catch (error) {
        return {
            success: false,
            error: "META_API_ERROR",
            details: [error instanceof Error ? error.message : "Unknown error"],
        };
    }
}
