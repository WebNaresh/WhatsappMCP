/**
 * get_template_format tool
 * Returns the required format for WhatsApp templates so AI knows how to structure them.
 */

export const TEMPLATE_FORMAT = {
    format: {
        name: {
            type: "string",
            rules: [
                "Must be lowercase letters and underscores only",
                "Must start with a letter",
                "Maximum 512 characters",
                "Example: booking_confirmation, otp_verification",
            ],
        },
        category: {
            type: "enum",
            values: ["UTILITY", "MARKETING", "AUTHENTICATION"],
            descriptions: {
                UTILITY:
                    "Transactional messages like order updates, booking confirmations",
                MARKETING: "Promotional messages, offers, announcements",
                AUTHENTICATION: "OTP and verification codes (max 1 variable allowed)",
            },
        },
        language: {
            type: "string",
            default: "en",
            description: "ISO language code",
        },
        components: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    type: {
                        enum: ["HEADER", "BODY", "FOOTER", "BUTTONS"],
                        description: "BODY is required, others are optional",
                    },
                    text: {
                        type: "string",
                        description:
                            "The message text. Use {{1}}, {{2}}, etc. for variables.",
                    },
                    format: {
                        enum: ["TEXT", "IMAGE", "VIDEO", "DOCUMENT"],
                        description: "Only for HEADER component",
                    },
                    buttons: {
                        type: "array",
                        description: "Only for BUTTONS component",
                        items: {
                            type: ["URL", "PHONE_NUMBER", "QUICK_REPLY"],
                        },
                    },
                    example: {
                        description:
                            "Required for approval. Provide example values for variables.",
                        body_text: 'Array of arrays: [["value1", "value2"]]',
                    },
                },
            },
        },
    },

    rules: [
        "Template name must be lowercase with underscores only (e.g., order_confirmation)",
        "Variables must use {{1}}, {{2}}, {{3}} format (numbered, not named)",
        "Maximum 10 variables per template",
        "AUTHENTICATION category allows maximum 1 variable (for OTP)",
        "Example values are required for Meta approval",
        "URLs in body text require a URL button component",
        "Button text maximum 25 characters",
    ],

    examples: [
        {
            description: "Simple notification template",
            template: {
                name: "order_confirmation",
                category: "UTILITY",
                language: "en",
                components: [
                    {
                        type: "BODY",
                        text: "Hi {{1}}! Your order {{2}} has been confirmed. Total: {{3}}",
                        example: {
                            body_text: [["John", "ORD-12345", "$99.00"]],
                        },
                    },
                ],
            },
        },
        {
            description: "OTP verification template",
            template: {
                name: "otp_verification",
                category: "AUTHENTICATION",
                language: "en",
                components: [
                    {
                        type: "BODY",
                        text: "Your verification code is {{1}}. Do not share this code.",
                        example: {
                            body_text: [["123456"]],
                        },
                    },
                ],
            },
        },
        {
            description: "Template with URL button",
            template: {
                name: "booking_reminder",
                category: "UTILITY",
                language: "en",
                components: [
                    {
                        type: "BODY",
                        text: "Hi {{1}}! Your booking for {{2}} is tomorrow at {{3}}.",
                        example: {
                            body_text: [["John", "Yoga Class", "10:00 AM"]],
                        },
                    },
                    {
                        type: "BUTTONS",
                        buttons: [
                            {
                                type: "URL",
                                text: "View Details",
                                url: "https://example.com/booking/{{1}}",
                            },
                        ],
                    },
                ],
            },
        },
    ],
};

export function getTemplateFormat(): typeof TEMPLATE_FORMAT {
    return TEMPLATE_FORMAT;
}
