-- Leaderboard storage for the RWAN staking app.
-- Run once in the Supabase SQL editor.

-- Per-wallet aggregates shown on the leaderboard.
create table if not exists leaderboard_stats (
  wallet          text primary key,           -- lowercased address
  active_staked   numeric(78, 0) not null default 0,  -- current locked principal (wei)
  total_staked    numeric(78, 0) not null default 0,  -- lifetime staked (wei)
  rewards_earned  numeric(78, 0) not null default 0,  -- staking + rank + marketplace claims (wei)
  referral_earned numeric(78, 0) not null default 0,  -- affiliate payouts received (wei)
  positions       integer        not null default 0,  -- active position count
  updated_at      timestamptz    not null default now()
);

create index if not exists leaderboard_active_idx  on leaderboard_stats (active_staked desc);
create index if not exists leaderboard_rewards_idx on leaderboard_stats (rewards_earned desc);

-- One row per position so active stake can be reconciled exactly across runs.
create table if not exists leaderboard_positions (
  position_id text primary key,               -- stringified uint
  owner       text not null,
  amount      numeric(78, 0) not null,
  active      boolean not null default true
);
create index if not exists leaderboard_positions_owner_idx on leaderboard_positions (owner);

-- Indexer cursor (last fully-processed block).
create table if not exists indexer_state (
  id         text primary key,                -- e.g. 'leaderboard'
  last_block bigint not null default 0
);
