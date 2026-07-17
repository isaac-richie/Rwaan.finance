const { createPublicClient, http, parseAbiItem, formatUnits, decodeFunctionData, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

// ABI for the stake function to decode input data
const STAKE_ABI = parseAbi([
    'function stake(uint256 amount, uint256 lockId, address referrer) external'
]);

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http('https://bsc-dataseed.binance.org/')
    });

    const STAKING_ADDRESS = '0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625';

    // Scan only last 50k blocks for now (approx 1.5 days)
    // Adjust range if you need to go further back.
    const LATEST_BLOCK = await client.getBlockNumber();
    const FROM_BLOCK = LATEST_BLOCK - 50000n;
    const CHUNK_SIZE = 2000n;

    console.log(`Auditing MISSED REFERRALS from block ${FROM_BLOCK} to ${LATEST_BLOCK}...`);
    console.log("Looking for 'stake' transactions that had a referrer but NO payout event.");

    for (let i = FROM_BLOCK; i < LATEST_BLOCK; i += CHUNK_SIZE) {
        const toBlock = (i + CHUNK_SIZE > LATEST_BLOCK) ? LATEST_BLOCK : i + CHUNK_SIZE;
        console.log(`  Scanning ${i} -> ${toBlock}...`);

        try {
            // 1. Get all Staked events
            const stakeLogs = await client.getLogs({
                address: STAKING_ADDRESS,
                event: parseAbiItem('event Staked(address indexed user, uint256 positionId, uint256 amount, uint256 lockId, uint256 unlockTime)'),
                fromBlock: i,
                toBlock: toBlock
            });

            if (stakeLogs.length > 0) {
                for (const log of stakeLogs) {
                    // Check this transaction for ReferralEarned event
                    const referralLogs = await client.getLogs({
                        address: STAKING_ADDRESS,
                        event: parseAbiItem('event ReferralEarned(address indexed referrer, address indexed referee, uint256 amount)'),
                        fromBlock: log.blockNumber,
                        toBlock: log.blockNumber, // Optimization: only check this block
                        transactionHash: log.transactionHash
                    });

                    // If referral paid, skip
                    if (referralLogs.length > 0) {
                        // console.log(`    [OK] Tx ${log.transactionHash} paid referral.`);
                        continue;
                    }

                    // 2. Fetch Transaction Input Data to see if referrer was provided
                    const tx = await client.getTransaction({ hash: log.transactionHash });

                    try {
                        const { args } = decodeFunctionData({
                            abi: STAKE_ABI,
                            data: tx.input
                        });

                        const referrer = args[2]; // 3rd arg is referrer

                        // Check if valid referrer (non-zero, not self)
                        if (
                            referrer &&
                            referrer !== '0x0000000000000000000000000000000000000000' &&
                            referrer.toLowerCase() !== log.args.user.toLowerCase()
                        ) {
                            const amount = log.args.amount;
                            const missedRefReward = (amount * 500n) / 10000n; // 5%

                            console.log(`\n🔴 MISSED REFERRAL DETECTED!`);
                            console.log(`   Tx: ${log.transactionHash}`);
                            console.log(`   User: ${log.args.user}`);
                            console.log(`   Referrer input: ${referrer}`);
                            console.log(`   Staked Amount: ${formatUnits(amount, 18)} RWAN`);
                            console.log(`   Missed Reward: ${formatUnits(missedRefReward, 18)} RWAN (5%)`);
                            console.log('---------------------------------------------------');
                        } else {
                            // console.log(`    [Info] Tx ${log.transactionHash} had no valid referrer.`);
                        }
                    } catch (decodeErr) {
                        // console.log(`    [Info] Could not decode stake input for ${log.transactionHash} (maybe different function?)`);
                    }
                }
            }
        } catch (e) {
            console.error(`Error scanning chunk ${i}: ${e.message}`);
        }

        await new Promise(r => setTimeout(r, 200));
    }
    console.log("Audit complete.");
}

main().catch(console.error);
