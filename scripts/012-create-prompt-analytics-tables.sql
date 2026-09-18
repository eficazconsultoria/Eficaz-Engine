-- Migration: Create prompt analytics tables
-- Description: Tables for storing AI prompt test results and analytics data

-- Table to store individual prompt test results
CREATE TABLE IF NOT EXISTS prompt_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES client_ai_prompts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- AI Response data
  ai_response TEXT NOT NULL,
  ai_model VARCHAR(100) DEFAULT 'gpt-4',
  
  -- Visibility metrics
  visibility_score DECIMAL(5,2) DEFAULT 0, -- % client appears in response (0-100)
  reputation_score DECIMAL(5,2) DEFAULT 0, -- % AI trust/recommendation (0-100)
  position_rank INTEGER DEFAULT NULL, -- Position in recommendations (1, 2, 3, etc.)
  
  -- Shopping/Product metrics
  shopping_presence BOOLEAN DEFAULT FALSE,
  shopping_score DECIMAL(5,2) DEFAULT 0, -- % of shopping/product mentions
  
  -- Search analysis
  search_type VARCHAR(50) DEFAULT 'web', -- 'web', 'local', 'mixed'
  search_terms_used TEXT[], -- Terms GPT used for searching
  
  -- References and sources
  sources_cited TEXT[], -- URLs/sources AI referenced
  
  -- Local business data
  local_competitors TEXT[], -- Local businesses mentioned instead
  
  -- Competitor data (JSON for flexibility)
  competitors_found JSONB DEFAULT '[]'::jsonb, -- [{name, url, position, mentions}]
  
  -- Raw analysis data
  analysis_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for aggregated analytics per prompt
CREATE TABLE IF NOT EXISTS prompt_analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES client_ai_prompts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Aggregated metrics (averages over all tests)
  avg_visibility_score DECIMAL(5,2) DEFAULT 0,
  avg_reputation_score DECIMAL(5,2) DEFAULT 0,
  avg_position_rank DECIMAL(5,2) DEFAULT NULL,
  avg_shopping_score DECIMAL(5,2) DEFAULT 0,
  
  -- Counts
  total_tests INTEGER DEFAULT 0,
  tests_with_visibility INTEGER DEFAULT 0, -- Times client was found
  tests_with_shopping INTEGER DEFAULT 0,
  
  -- Best/Worst performance
  best_position INTEGER DEFAULT NULL,
  worst_position INTEGER DEFAULT NULL,
  
  -- Search type effectiveness
  web_search_score DECIMAL(5,2) DEFAULT 0,
  local_search_score DECIMAL(5,2) DEFAULT 0,
  
  -- Top competitors (aggregated)
  top_competitors JSONB DEFAULT '[]'::jsonb,
  
  -- Last test info
  last_tested_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(prompt_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_prompt_id ON prompt_test_results(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_client_id ON prompt_test_results(client_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_tested_at ON prompt_test_results(tested_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_analytics_summary_prompt_id ON prompt_analytics_summary(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_analytics_summary_client_id ON prompt_analytics_summary(client_id);

-- Enable RLS
ALTER TABLE prompt_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_analytics_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prompt_test_results
DROP POLICY IF EXISTS "Authenticated users can view prompt test results" ON prompt_test_results;
CREATE POLICY "Authenticated users can view prompt test results"
  ON prompt_test_results FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert prompt test results" ON prompt_test_results;
CREATE POLICY "Authenticated users can insert prompt test results"
  ON prompt_test_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update prompt test results" ON prompt_test_results;
CREATE POLICY "Authenticated users can update prompt test results"
  ON prompt_test_results FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for prompt_analytics_summary
DROP POLICY IF EXISTS "Authenticated users can view prompt analytics" ON prompt_analytics_summary;
CREATE POLICY "Authenticated users can view prompt analytics"
  ON prompt_analytics_summary FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert prompt analytics" ON prompt_analytics_summary;
CREATE POLICY "Authenticated users can insert prompt analytics"
  ON prompt_analytics_summary FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update prompt analytics" ON prompt_analytics_summary;
CREATE POLICY "Authenticated users can update prompt analytics"
  ON prompt_analytics_summary FOR UPDATE
  TO authenticated
  USING (true);
