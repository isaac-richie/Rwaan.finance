const { createPublicClient, http, parseAbiItem, formatUnits } = require('viem');
const { bsc } = require('viem/chains');

async function main() {
    const client = createPublicClient({
        chain: bsc,
        transport: http('https://rpc.ankr.com/bsc')
    });

    const STAKING_ADDRESS = '0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625';

    // Scan only last 10k blocks for now
    const LATEST_BLOCK = await client.getBlockNumber();
    const FROM_BLOCK = LATEST_BLOCK - 10000n;

    // Ankr usually allows bigger chunks than BSC dataseed
    const CHUNK_SIZE = 500n;

    console.log(`Scanning from block ${FROM_BLOCK} to ${LATEST_BLOCK} in chunks of ${CHUNK_SIZE}...`);

    for (let i = FROM_BLOCK; i < LATEST_BLOCK; i += CHUNK_SIZE) {
        const toBlock = (i + CHUNK_SIZE > LATEST_BLOCK) ? LATEST_BLOCK : i + CHUNK_SIZE;
        console.log(`  Fetching ${i} -> ${toBlock}...`);

        try {
            const logs = await client.getLogs({
                address: STAKING_ADDRESS,
                event: parseAbiItem('event ReferralEarned(address indexed referrer, address indexed referee, uint256 amount)'),
                fromBlock: i,
                toBlock: toBlock
            });

            if (logs.length > 0) {
                logs.forEach(log => {
                    const { referrer, referee, amount } = log.args;
                    console.log(`[Referral Found]`);
                    console.log(`- Referrer: ${referrer}`);
                    console.log(`  Referee:  ${referee}`);
                    console.log(`  Amount:   ${formatUnits(amount, 18)} RWAN`);
                    console.log(`  Tx Hash:  ${log.transactionHash}`);
                    console.log('---------------------------------------------------');
                });
            }
        } catch (e) {
            console.error(`Error fetching chunk ${i}: ${e.message}`);
        }

        // Small delay to be nice to RPC
        await new Promise(r => setTimeout(r, 200));
    }
    console.log("Scan complete.");
}

main().catch(console.error);
