import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, getGenerationHistory } from "@/lib/services/generation"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { CreativesForm } from "./creatives-form"

export default async function CreativesPage() {
  const profile = await requireFeatureAccess("creatives")
  const agent = await getAgentPrompt("creatives")
  const history = await getGenerationHistory(profile.id, "creatives", 5)

  return (
    <FeatureLayout profile={profile} title="Gerador de Criativos">
      <CreativesForm profile={profile} agent={agent} history={history} />
    </FeatureLayout>
  )
}
