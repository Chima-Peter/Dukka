export interface SendMailJobPayload {
    to: string;
    subject: string;
    template?: string;
    html?: string;
    context?: Record<string, unknown>;
}
