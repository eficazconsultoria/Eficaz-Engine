-- Create generation_logs table for tracking AI generations
CREATE TABLE IF NOT EXISTS public.generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  input_json JSONB NOT NULL DEFAULT '{}',
  output_json JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "generation_logs_select_own" ON public.generation_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own logs
CREATE POLICY "generation_logs_insert_own" ON public.generation_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own logs
CREATE POLICY "generation_logs_update_own" ON public.generation_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin can view all logs
CREATE POLICY "generation_logs_admin_select" ON public.generation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_generation_logs_user_id ON public.generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_feature_key ON public.generation_logs(feature_key);
CREATE INDEX IF NOT EXISTS idx_generation_logs_created_at ON public.generation_logs(created_at DESC);
