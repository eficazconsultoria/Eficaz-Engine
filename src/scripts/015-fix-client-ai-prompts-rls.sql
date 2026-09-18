-- Fix RLS policies for client_ai_prompts table
-- Allow seo and marketing roles to manage prompts (not just admin)

-- Drop existing policies
DROP POLICY IF EXISTS client_ai_prompts_admin_all ON client_ai_prompts;
DROP POLICY IF EXISTS client_ai_prompts_users_select ON client_ai_prompts;
DROP POLICY IF EXISTS client_ai_prompts_team_manage ON client_ai_prompts;

-- Team members (admin, seo, marketing) can do everything
CREATE POLICY client_ai_prompts_team_manage ON client_ai_prompts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'seo', 'marketing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'seo', 'marketing')
    )
  );

-- All authenticated users can read prompts
CREATE POLICY client_ai_prompts_users_select ON client_ai_prompts
  FOR SELECT
  TO authenticated
  USING (true);

-- Comment on updated policies
COMMENT ON POLICY client_ai_prompts_team_manage ON client_ai_prompts IS 'Admin, SEO, and Marketing roles can manage all prompts';
COMMENT ON POLICY client_ai_prompts_users_select ON client_ai_prompts IS 'All authenticated users can read prompts';
