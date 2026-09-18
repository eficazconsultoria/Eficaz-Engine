import { createClient } from "@/lib/supabase/server"
import { requireFeatureAccess } from "@/lib/auth"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { ClientManagement } from "./client-management"

export default async function ClientsPage() {
  const profile = await requireFeatureAccess("client_management")

  const supabase = await createClient()

  // Fetch all clients
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching clients:", error)
  }

  return (
    <FeatureLayout
      profile={profile}
      title="Gerenciamento de Clientes"
      description="Cadastre, edite e gerencie os clientes da plataforma. Cada cliente tera seu proprio dashboard personalizado."
    >
      <ClientManagement clients={clients || []} />
    </FeatureLayout>
  )
}
