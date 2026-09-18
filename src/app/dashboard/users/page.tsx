import { requireAdmin } from "@/lib/auth"
import { getAllUsers, getAuditLogs } from "@/lib/services/users"
import { createClient } from "@/lib/supabase/server"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { UserManagement } from "./user-management"
import type { Client } from "@/lib/types"

export default async function UsersPage() {
  const profile = await requireAdmin()
  const users = await getAllUsers()
  const auditLogs = await getAuditLogs(20)
  
  // Fetch clients for the client user selection
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, slug")
    .eq("active", true)
    .order("name")
  
  return (
    <FeatureLayout profile={profile} title="Gerenciamento de Usuários">
      <UserManagement 
        users={users} 
        auditLogs={auditLogs} 
        currentUserId={profile.id} 
        clients={(clients as Client[]) || []}
      />
    </FeatureLayout>
  )
}
