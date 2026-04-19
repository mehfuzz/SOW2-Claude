-- Airtel SCM SOW Submissions Table
-- Run this in your Supabase SQL editor to set up the database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sow_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Identification
  sow_title TEXT NOT NULL,
  sow_number TEXT NOT NULL UNIQUE,

  -- Buyer
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_department TEXT NOT NULL,

  -- Vendor
  vendor_name TEXT NOT NULL,
  vendor_contact_name TEXT,
  vendor_contact_email TEXT,

  -- Scope
  scope_of_work TEXT NOT NULL,
  deliverables TEXT NOT NULL,
  out_of_scope TEXT,

  -- Timeline
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  milestones TEXT,

  -- Commercial
  contract_value NUMERIC(18, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_terms TEXT NOT NULL,
  payment_milestones TEXT,

  -- Performance
  kpis TEXT NOT NULL,
  penalty_clauses TEXT,
  special_requirements TEXT,

  -- AI Validation
  ai_validation_score INTEGER,
  ai_validation_summary TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending_review',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sow_submissions_updated_at
  BEFORE UPDATE ON sow_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Allow inserts from the service role (API routes use service key)
ALTER TABLE sow_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything"
  ON sow_submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
