import { requireAdmin } from "@/lib/auth"
import { getAllUsers, getAuditLogs } from "@/lib/services/users"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { UserManagement } from "./user-management"

export default async function UsersPage() {
  const profile = await requireAdmin()
  const users = await getAllUsers()
  const auditLogs = await getAuditLogs(20)

  return (
    <FeatureLayout profile={profile} title="Gerenciamento de Usuários">
      <UserManagement users={users} auditLogs={auditLogs} currentUserId={profile.id} />
    </FeatureLayout>
  )
}
