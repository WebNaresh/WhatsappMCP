import { z } from "zod";
import { getMe, getAssignedWabas } from "../lib/meta-api.js";
import type { ZodError } from "zod";

const ListWabasInputSchema = z.object({
    limit: z.number().optional().default(25),
});

interface ListWabasResult {
    success: boolean;
    wabas?: {
        id: string;
        name: string;
        currency: string;
        timezone: string;
        namespace: string;
    }[];
    count?: number;
    user?: {
        id: string;
        name: string;
    };
    error?: string;
    details?: string[];
}

function formatZodErrors(error: ZodError): string[] {
    return error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
}

export async function listConnectedWabas(
    input: unknown,
): Promise<ListWabasResult> {
    // Validate input with Zod
    const parsed = ListWabasInputSchema.safeParse(input);

    if (!parsed.success) {
        return {
            success: false,
            error: "VALIDATION_ERROR",
            details: formatZodErrors(parsed.error),
        };
    }

    try {
        // 1. Get System User Info
        const me = await getMe();

        // 2. Get Assigned WABAs
        const wabas = await getAssignedWabas(me.id);

        return {
            success: true,
            user: {
                id: me.id,
                name: me.name,
            },
            wabas: wabas.map((w) => ({
                id: w.id,
                name: w.name,
                currency: w.currency,
                timezone: w.timezone_id,
                namespace: w.message_template_namespace,
            })),
            count: wabas.length,
        };
    } catch (error) {
        return {
            success: false,
            error: "META_API_ERROR",
            details: [error instanceof Error ? error.message : "Unknown error"],
        };
    }
}
