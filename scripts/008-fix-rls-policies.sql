-- Corrigir RLS policies que estavam permissivas demais

-- =====================================================
-- FIX: agent_prompts INSERT - era public sem validacao
-- =====================================================
DROP POLICY IF EXISTS agent_prompts_admin_insert ON agent_prompts;
CREATE POLICY "agent_prompts_admin_insert" ON agent_prompts
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =====================================================
-- FIX: audit_logs INSERT - era public sem validacao  
-- =====================================================
DROP POLICY IF EXISTS audit_logs_admin_insert ON audit_logs;
CREATE POLICY "audit_logs_admin_insert" ON audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =====================================================
-- FIX: generation_logs INSERT - era public sem validacao do user_id
-- =====================================================
DROP POLICY IF EXISTS generation_logs_insert_own ON generation_logs;
CREATE POLICY "generation_logs_insert_own" ON generation_logs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FIX: whatsapp_campaigns INSERT - era public sem validacao do user_id
-- =====================================================
DROP POLICY IF EXISTS campaigns_insert_own ON whatsapp_campaigns;
CREATE POLICY "campaigns_insert_own" ON whatsapp_campaigns
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FIX: whatsapp_messages INSERT - era public sem validacao
-- =====================================================
DROP POLICY IF EXISTS messages_insert_own ON whatsapp_messages;
CREATE POLICY "messages_insert_own" ON whatsapp_messages
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM whatsapp_campaigns c 
    WHERE c.id = campaign_id AND c.user_id = auth.uid()
  )
);

-- =====================================================
-- Adicionar policy para admin ver todos os profiles (necessario para gerenciar usuarios)
-- =====================================================
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles" ON profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =====================================================
-- Adicionar policy para admin atualizar profiles
-- =====================================================
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
CREATE POLICY "Admin can update all profiles" ON profiles
FOR UPDATE TO authenticated
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Remover a policy antiga que pode conflitar
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
