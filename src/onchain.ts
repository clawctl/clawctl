// ============================================================
// Clawnch SDK — On-chain Utilities (Fee Claiming & Burn)
// ============================================================

import {
    createPublicClient,
    createWalletClient,
    http,
    formatEther,
    parseUnits,
} from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { FeeInfo, ClaimResult } from './types.js';

// ----- Contract Addresses -----

export const CLAWNCH_TOKEN = '0xa1F72459dfA10BAD200Ac160eCd78C6b77a747be' as const;
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;
export const FEE_LOCKER_ADDRESS = '0xF3622742b1E446D92e45E22923Ef11C2fcD55D68' as const;
export const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD' as const;

// ----- ABIs (minimal) -----

const FEE_LOCKER_ABI = [
    {
        inputs: [
            { name: 'feeOwner', type: 'address' },
            { name: 'token', type: 'address' },
        ],
        name: 'feesToClaim',
        outputs: [{ name: 'balance', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { name: 'feeOwner', type: 'address' },
            { name: 'token', type: 'address' },
        ],
        name: 'claim',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;

const ERC20_TRANSFER_ABI = [
    {
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;

// ----- On-Chain Client -----

export class ClawnchOnchain {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private publicClient: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private walletClient?: any;
    private accountAddress?: `0x${string}`;

    constructor(privateKey?: string, rpcUrl?: string) {
        const transport = http(rpcUrl ?? 'https://mainnet.base.org');

        this.publicClient = createPublicClient({
            chain: base,
            transport,
        });

        if (privateKey) {
            const account = privateKeyToAccount(privateKey as `0x${string}`);
            this.accountAddress = account.address;
            this.walletClient = createWalletClient({
                account,
                chain: base,
                transport,
            });
        }
    }

    /** Get the wallet address (if private key was provided) */
    getAddress(): string | undefined {
        return this.accountAddress;
    }

    // ---- Fee Checking ----

    /** Check pending WETH + token fees for a wallet on a given token */
    async checkFees(walletAddress: string, tokenAddress: string): Promise<FeeInfo> {
        const wallet = walletAddress as `0x${string}`;
        const token = tokenAddress as `0x${string}`;

        const [wethFees, tokenFees] = await Promise.all([
            this.publicClient.readContract({
                address: FEE_LOCKER_ADDRESS,
                abi: FEE_LOCKER_ABI,
                functionName: 'feesToClaim',
                args: [wallet, WETH_ADDRESS],
            }) as Promise<bigint>,
            this.publicClient.readContract({
                address: FEE_LOCKER_ADDRESS,
                abi: FEE_LOCKER_ABI,
                functionName: 'feesToClaim',
                args: [wallet, token],
            }) as Promise<bigint>,
        ]);

        return {
            wethFees,
            tokenFees,
            wethFormatted: formatEther(wethFees),
            tokenFormatted: formatEther(tokenFees),
        };
    }

    // ---- Fee Claiming ----

    /** Claim WETH fees for a token */
    async claimWethFees(_tokenAddress: string): Promise<ClaimResult> {
        this.ensureWallet();
        try {
            const hash = await this.walletClient.writeContract({
                address: FEE_LOCKER_ADDRESS,
                abi: FEE_LOCKER_ABI,
                functionName: 'claim',
                args: [this.accountAddress!, WETH_ADDRESS],
                chain: base,
            });
            await this.publicClient.waitForTransactionReceipt({ hash });
            return { success: true, txHash: hash };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    }

    /** Claim token fees for a token */
    async claimTokenFees(tokenAddress: string): Promise<ClaimResult> {
        this.ensureWallet();
        const token = tokenAddress as `0x${string}`;
        try {
            const hash = await this.walletClient.writeContract({
                address: FEE_LOCKER_ADDRESS,
                abi: FEE_LOCKER_ABI,
                functionName: 'claim',
                args: [this.accountAddress!, token],
                chain: base,
            });
            await this.publicClient.waitForTransactionReceipt({ hash });
            return { success: true, txHash: hash };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    }

    /** Claim both WETH and token fees */
    async claimAllFees(tokenAddress: string): Promise<{ weth: ClaimResult; token: ClaimResult }> {
        const weth = await this.claimWethFees(tokenAddress);
        const token = await this.claimTokenFees(tokenAddress);
        return { weth, token };
    }

    // ---- Burn-to-Earn ----

    /** Burn CLAWNCH tokens for dev supply allocation */
    async burnForAllocation(amount: string): Promise<ClaimResult> {
        this.ensureWallet();
        try {
            const burnAmount = parseUnits(amount, 18);
            const hash = await this.walletClient.writeContract({
                address: CLAWNCH_TOKEN,
                abi: ERC20_TRANSFER_ABI,
                functionName: 'transfer',
                args: [BURN_ADDRESS, burnAmount],
                chain: base,
            });
            await this.publicClient.waitForTransactionReceipt({ hash });
            return { success: true, txHash: hash };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    }

    // ---- Private ----

    private ensureWallet(): void {
        if (!this.walletClient || !this.accountAddress) {
            throw new Error('Private key required for write operations. Set PRIVATE_KEY env var or pass it to ClawnchClient.');
        }
    }
}
