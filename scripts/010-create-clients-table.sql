-- Create enum types for client fields
DO $$ BEGIN
  CREATE TYPE client_segment AS ENUM (
    'imobiliario',
    'moda',
    'automotivo',
    'saude',
    'educacao',
    'tecnologia',
    'alimentacao',
    'servicos',
    'varejo',
    'industria',
    'financeiro',
    'turismo',
    'beleza',
    'esportes',
    'pets',
    'outro'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE client_type AS ENUM (
    'ecommerce',
    'lead_generation'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE client_focus AS ENUM (
    'autoridade',
    'venda',
    'coleta_leads',
    'branding',
    'engajamento',
    'trafego'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  site TEXT,
  segment client_segment NOT NULL DEFAULT 'outro',
  type client_type NOT NULL DEFAULT 'ecommerce',
  focus client_focus NOT NULL DEFAULT 'venda',
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS clients_slug_idx ON clients(slug);
CREATE INDEX IF NOT EXISTS clients_active_idx ON clients(active);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS clients_admin_select ON clients;
DROP POLICY IF EXISTS clients_admin_insert ON clients;
DROP POLICY IF EXISTS clients_admin_update ON clients;
DROP POLICY IF EXISTS clients_admin_delete ON clients;

-- Only admins can manage clients
CREATE POLICY clients_admin_select ON clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY clients_admin_insert ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY clients_admin_update ON clients
  FOR UPDATE
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

CREATE POLICY clients_admin_delete ON clients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();
