-- Create client content history table for SEO texts and Posts
-- This stores all generated content with history for each client

CREATE TABLE IF NOT EXISTS client_content_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Content type: 'seo' or 'post'
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('seo', 'post')),
  
  -- Title/name for the content
  title VARCHAR(500) NOT NULL,
  
  -- The generated content (HTML for SEO, text for posts)
  content TEXT NOT NULL,
  
  -- Input parameters stored as JSON
  input_params JSONB NOT NULL DEFAULT '{}',
  
  -- Platform (for posts: instagram, linkedin, twitter, facebook, blog)
  platform VARCHAR(50),
  
  -- Keywords (for SEO)
  main_keyword VARCHAR(200),
  secondary_keywords TEXT[],
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  -- AI model used
  ai_model VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_content_history_client_id ON client_content_history(client_id);
CREATE INDEX IF NOT EXISTS idx_client_content_history_user_id ON client_content_history(user_id);
CREATE INDEX IF NOT EXISTS idx_client_content_history_content_type ON client_content_history(content_type);
CREATE INDEX IF NOT EXISTS idx_client_content_history_created_at ON client_content_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_content_history_platform ON client_content_history(platform);

-- Enable RLS
ALTER TABLE client_content_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view client content history"
  ON client_content_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert client content history"
  ON client_content_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update client content history"
  ON client_content_history
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete client content history"
  ON client_content_history
  FOR DELETE
  TO authenticated
  USING (true);
