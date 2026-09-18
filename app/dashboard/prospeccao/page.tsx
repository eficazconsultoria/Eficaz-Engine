import { createClient } from "@/lib/supabase/server"
import { requireFeatureAccess } from "@/lib/auth"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { ProspeccaoContent } from "./prospeccao-content"
import type { Lead } from "@/lib/types"

const PAGE_SIZE = 50

export default async function ProspeccaoPage() {
  const profile = await requireFeatureAccess("lead_prospecting")

  const supabase = await createClient()

  // Fetch first page of leads with pagination
  const { data: leads, error, count } = await supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1)

  if (error) {
    console.error("Error fetching leads:", error)
  }

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <FeatureLayout
      profile={profile}
      title="Prospecção"
      description="Gerencie e enriqueça leads B2B com dados reais da internet"
    >
      <ProspeccaoContent 
        initialLeads={(leads as Lead[]) || []} 
        initialTotal={count || 0}
        initialTotalPages={totalPages}
      />
    </FeatureLayout>
  )
}
