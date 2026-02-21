// ============================================================
// Clawnch CLI — Terminal-based interaction with Clawnch
// ============================================================

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ClawnchClient } from './client.js';
import { ClawnchOnchain } from './onchain.js';
import type { TokenListOptions } from './types.js';

const program = new Command();

// ----- Helpers -----

function getClient(): ClawnchClient {
    return new ClawnchClient({
        privateKey: process.env.PRIVATE_KEY,
        moltenApiKey: process.env.MOLTEN_API_KEY,
    });
}

function printJson(data: unknown): void {
    console.log(JSON.stringify(data, null, 2));
}

function printTable(rows: Record<string, unknown>[]): void {
    if (rows.length === 0) {
        console.log(chalk.yellow('No results found.'));
        return;
    }
    console.table(rows);
}

// ----- Program -----

program
    .name('clawctl')
    .description(chalk.cyan('🦞 clawctl — Interact with the Clawnch ecosystem from your terminal'))
    .version('1.0.0');

// ================================================================
// tokens — List launched tokens
// ================================================================

program
    .command('tokens')
    .description('List tokens launched via Clawnch')
    .option('-l, --limit <n>', 'Number of tokens to return', '10')
    .option('-s, --source <platform>', 'Filter by platform (moltbook, moltx, 4claw)')
    .option('-a, --agent <name>', 'Filter by agent name')
    .option('--address <addr>', 'Filter by token address')
    .option('--symbol <sym>', 'Filter by symbol')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
        const spinner = ora('Fetching tokens...').start();
        try {
            const client = getClient();
            const options: TokenListOptions = {
                limit: parseInt(opts.limit, 10),
            };
            if (opts.source) options.source = opts.source;
            if (opts.agent) options.agent = opts.agent;
            if (opts.address) options.address = opts.address;
            if (opts.symbol) options.symbol = opts.symbol;

            const response = await client.listTokens(options) as any;
            spinner.stop();

            if (opts.json) {
                printJson(response);
            } else {
                const tokens = response?.launches ?? (Array.isArray(response) ? response : []);
                if (tokens.length === 0) {
                    console.log(chalk.yellow('No tokens found.'));
                    return;
                }
                const total = response?.pagination?.total ?? tokens.length;
                console.log(chalk.bold.cyan(`\n🦞 Launched Tokens (showing ${tokens.length} of ${total})\n`));
                for (const t of tokens) {
                    console.log(chalk.bold(`  ${chalk.green(t.symbol ?? '???')} — ${t.name ?? 'Unknown'}`));
                    if (t.contractAddress) console.log(chalk.gray(`    Address:  ${t.contractAddress}`));
                    if (t.source) console.log(chalk.gray(`    Platform: ${t.source}`));
                    if (t.agentName) console.log(chalk.gray(`    Agent:    ${t.agentName}`));
                    if (t.launchedAt) console.log(chalk.gray(`    Launched: ${new Date(t.launchedAt).toLocaleString()}`));
                    console.log();
                }
            }
        } catch (err) {
            spinner.fail('Failed to fetch tokens');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

// ================================================================
// stats — Get $CLAWNCH stats
// ================================================================

program
    .command('stats')
    .description('Get $CLAWNCH price, market stats, and platform metrics')
    .option('--json', 'Output raw JSON')
    .action(async (opts) => {
        const spinner = ora('Fetching stats...').start();
        try {
            const client = getClient();
            const stats = await client.getStats() as any;
            spinner.stop();

            if (opts.json) {
                printJson(stats);
            } else {
                console.log(chalk.bold.cyan('\n🦞 Clawnch Stats\n'));
                if (stats.totalMarketCap) console.log(`  ${chalk.bold('Total Market Cap:')}  ${chalk.green('$' + Number(stats.totalMarketCap).toLocaleString())}`);
                if (stats.volume24h) console.log(`  ${chalk.bold('Volume (24h):')}      ${chalk.green('$' + Number(stats.volume24h).toLocaleString())}`);
                if (stats.tokenCount) console.log(`  ${chalk.bold('Total Tokens:')}      ${chalk.white(Number(stats.tokenCount).toLocaleString())}`);
                if (stats.tokenCount24h) console.log(`  ${chalk.bold('Launched (24h):')}    ${chalk.white(String(stats.tokenCount24h))}`);
                if (stats.agentFees24h) console.log(`  ${chalk.bold('Agent Fees (24h):')}  ${chalk.green('$' + Number(stats.agentFees24h).toLocaleString())}`);
                if (stats.burnedClawnchFormatted) console.log(`  ${chalk.bold('CLAWNCH Burned:')}    ${chalk.yellow(stats.burnedClawnchFormatted)}`);

                if (stats.topTokens?.length) {
                    console.log(chalk.bold.cyan('\n  Top Tokens:'));
                    for (const t of stats.topTokens.slice(0, 5)) {
                        const price = Number(t.priceUsd).toFixed(10);
                        const change = t.priceChange24h ? `${(t.priceChange24h * 100).toFixed(1)}%` : 'N/A';
                        const changeColor = t.priceChange24h >= 0 ? chalk.green : chalk.red;
                        console.log(`    ${chalk.bold(t.symbol)} — $${price} (${changeColor(change)}) mcap: $${Number(t.marketCap).toLocaleString()}`);
                    }
                }
                console.log();
            }
        } catch (err) {
            spinner.fail('Failed to fetch stats');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

// ================================================================
// upload — Upload an image
// ================================================================

program
    .command('upload <imageUrlOrBase64>')
    .description('Upload an image (URL or base64) and get a direct hosting link')
    .option('-n, --name <name>', 'Optional image name')
    .action(async (image, opts) => {
        const spinner = ora('Uploading image...').start();
        try {
            const client = getClient();
            const result = await client.uploadImage(image, opts.name);
            spinner.stop();

            if (result.success) {
                console.log(chalk.green('\n✅ Image uploaded successfully!\n'));
                console.log(`  ${chalk.bold('URL:')} ${result.url}`);
                if (result.hint) console.log(chalk.gray(`  ${result.hint}`));
                console.log();
            } else {
                console.log(chalk.red(`\n❌ Upload failed: ${result.error}`));
            }
        } catch (err) {
            spinner.fail('Upload failed');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

// ================================================================
// launch — Token launch helpers
// ================================================================

const launchCmd = program
    .command('launch')
    .description('Token launch helpers');

launchCmd
    .command('validate <content>')
    .description('Validate launch content before posting')
    .action(async (content) => {
        const spinner = ora('Validating...').start();
        try {
            const client = getClient();
            const result = await client.validateLaunch(content);
            spinner.stop();
            if (result.valid) {
                console.log(chalk.green('\n✅ Launch content is valid!\n'));
                if (result.parsed) printJson(result.parsed);
            } else {
                console.log(chalk.red('\n❌ Validation errors:\n'));
                result.errors?.forEach((e) => console.log(chalk.red(`  • ${e}`)));
            }
            console.log();
        } catch (err) {
            spinner.fail('Validation failed');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

launchCmd
    .command('submit <platform> <postId>')
    .description('Submit a post for processing (fallback if scanner missed it)')
    .action(async (platform, postId) => {
        const spinner = ora('Submitting post...').start();
        try {
            const client = getClient();
            const result = await client.submitPost(platform, postId);
            spinner.stop();

            if (result.success) {
                console.log(chalk.green(`\n✅ ${result.message}\n`));
                if (result.token) {
                    console.log(`  ${chalk.bold('Symbol:')}  ${result.token.symbol}`);
                    console.log(`  ${chalk.bold('Address:')} ${result.token.address}`);
                }
                if (result.urls) {
                    console.log(`  ${chalk.bold('Clanker:')}     ${result.urls.clanker}`);
                    console.log(`  ${chalk.bold('BaseScan:')}    ${result.urls.basescan}`);
                    console.log(`  ${chalk.bold('DexScreener:')} ${result.urls.dexscreener}`);
                }
                console.log();
            } else {
                console.log(chalk.red(`\n❌ ${result.error}`));
                if (result.suggestion) console.log(chalk.yellow(`  💡 ${result.suggestion}`));
            }
        } catch (err) {
            spinner.fail('Submission failed');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

launchCmd
    .command('build')
    .description('Interactively build a !clawnch launch post')
    .requiredOption('--name <name>', 'Token name')
    .requiredOption('--symbol <symbol>', 'Token symbol')
    .requiredOption('--wallet <wallet>', 'Your Base wallet address')
    .requiredOption('--description <desc>', 'Token description')
    .option('--image <url>', 'Image URL')
    .option('--website <url>', 'Website URL')
    .option('--twitter <handle>', 'Twitter handle')
    .option('--burn-tx <hash>', 'Burn transaction hash for dev allocation')
    .action(async (opts) => {
        const client = getClient();
        const post = client.buildLaunchPost({
            name: opts.name,
            symbol: opts.symbol,
            wallet: opts.wallet,
            description: opts.description,
            image: opts.image,
            website: opts.website,
            twitter: opts.twitter,
            burnTxHash: opts.burnTx,
        });
        console.log(chalk.bold.cyan('\n📝 Your launch post:\n'));
        console.log(chalk.white(post));
        console.log(chalk.gray('\n  Copy and post this to Moltbook (m/clawnch), Moltx, or 4claw!\n'));
    });

// ================================================================
// fees — Fee checking & claiming
// ================================================================

const feesCmd = program
    .command('fees')
    .description('Check and claim trading fees');

feesCmd
    .command('check <tokenAddress>')
    .description('Check pending WETH + token fees')
    .requiredOption('-w, --wallet <addr>', 'Wallet address that deployed the token')
    .action(async (tokenAddress, opts) => {
        const spinner = ora('Checking fees on Base...').start();
        try {
            const client = getClient();
            const fees = await client.checkFees(opts.wallet, tokenAddress);
            spinner.stop();

            console.log(chalk.bold.cyan('\n🦞 Pending Fees\n'));
            console.log(`  ${chalk.bold('WETH fees:')}  ${chalk.green(fees.wethFormatted)} WETH`);
            console.log(`  ${chalk.bold('Token fees:')} ${chalk.green(fees.tokenFormatted)} tokens`);
            if (fees.wethFees === 0n && fees.tokenFees === 0n) {
                console.log(chalk.gray('\n  No fees to claim yet. Keep promoting your token!'));
            }
            console.log();
        } catch (err) {
            spinner.fail('Fee check failed');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

feesCmd
    .command('claim <tokenAddress>')
    .description('Claim all pending fees (requires PRIVATE_KEY env var)')
    .action(async (tokenAddress) => {
        if (!process.env.PRIVATE_KEY) {
            console.error(chalk.red('❌ PRIVATE_KEY environment variable is required for claiming fees.'));
            process.exit(1);
        }
        const spinner = ora('Claiming fees on Base...').start();
        try {
            const client = getClient();
            const result = await client.claimFees(tokenAddress);
            spinner.stop();

            console.log(chalk.bold.cyan('\n🦞 Fee Claim Results\n'));
            if (result.weth.success) {
                console.log(chalk.green(`  ✅ WETH claimed — tx: ${result.weth.txHash}`));
            } else {
                console.log(chalk.yellow(`  ⚠️  WETH: ${result.weth.error}`));
            }
            if (result.token.success) {
                console.log(chalk.green(`  ✅ Token claimed — tx: ${result.token.txHash}`));
            } else {
                console.log(chalk.yellow(`  ⚠️  Token: ${result.token.error}`));
            }
            console.log();
        } catch (err) {
            spinner.fail('Claim failed');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

// ================================================================
// burn — Burn CLAWNCH for dev allocation
// ================================================================

program
    .command('burn <amount>')
    .description('Burn CLAWNCH tokens for dev supply allocation (requires PRIVATE_KEY)')
    .action(async (amount) => {
        if (!process.env.PRIVATE_KEY) {
            console.error(chalk.red('❌ PRIVATE_KEY environment variable is required.'));
            process.exit(1);
        }
        console.log(chalk.yellow(`\n⚠️  You are about to burn ${amount} CLAWNCH tokens. This is irreversible!\n`));

        const spinner = ora(`Burning ${amount} CLAWNCH...`).start();
        try {
            const client = getClient();
            const result = await client.burnForAllocation(amount);
            spinner.stop();

            if (result.success) {
                console.log(chalk.green(`\n✅ Burned ${amount} CLAWNCH!`));
                console.log(`  ${chalk.bold('TX Hash:')} ${result.txHash}`);
                console.log(chalk.gray('  Use this hash as burnTxHash in your launch post within 24 hours.\n'));
            } else {
                console.log(chalk.red(`\n❌ Burn failed: ${result.error}`));
            }
        } catch (err) {
            spinner.fail('Burn failed');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

// ================================================================
// molten — Agent matching
// ================================================================

const moltenCmd = program
    .command('molten')
    .description('Agent-to-agent matching via Molten network');

moltenCmd
    .command('register')
    .description('Register your agent on Molten')
    .requiredOption('--name <name>', 'Agent name')
    .requiredOption('--description <desc>', 'Agent description')
    .option('--telegram <handle>', 'Telegram handle')
    .option('--email <email>', 'Email address')
    .action(async (opts) => {
        const spinner = ora('Registering agent...').start();
        try {
            const client = getClient();
            const result = await client.moltenRegister({
                name: opts.name,
                description: opts.description,
                telegram: opts.telegram,
                email: opts.email,
            });
            spinner.stop();

            if (result.success) {
                console.log(chalk.green('\n✅ Agent registered on Molten!\n'));
                if (result.apiKey) {
                    console.log(chalk.bold.red('  ⚠️  SAVE YOUR API KEY (shown only once):'));
                    console.log(chalk.bold(`  ${result.apiKey}\n`));
                    console.log(chalk.gray('  Set it as MOLTEN_API_KEY env var for future commands.\n'));
                }
            } else {
                console.log(chalk.red(`\n❌ Registration failed: ${result.error}`));
            }
        } catch (err) {
            spinner.fail('Registration failed');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

moltenCmd
    .command('intent')
    .description('Create a new offer or request intent')
    .requiredOption('--type <type>', 'Intent type: offer or request')
    .requiredOption('--category <cat>', 'Category: token-marketing, liquidity, dev-services, community, collaboration')
    .requiredOption('--title <title>', 'Intent title')
    .requiredOption('--description <desc>', 'Intent description')
    .action(async (opts) => {
        if (!process.env.MOLTEN_API_KEY) {
            console.error(chalk.red('❌ MOLTEN_API_KEY environment variable is required.'));
            process.exit(1);
        }
        const spinner = ora('Creating intent...').start();
        try {
            const client = getClient();
            const result = await client.moltenCreateIntent({
                type: opts.type,
                category: opts.category,
                title: opts.title,
                description: opts.description,
            });
            spinner.stop();
            if (result.success) {
                console.log(chalk.green(`\n✅ Intent created! ID: ${result.intentId}\n`));
            }
        } catch (err) {
            spinner.fail('Intent creation failed');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

moltenCmd
    .command('matches')
    .description('Get potential agent matches')
    .action(async () => {
        if (!process.env.MOLTEN_API_KEY) {
            console.error(chalk.red('❌ MOLTEN_API_KEY environment variable is required.'));
            process.exit(1);
        }
        const spinner = ora('Fetching matches...').start();
        try {
            const client = getClient();
            const matches = await client.moltenGetMatches();
            spinner.stop();

            if (!Array.isArray(matches) || matches.length === 0) {
                console.log(chalk.yellow('\nNo matches found yet. Create intents to find matches!\n'));
                return;
            }

            console.log(chalk.bold.cyan(`\n🤝 Matches (${matches.length})\n`));
            for (const m of matches) {
                console.log(chalk.bold(`  ${m.agent?.name ?? 'Unknown Agent'} — Score: ${chalk.green(String(m.score))}`));
                console.log(chalk.gray(`    Match ID: ${m.matchId}`));
                console.log(chalk.gray(`    ${m.agent?.description ?? ''}`));
                console.log();
            }
        } catch (err) {
            spinner.fail('Failed to fetch matches');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

moltenCmd
    .command('accept <matchId>')
    .description('Accept a match and exchange contact info')
    .action(async (matchId) => {
        if (!process.env.MOLTEN_API_KEY) {
            console.error(chalk.red('❌ MOLTEN_API_KEY environment variable is required.'));
            process.exit(1);
        }
        const spinner = ora('Accepting match...').start();
        try {
            const client = getClient();
            const result = await client.moltenAcceptMatch(matchId);
            spinner.stop();
            if (result.success) {
                console.log(chalk.green('\n✅ Match accepted!\n'));
                if (result.contactInfo) {
                    console.log(chalk.bold('  Contact info:'));
                    for (const [k, v] of Object.entries(result.contactInfo)) {
                        console.log(`    ${k}: ${v}`);
                    }
                    console.log();
                }
            }
        } catch (err) {
            spinner.fail('Failed to accept match');
            console.error(chalk.red((err as Error).message));
            process.exit(1);
        }
    });

// ================================================================
// Parse and run
// ================================================================

program.parse();
