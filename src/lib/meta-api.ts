import axios, { AxiosError } from "axios";
import type { Template } from "../schemas/template.js";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface MetaApiError {
    error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id: string;
    };
}

interface CreateTemplateResponse {
    id: string;
    status: string;
    category: string;
}

interface TemplateInfo {
    name: string;
    status: string;
    category: string;
    language: string;
    id: string;
    rejected_reason?: string;
}

interface ListTemplatesResponse {
    data: TemplateInfo[];
    paging?: {
        cursors: { before: string; after: string };
        next?: string;
    };
}

function getAccessToken(): string {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
        throw new Error("WHATSAPP_ACCESS_TOKEN not found in environment variables");
    }
    return token;
}

function handleMetaError(error: unknown): never {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<MetaApiError>;
        const metaError = axiosError.response?.data?.error;

        if (metaError) {
            const errorCode = metaError.code;
            let suggestion = "";

            switch (errorCode) {
                case 100:
                    suggestion =
                        "Template may already exist. Try a different name or delete the existing one first.";
                    break;
                case 190:
                    suggestion =
                        "Access token is invalid or expired. Generate a new one from Meta Developers.";
                    break;
                case 368:
                    suggestion = "Rate limited. Wait 60 seconds and try again.";
                    break;
                case 131000:
                    suggestion =
                        "Invalid template format. Check body text, variables, and component structure.";
                    break;
                default:
                    suggestion =
                        "Check Meta API documentation for error code " + errorCode;
            }

            throw new Error(
                `Meta API Error (${errorCode}): ${metaError.message}. Suggestion: ${suggestion}`,
            );
        }

        throw new Error(`HTTP Error: ${axiosError.message}`);
    }

    throw error;
}

export async function createTemplate(
    wabaId: string,
    template: Template,
): Promise<CreateTemplateResponse> {
    const token = getAccessToken();

    try {
        const response = await axios.post<CreateTemplateResponse>(
            `${GRAPH_API_BASE}/${wabaId}/message_templates`,
            {
                name: template.name,
                category: template.category,
                language: template.language,
                components: template.components,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );

        return response.data;
    } catch (error) {
        handleMetaError(error);
    }
}

export async function listTemplates(
    wabaId: string,
    status?: string,
): Promise<TemplateInfo[]> {
    const token = getAccessToken();

    try {
        const params: Record<string, string> = {
            fields: "name,status,category,language,id,rejected_reason",
        };

        if (status) {
            params.status = status;
        }

        const response = await axios.get<ListTemplatesResponse>(
            `${GRAPH_API_BASE}/${wabaId}/message_templates`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params,
            },
        );

        return response.data.data;
    } catch (error) {
        handleMetaError(error);
    }
}

export async function deleteTemplate(
    wabaId: string,
    templateName: string,
): Promise<boolean> {
    const token = getAccessToken();

    try {
        await axios.delete(`${GRAPH_API_BASE}/${wabaId}/message_templates`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params: {
                name: templateName,
            },
        });

        return true;
    } catch (error) {
        handleMetaError(error);
    }
}

export async function getTemplateByName(
    wabaId: string,
    templateName: string,
): Promise<TemplateInfo | null> {
    const templates = await listTemplates(wabaId);
    return templates.find((t) => t.name === templateName) || null;
}
