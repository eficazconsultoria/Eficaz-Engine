-- Add target_audience column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_audience TEXT;

-- Create table for client AI prompts (what the client's audience would search)
CREATE TABLE IF NOT EXISTS client_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  category TEXT, -- optional categorization like 'awareness', 'consideration', 'decision'
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS client_ai_prompts_client_id_idx ON client_ai_prompts(client_id);
CREATE INDEX IF NOT EXISTS client_ai_prompts_active_idx ON client_ai_prompts(is_active);

-- Enable RLS
ALTER TABLE client_ai_prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS client_ai_prompts_admin_all ON client_ai_prompts;
DROP POLICY IF EXISTS client_ai_prompts_users_select ON client_ai_prompts;

-- Admins can do everything
CREATE POLICY client_ai_prompts_admin_all ON client_ai_prompts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- All authenticated users can read prompts (for now - can be restricted later per client)
CREATE POLICY client_ai_prompts_users_select ON client_ai_prompts
  FOR SELECT
  TO authenticated
  USING (true);

-- Comment on table
COMMENT ON TABLE client_ai_prompts IS 'Stores AI-generated prompts representing what a client''s target audience would search for';
COMMENT ON COLUMN client_ai_prompts.prompt IS 'The simulated search query that the target audience might use';
COMMENT ON COLUMN client_ai_prompts.category IS 'Classification of the prompt (awareness, consideration, decision)';
