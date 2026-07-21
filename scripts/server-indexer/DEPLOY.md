# RWAAN Indexer Daemon — VPS deploy

Runs the leaderboard/network indexer **directly on the VPS** against the pro
Alchemy RPC. Replaces the old `indexer-loop.sh` that curled the Vercel endpoint
(Vercel's edge regions kept reading a stale chain head from load-balanced public
BSC nodes, so the cursor repeatedly stalled).

## One-time setup on the server

SSH in, then:

```bash
# 1. Stop and disable the old curl-based loop
systemctl stop indexer 2>/dev/null
systemctl disable indexer 2>/dev/null
rm -f /root/indexer-loop.sh

# 2. Install Node 20 if not present
node -v || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)

# 3. Create the app dir and copy in the two files
mkdir -p /root/rwaan-indexer
#   -> copy indexer-daemon.mjs and package.json into /root/rwaan-indexer/
#      (scp from your machine, or paste them)

cd /root/rwaan-indexer
npm install --omit=dev
```

### Copying the files from your machine

From the repo root on your laptop:

```bash
scp scripts/server-indexer/indexer-daemon.mjs scripts/server-indexer/package.json \
  root@169.58.50.185:/root/rwaan-indexer/
```

## Environment file

Create `/etc/indexer.env` on the server (chmod 600 — it holds the service key):

```bash
cat > /etc/indexer.env << 'EOF'
BSC_ALCHEMY_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/YOUR_PRO_KEY
BSC_ALCHEMY_RPC_URL2=
RWAN_V5_STAKING_ADDRESS=0x85DFdDbf41e8220A89B014f4E89a908bCDEd182b
RWAN_V5_DEPLOY_BLOCK=YOUR_DEPLOY_BLOCK
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
INDEX_INTERVAL_MS=30000
EOF
chmod 600 /etc/indexer.env
```

Fill in the real values (copy them from Vercel's env vars or your local `.env`).

## Install the systemd service

```bash
#   -> copy indexer.service to /etc/systemd/system/indexer.service
cp /root/rwaan-indexer/indexer.service /etc/systemd/system/indexer.service   # if you scp'd it too
systemctl daemon-reload
systemctl enable indexer
systemctl start indexer
systemctl status indexer
```

## Verify

```bash
journalctl -u indexer -f
```

You should see a line every ~30s ending in `CAUGHT UP`. Ctrl+C to stop watching
(the service keeps running).

## Notes

- The daemon reads the chain head as the **max** across the Alchemy key(s) plus
  five public BSC nodes, so a single stale/load-balanced node cannot stall it.
- `eth_getLogs` only ever goes through Alchemy (public BSC nodes reject it).
- The cursor advances only to the range actually processed, only after every
  write succeeds. A failed tick logs and retries; nothing is lost or skipped.
- Vercel's `/api/cron/index-leaderboard` and the GitHub Actions workflow can
  stay as-is for redundancy, or be removed — this daemon is now the source of
  truth. If you keep them, they're harmless: the cursor is shared and idempotent.
```
