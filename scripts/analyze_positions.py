import subprocess
import json
import time

RPC_URL = "https://bnb-mainnet.g.alchemy.com/v2/E62apoDGjVpXXaDYX0QKM"
CONTRACT = "0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625"
NEXT_POS_ID = 107  # From previous check

# Lock option names mapping
LOCK_NAMES = {
    0: "Flexible (0d)",
    1: "90 Days",
    2: "180 Days",
    3: "180 Days (Disabled)",
    4: "30 Days",
    5: "30 Days (Dup)"
}

def get_position(pos_id):
    try:
        # struct Position { amount; weightedAmount; startTime; unlockTime; lockId; rewardDebt; withdrawn; }
        cmd = [
            "cast", "call", CONTRACT, 
            "positions(uint256)(uint256,uint256,uint256,uint256,uint256,uint256,bool)", 
            str(pos_id),
            "--rpc-url", RPC_URL
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        # Output lines: amount, weightedAmount, startTime, unlockTime, lockId, rewardDebt, withdrawn
        lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
        if len(lines) >= 7:
            return {
                "id": pos_id,
                "amount": int(lines[0].split()[0]),
                "lockId": int(lines[4].split()[0]),
                "withdrawn": lines[6].split()[0] == "true"
            }
        return None
    except Exception as e:
        print(f"Error fetching position {pos_id}: {e}")
        return None

print("Fetching position data...")
stats = {k: {"count": 0, "amount": 0} for k in LOCK_NAMES.keys()}

for i in range(1, NEXT_POS_ID):
    pos = get_position(i)
    if pos and not pos["withdrawn"]:
        lid = pos["lockId"]
        if lid in stats:
            stats[lid]["count"] += 1
            stats[lid]["amount"] += pos["amount"]
        else:
            print(f"Warning: Unknown lockId {lid} for position {i}")
            
    if i % 10 == 0:
        print(f"Processed {i}/{NEXT_POS_ID-1}...")

print("\n=== Active Staking Distribution ===")
print(f"{'Plan':<20} {'Count':<10} {'Total Staked (RWAN)':<20}")
print("-" * 50)

total_staked = 0
for lid, data in stats.items():
    name = LOCK_NAMES.get(lid, f"Unknown ({lid})")
    amount_rwan = data["amount"] / 1e18
    print(f"{name:<20} {data['count']:<10} {amount_rwan:,.2f}")
    total_staked += amount_rwan

print("-" * 50)
print(f"{'Total':<20} {'':<10} {total_staked:,.2f}")
