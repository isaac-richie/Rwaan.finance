-- Network / downline storage for RWAN staking.
-- Run once in the Supabase SQL editor (after leaderboard-schema.sql).

-- One row per referral relationship, indexed from Staked events.
create table if not exists referral_links (
  referee     text not null,                     -- the wallet that staked
  referrer    text not null,                     -- the wallet that referred them
  amount      numeric(78, 0) not null default 0, -- initial stake amount (wei)
  joined_at   timestamptz not null default now(),
  primary key (referee)                          -- each wallet has exactly one referrer
);

create index if not exists referral_links_referrer_idx on referral_links (referrer);

-- Materialised per-wallet network summary (refreshed by indexer).
create table if not exists network_stats (
  wallet          text primary key,
  direct_members  integer        not null default 0,  -- L1 count
  total_members   integer        not null default 0,  -- all levels
  team_volume     numeric(78, 0) not null default 0,  -- total staked by downline (wei)
  updated_at      timestamptz    not null default now()
);
