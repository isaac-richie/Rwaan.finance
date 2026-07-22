-- Referral codes: a human-friendly alias for a referrer wallet.
-- One code per wallet, one wallet per code — both enforced by UNIQUE + PK.
--
-- The code is claimed by the wallet owner via a signed message (verified in
-- /api/referral/code), so a code can only ever point to a wallet the claimer
-- proved they control. The referrer address it resolves to is what travels
-- on-chain in stake(), so the 2% affiliate keeps flowing exactly as before.

create table if not exists referral_codes (
  code       text primary key,
  wallet     text not null unique,
  created_at timestamptz not null default now()
);

-- Fast lookup by wallet (GET a wallet's existing code).
create index if not exists referral_codes_wallet_idx on referral_codes (wallet);
