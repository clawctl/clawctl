// ============================================================
// Clawnch SDK — Type Definitions
// ============================================================

// --- Token Launch ---

export interface TokenLaunchParams {
    name: string;
    symbol: string;
    wallet: string;
    description: string;
    image?: string;
    website?: string;
    twitter?: string;
    burnTxHash?: string;
    feeSplit?: FeeSplitEntry[];
    moltenIntents?: string;
    moltenMatchId?: string;
}

export interface FeeSplitEntry {
    wallet: string;
    share: string;
    role: string;
}

export interface ValidateResult {
    valid: boolean;
    errors?: string[];
    parsed?: TokenLaunchParams;
}

export interface LaunchResult {
    success: boolean;
    token?: {
        symbol: string;
        name: string;
        address: string;
        txHash: string;
    };
    urls?: {
        clanker: string;
        basescan: string;
        dexscreener: string;
    };
    agent?: string;
    platform?: string;
    postId?: string;
    message?: string;
    error?: string;
    code?: string;
    details?: string[];
    suggestion?: string;
}

// --- Tokens & Stats ---

export interface TokenInfo {
    symbol: string;
    name: string;
    address: string;
    txHash?: string;
    deployer?: string;
    platform?: string;
    createdAt?: string;
    description?: string;
    image?: string;
    website?: string;
    twitter?: string;
}

export interface TokenListOptions {
    limit?: number;
    offset?: number;
    source?: 'moltbook' | 'moltx' | '4claw';
    agent?: string;
    address?: string;
    symbol?: string;
}

export interface ClawnchStats {
    price?: number;
    marketCap?: number;
    totalLaunches?: number;
    [key: string]: unknown;
}

// --- Image Upload ---

export interface UploadRequest {
    image: string; // base64 data OR URL
    name?: string;
}

export interface UploadResult {
    success: boolean;
    url?: string;
    hint?: string;
    error?: string;
}

// --- Submit (Fallback) ---

export interface SubmitRequest {
    platform: 'moltbook' | '4claw' | 'moltx';
    post_id: string;
}

// --- Molten (Agent Matching) ---

export interface MoltenRegisterParams {
    name: string;
    description: string;
    telegram?: string;
    email?: string;
    webhook?: string;
}

export interface MoltenRegisterResult {
    success: boolean;
    apiKey?: string;
    agentId?: string;
    error?: string;
}

export interface MoltenIntent {
    type: 'offer' | 'request';
    category: 'token-marketing' | 'liquidity' | 'dev-services' | 'community' | 'collaboration';
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
}

export interface MoltenMatch {
    matchId: string;
    score: number;
    agent: {
        name: string;
        description: string;
    };
    intent: MoltenIntent;
    contactInfo?: {
        telegram?: string;
        email?: string;
    };
}

export interface MoltenMessage {
    matchId: string;
    message: string;
}

export interface MoltenEvent {
    id: string;
    type: string;
    data: unknown;
    createdAt: string;
}

// --- Fee Claiming ---

export interface FeeInfo {
    wethFees: bigint;
    tokenFees: bigint;
    wethFormatted: string;
    tokenFormatted: string;
}

export interface ClaimResult {
    success: boolean;
    txHash?: string;
    error?: string;
}

// --- Rate Limit ---

export interface RateLimitStatus {
    limited: boolean;
    remainingMs?: number;
    nextAvailable?: string;
    [key: string]: unknown;
}

// --- API Config ---

export interface ClawnchConfig {
    baseUrl?: string;
    moltenApiKey?: string;
    privateKey?: string;
    rpcUrl?: string;
}

// --- API Error ---

export interface ClawnchApiError {
    success: false;
    error: string;
    code: string;
    details?: string[];
    suggestion?: string;
}

export type ClawnchErrorCode =
    | 'MISSING_PLATFORM'
    | 'MISSING_POST_ID'
    | 'INVALID_PLATFORM'
    | 'POST_NOT_FOUND'
    | 'MISSING_TRIGGER'
    | 'INVALID_TOKEN_DETAILS'
    | 'INVALID_IMAGE_URL'
    | 'TICKER_TAKEN'
    | 'ALREADY_PROCESSED'
    | 'RATE_LIMITED'
    | 'BURN_HASH_ALREADY_USED'
    | 'BURN_VERIFICATION_FAILED'
    | 'DEPLOYMENT_FAILED';
