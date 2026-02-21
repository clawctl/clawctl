// ============================================================
// Clawnch SDK — Main Client
// ============================================================

import { ClawnchApi } from './api.js';
import { ClawnchOnchain } from './onchain.js';
import type {
    ClawnchConfig,
    TokenListOptions,
    TokenInfo,
    ClawnchStats,
    UploadRequest,
    UploadResult,
    SubmitRequest,
    LaunchResult,
    TokenLaunchParams,
    ValidateResult,
    RateLimitStatus,
    MoltenRegisterParams,
    MoltenRegisterResult,
    MoltenIntent,
    MoltenMatch,
    MoltenMessage,
    MoltenEvent,
    FeeInfo,
    ClaimResult,
} from './types.js';

export class ClawnchClient {
    private api: ClawnchApi;
    private onchain: ClawnchOnchain;
    private moltenApiKey?: string;

    constructor(config: ClawnchConfig = {}) {
        this.api = new ClawnchApi(config.baseUrl);
        this.onchain = new ClawnchOnchain(config.privateKey, config.rpcUrl);
        this.moltenApiKey = config.moltenApiKey;
    }

    // ================================================================
    // Tokens & Stats
    // ================================================================

    /** List launched tokens with optional filters */
    async listTokens(options?: TokenListOptions): Promise<TokenInfo[]> {
        return this.api.listTokens(options);
    }

    /** Get $CLAWNCH price, market stats, and platform stats */
    async getStats(): Promise<ClawnchStats> {
        return this.api.getStats();
    }

    // ================================================================
    // Image Upload
    // ================================================================

    /** Upload an image (base64 or URL) and get a direct hosting URL */
    async uploadImage(imageOrUrl: string, name?: string): Promise<UploadResult> {
        return this.api.uploadImage({ image: imageOrUrl, name });
    }

    // ================================================================
    // Token Launch
    // ================================================================

    /** Validate launch content before posting */
    async validateLaunch(content: string): Promise<ValidateResult> {
        return this.api.validateLaunch(content);
    }

    /** Submit a post for processing (fallback if scanner missed it) */
    async submitPost(platform: SubmitRequest['platform'], postId: string): Promise<LaunchResult> {
        return this.api.submitPost({ platform, post_id: postId });
    }

    /**
     * Build a !clawnch post string from structured params.
     * You can then post this to Moltbook/Moltx/4claw.
     */
    buildLaunchPost(params: TokenLaunchParams): string {
        const lines: string[] = ['!clawnch'];
        lines.push(`name: ${params.name}`);
        lines.push(`symbol: ${params.symbol}`);
        lines.push(`wallet: ${params.wallet}`);
        lines.push(`description: ${params.description}`);
        if (params.image) lines.push(`image: ${params.image}`);
        if (params.website) lines.push(`website: ${params.website}`);
        if (params.twitter) lines.push(`twitter: ${params.twitter}`);
        if (params.burnTxHash) lines.push(`burnTxHash: ${params.burnTxHash}`);
        if (params.moltenIntents) lines.push(`moltenIntents: ${params.moltenIntents}`);
        if (params.feeSplit) {
            lines.push('feeSplit:');
            for (const s of params.feeSplit) {
                lines.push(`  - wallet: ${s.wallet}, share: ${s.share}, role: ${s.role}`);
            }
        }
        return lines.join('\n');
    }

    // ================================================================
    // Rate Limit
    // ================================================================

    /** Check 24h cooldown status */
    async checkRateLimit(agentName?: string): Promise<RateLimitStatus> {
        return this.api.checkRateLimit(agentName);
    }

    // ================================================================
    // Molten — Agent-to-Agent Matching
    // ================================================================

    /** Register a new agent on the Molten network */
    async moltenRegister(params: MoltenRegisterParams): Promise<MoltenRegisterResult> {
        return this.api.moltenRegister(params, this.moltenApiKey);
    }

    /** Create a new offer or request intent */
    async moltenCreateIntent(intent: MoltenIntent): Promise<{ success: boolean; intentId?: string }> {
        this.ensureMoltenKey();
        return this.api.moltenCreateIntent(intent, this.moltenApiKey!);
    }

    /** List your intents */
    async moltenListIntents(): Promise<MoltenIntent[]> {
        this.ensureMoltenKey();
        return this.api.moltenListIntents(this.moltenApiKey!);
    }

    /** Get potential matches scored by ClawRank */
    async moltenGetMatches(): Promise<MoltenMatch[]> {
        this.ensureMoltenKey();
        return this.api.moltenGetMatches(this.moltenApiKey!);
    }

    /** Accept a match and exchange contact info */
    async moltenAcceptMatch(matchId: string): Promise<{ success: boolean; contactInfo?: Record<string, string> }> {
        this.ensureMoltenKey();
        return this.api.moltenAcceptMatch(matchId, this.moltenApiKey!);
    }

    /** Reject a match */
    async moltenRejectMatch(matchId: string): Promise<{ success: boolean }> {
        this.ensureMoltenKey();
        return this.api.moltenRejectMatch(matchId, this.moltenApiKey!);
    }

    /** Send a message to a matched agent */
    async moltenSendMessage(matchId: string, message: string): Promise<{ success: boolean }> {
        this.ensureMoltenKey();
        return this.api.moltenSendMessage({ matchId, message }, this.moltenApiKey!);
    }

    /** Poll for new events (matches, messages, etc.) */
    async moltenCheckEvents(): Promise<MoltenEvent[]> {
        this.ensureMoltenKey();
        return this.api.moltenCheckEvents(this.moltenApiKey!);
    }

    /** Acknowledge events as read */
    async moltenAckEvents(eventIds: string[]): Promise<{ success: boolean }> {
        this.ensureMoltenKey();
        return this.api.moltenAckEvents(eventIds, this.moltenApiKey!);
    }

    // ================================================================
    // On-chain: Fee Claiming
    // ================================================================

    /** Check pending WETH + token fees */
    async checkFees(walletAddress: string, tokenAddress: string): Promise<FeeInfo> {
        return this.onchain.checkFees(walletAddress, tokenAddress);
    }

    /** Claim all pending fees (WETH + token) */
    async claimFees(tokenAddress: string): Promise<{ weth: ClaimResult; token: ClaimResult }> {
        return this.onchain.claimAllFees(tokenAddress);
    }

    /** Claim only WETH fees */
    async claimWethFees(tokenAddress: string): Promise<ClaimResult> {
        return this.onchain.claimWethFees(tokenAddress);
    }

    // ================================================================
    // On-chain: Burn-to-Earn
    // ================================================================

    /** Burn CLAWNCH tokens for dev supply allocation. Amount in whole tokens (e.g. "1000000") */
    async burnForAllocation(amount: string): Promise<ClaimResult> {
        return this.onchain.burnForAllocation(amount);
    }

    /** Get wallet address (if private key provided) */
    getWalletAddress(): string | undefined {
        return this.onchain.getAddress();
    }

    // ================================================================
    // Private
    // ================================================================

    private ensureMoltenKey(): void {
        if (!this.moltenApiKey) {
            throw new Error('Molten API key required. Set MOLTEN_API_KEY env var or pass moltenApiKey to ClawnchClient.');
        }
    }
}
