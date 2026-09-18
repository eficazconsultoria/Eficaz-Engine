-- Create client_competitors table
CREATE TABLE IF NOT EXISTS client_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  segment TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(client_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_competitors_client_id ON client_competitors(client_id);
CREATE INDEX IF NOT EXISTS idx_client_competitors_active ON client_competitors(is_active);

-- Enable RLS
ALTER TABLE client_competitors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view client competitors"
  ON client_competitors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert client competitors"
  ON client_competitors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update client competitors"
  ON client_competitors
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete client competitors"
  ON client_competitors
  FOR DELETE
  TO authenticated
  USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_client_competitors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_client_competitors_updated_at
  BEFORE UPDATE ON client_competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_client_competitors_updated_at();
