// ============================================================
// Example: Check and claim trading fees
// ============================================================
// Run: PRIVATE_KEY=0x... npx tsx examples/claim-fees.ts

import { ClawnchClient } from '../src/index.js';

const TOKEN_ADDRESS = '0xYourTokenAddress';   // Replace with your token
const WALLET_ADDRESS = '0xYourWalletAddress';  // Replace with your wallet

async function main() {
    // --- Read-only: check fees (no private key needed) ---
    const client = new ClawnchClient();

    console.log('🔍 Checking fees...\n');
    const fees = await client.checkFees(WALLET_ADDRESS, TOKEN_ADDRESS);

    console.log(`  WETH fees:  ${fees.wethFormatted} WETH`);
    console.log(`  Token fees: ${fees.tokenFormatted} tokens`);

    if (fees.wethFees === 0n && fees.tokenFees === 0n) {
        console.log('\n  No fees to claim yet. Keep promoting your token!');
        return;
    }

    // --- Write: claim fees (private key required) ---
    if (!process.env.PRIVATE_KEY) {
        console.log('\n  To claim, run with: PRIVATE_KEY=0x... npx tsx examples/claim-fees.ts');
        return;
    }

    const claimClient = new ClawnchClient({
        privateKey: process.env.PRIVATE_KEY,
    });

    console.log('\n💰 Claiming fees...');
    const result = await claimClient.claimFees(TOKEN_ADDRESS);

    if (result.weth.success) {
        console.log(`  ✅ WETH claimed — tx: https://basescan.org/tx/${result.weth.txHash}`);
    }
    if (result.token.success) {
        console.log(`  ✅ Token fees claimed — tx: https://basescan.org/tx/${result.token.txHash}`);
    }
}

main().catch(console.error);
