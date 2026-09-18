import { requireFeatureAccess } from "@/lib/auth"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { RelatoriosContent } from "./relatorios-content"

export default async function RelatoriosPage() {
  const profile = await requireFeatureAccess("lead_prospecting")

  return (
    <FeatureLayout
      profile={profile}
      title="Relatórios de Prospecção"
      description="Análise detalhada dos seus leads e prospecções"
    >
      <RelatoriosContent />
    </FeatureLayout>
  )
}
