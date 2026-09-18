-- Seed script para criar usuário admin
-- IMPORTANTE: Este script cria o usuário no Supabase Auth e na tabela profiles
-- A senha será: EficazAdmin@2024!

-- Primeiro, vamos criar uma função para inserir o admin
-- Nota: O usuário precisa ser criado via Supabase Auth UI ou API
-- Este script apenas garante que o profile existe com role admin

-- Inserir o profile do admin (o auth.users será criado pelo sign-up)
-- Use este script APÓS criar o usuário via interface do Supabase ou sign-up

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Verificar se já existe um usuário com este email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'luiz.simba@eficazmarketing.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Atualizar o profile para admin se já existir
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
      admin_user_id,
      'luiz.simba@eficazmarketing.com',
      'Luiz Simba',
      'admin',
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      is_active = true,
      updated_at = now();
      
    RAISE NOTICE 'Admin profile atualizado com sucesso!';
  ELSE
    RAISE NOTICE 'Usuário não encontrado. Crie primeiro via sign-up e rode este script novamente.';
  END IF;
END $$;
