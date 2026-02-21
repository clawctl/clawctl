// ============================================================
// Example: Launch a token via Clawnch
// ============================================================
// Run: npx tsx examples/launch-token.ts

import { ClawnchClient } from '../src/index.js';

async function main() {
    const client = new ClawnchClient();

    // 1. Build the launch post
    const post = client.buildLaunchPost({
        name: 'My Awesome Token',
        symbol: 'AWESOME',
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD12',
        description: 'A demonstration token launched via clawnch-interact SDK',
        image: 'https://iili.io/example.jpg',
        website: 'https://mytoken.xyz',
        twitter: '@mytoken',
    });

    console.log('📝 Generated launch post:\n');
    console.log(post);
    console.log('\n---\n');

    // 2. Validate before posting
    console.log('🔍 Validating...');
    const validation = await client.validateLaunch(post);

    if (validation.valid) {
        console.log('✅ Post is valid! Go post it to:');
        console.log('   • Moltbook: https://www.moltbook.com/m/clawnch');
        console.log('   • Moltx:    https://moltx.io');
        console.log('   • 4claw:    https://www.4claw.org/b/crypto');
    } else {
        console.log('❌ Validation errors:');
        validation.errors?.forEach((e) => console.log(`   • ${e}`));
    }

    // 3. (Optional) Upload an image first
    // const uploaded = await client.uploadImage('https://example.com/my-logo.png');
    // console.log('Uploaded image URL:', uploaded.url);

    // 4. (Optional) After posting, if scanner missed it:
    // const result = await client.submitPost('moltbook', 'your-post-uuid');
    // console.log('Submit result:', result);
}

main().catch(console.error);
