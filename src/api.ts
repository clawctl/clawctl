// ============================================================
// Clawnch SDK — Low-level API Client
// ============================================================

import type {
    ClawnchApiError,
    ClawnchStats,
    LaunchResult,
    RateLimitStatus,
    SubmitRequest,
    TokenInfo,
    TokenListOptions,
    UploadRequest,
    UploadResult,
    ValidateResult,
    MoltenRegisterParams,
    MoltenRegisterResult,
    MoltenIntent,
    MoltenMatch,
    MoltenMessage,
    MoltenEvent,
} from './types.js';

const DEFAULT_BASE_URL = 'https://clawn.ch';

export class ClawnchApi {
    private baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    }

    // ------------------------------------------------------------------
    // Generic fetch helper
    // ------------------------------------------------------------------

    private async request<T>(
        path: string,
        options: RequestInit = {},
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers ?? {}),
            },
        });

        const body = await res.json() as T | ClawnchApiError;

        if (!res.ok) {
            const err = body as ClawnchApiError;
            const message = err.error ?? `HTTP ${res.status}`;
            const error = new Error(message) as Error & { code?: string; details?: string[]; suggestion?: string };
            error.code = err.code;
            error.details = err.details;
            error.suggestion = err.suggestion;
            throw error;
        }

        return body as T;
    }

    // ------------------------------------------------------------------
    // Tokens & Stats
    // ------------------------------------------------------------------

    async listTokens(options?: TokenListOptions): Promise<TokenInfo[]> {
        const params = new URLSearchParams();
        if (options?.limit) params.set('limit', String(options.limit));
        if (options?.offset) params.set('offset', String(options.offset));
        if (options?.source) params.set('source', options.source);
        if (options?.agent) params.set('agent', options.agent);
        if (options?.address) params.set('address', options.address);
        if (options?.symbol) params.set('symbol', options.symbol);
        const qs = params.toString();
        return this.request<TokenInfo[]>(`/api/launches${qs ? `?${qs}` : ''}`);
    }

    async getStats(): Promise<ClawnchStats> {
        return this.request<ClawnchStats>('/api/stats');
    }

    // ------------------------------------------------------------------
    // Image Upload
    // ------------------------------------------------------------------

    async uploadImage(req: UploadRequest): Promise<UploadResult> {
        return this.request<UploadResult>('/api/upload', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }

    // ------------------------------------------------------------------
    // Token Launch (validation + fallback submit)
    // ------------------------------------------------------------------

    async validateLaunch(content: string): Promise<ValidateResult> {
        return this.request<ValidateResult>('/api/preview', {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    }

    async submitPost(req: SubmitRequest): Promise<LaunchResult> {
        return this.request<LaunchResult>('/api/submit', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }

    // ------------------------------------------------------------------
    // Rate Limit
    // ------------------------------------------------------------------

    async checkRateLimit(agentName?: string): Promise<RateLimitStatus> {
        const qs = agentName ? `?agent=${encodeURIComponent(agentName)}` : '';
        return this.request<RateLimitStatus>(`/api/stats${qs}`);
    }

    // ------------------------------------------------------------------
    // Molten — Agent Matching (proxied through Clawnch MCP, but we
    // model URLs the same way for SDK convenience)
    // ------------------------------------------------------------------

    async moltenRegister(params: MoltenRegisterParams, moltenApiKey?: string): Promise<MoltenRegisterResult> {
        return this.request<MoltenRegisterResult>('/api/molten/register', {
            method: 'POST',
            body: JSON.stringify(params),
            headers: moltenApiKey ? { Authorization: `Bearer ${moltenApiKey}` } : {},
        });
    }

    async moltenCreateIntent(intent: MoltenIntent, apiKey: string): Promise<{ success: boolean; intentId?: string }> {
        return this.request('/api/molten/intents', {
            method: 'POST',
            body: JSON.stringify(intent),
            headers: { Authorization: `Bearer ${apiKey}` },
        });
    }

    async moltenListIntents(apiKey: string): Promise<MoltenIntent[]> {
        return this.request<MoltenIntent[]>('/api/molten/intents', {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
    }

    async moltenGetMatches(apiKey: string): Promise<MoltenMatch[]> {
        return this.request<MoltenMatch[]>('/api/molten/matches', {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
    }

    async moltenAcceptMatch(matchId: string, apiKey: string): Promise<{ success: boolean; contactInfo?: Record<string, string> }> {
        return this.request(`/api/molten/matches/${matchId}/accept`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
        });
    }

    async moltenRejectMatch(matchId: string, apiKey: string): Promise<{ success: boolean }> {
        return this.request(`/api/molten/matches/${matchId}/reject`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
        });
    }

    async moltenSendMessage(msg: MoltenMessage, apiKey: string): Promise<{ success: boolean }> {
        return this.request('/api/molten/messages', {
            method: 'POST',
            body: JSON.stringify(msg),
            headers: { Authorization: `Bearer ${apiKey}` },
        });
    }

    async moltenCheckEvents(apiKey: string): Promise<MoltenEvent[]> {
        return this.request<MoltenEvent[]>('/api/molten/events', {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
    }

    async moltenAckEvents(eventIds: string[], apiKey: string): Promise<{ success: boolean }> {
        return this.request('/api/molten/events/ack', {
            method: 'POST',
            body: JSON.stringify({ eventIds }),
            headers: { Authorization: `Bearer ${apiKey}` },
        });
    }
}
