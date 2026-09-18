import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, getGenerationHistory } from "@/lib/services/generation"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { BannersForm } from "./banners-form"

export default async function BannersPage() {
  const profile = await requireFeatureAccess("site_banners")
  const agent = await getAgentPrompt("site_banners")
  const history = await getGenerationHistory(profile.id, "site_banners", 5)

  return (
    <FeatureLayout profile={profile} title="Gerador de Banners para Site">
      <BannersForm profile={profile} agent={agent} history={history} />
    </FeatureLayout>
  )
}
