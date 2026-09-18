-- Script alternativo: Criar usuário admin diretamente no auth.users
-- ATENÇÃO: Este método requer que você tenha a extensão pgcrypto habilitada
-- e pode não funcionar em todos os ambientes Supabase

-- Primeiro, habilite a extensão se necessário
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criar o usuário admin
-- Senha: EficazAdmin@2024!
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'luiz.simba@eficazmarketing.com',
  crypt('EficazAdmin@2024!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Luiz Simba"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
)
ON CONFLICT (email) DO NOTHING;

-- Criar o profile correspondente
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT 
  id,
  'luiz.simba@eficazmarketing.com',
  'Luiz Simba',
  'admin',
  true
FROM auth.users 
WHERE email = 'luiz.simba@eficazmarketing.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = now();
