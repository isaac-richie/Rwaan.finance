-- Run in Supabase SQL Editor to enable referral revocation
CREATE TABLE IF NOT EXISTS blocked_referrers (
  wallet TEXT PRIMARY KEY,
  reason TEXT DEFAULT '',
  blocked_at TIMESTAMPTZ DEFAULT NOW()
);
