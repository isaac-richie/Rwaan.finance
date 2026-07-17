import subprocess
import json

RPC_URL = "https://bnb-mainnet.g.alchemy.com/v2/E62apoDGjVpXXaDYX0QKM"
CONTRACT = "0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625"

def get_lock_option(lock_id):
    cmd = [
        "cast", "call", CONTRACT, "lockOptions(uint256)", str(lock_id),
        "--rpc-url", RPC_URL
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        # Output is hex.
        # struct LockOption { uint64 duration; uint32 multiplierBps; bool enabled; }
        # raw output: 0x...
        # cast returns ABI encoded data.
        # We can use cast to decode too, but let's just parse the hex manually since it's simple struct
        # actually, cast has --json or we can use `cast --abi-decode` but we need the sig
        # Simpler: use cast to decode directly
        cmd_decode = [
            "cast", "call", CONTRACT, "lockOptions(uint256)(uint64,uint32,bool)", str(lock_id),
            "--rpc-url", RPC_URL
        ]
        result = subprocess.run(cmd_decode, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return f"Error: {e}"

print(f"{'ID':<4} {'Duration (Sec)':<15} {'Duration (Days)':<15} {'Multiplier':<12} {'Enabled':<8}")
print("-" * 60)

for i in range(6):
    output = get_lock_option(i)
    # Output format from cast is usually:
    # 31536000
    # 50000
    # true
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    if len(lines) >= 3:
        duration = int(lines[0].split()[0])
        multiplier = int(lines[1].split()[0])
        enabled = lines[2].split()[0]
        print(f"{i:<4} {duration:<15} {duration/86400:<15.2f} {multiplier/10000:<12.2f} {enabled:<8}")
    else:
        print(f"{i:<4} {output}")
