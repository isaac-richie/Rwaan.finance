// Script to generate ABI TypeScript file
const fs = require('fs');
const path = require('path');

const contractPath = path.join(__dirname, '../out/RWANSecureStakingV3.sol/RWANSecureStakingV3.json');
const outputPath = path.join(__dirname, '../lib/contracts/rwanStakingAbi.ts');

const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const abi = contractJson.abi;

const output = `// Generated from RWANSecureStakingV3.sol
// Contract: 0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625
// Network: BSC Mainnet
// Generated: ${new Date().toISOString()}

export const RWAN_STAKING_ADDRESS = '0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625' as const;

export const RWAN_STAKING_ABI = ${JSON.stringify(abi, null, 2)} as const;
`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log('✅ ABI file generated successfully!');
console.log('📄 Output:', outputPath);
