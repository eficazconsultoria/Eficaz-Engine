import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, getGenerationHistory } from "@/lib/services/generation"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { VideosForm } from "./videos-form"

export default async function VideosPage() {
  const profile = await requireFeatureAccess("marketing_videos")
  const agent = await getAgentPrompt("marketing_videos")
  const history = await getGenerationHistory(profile.id, "marketing_videos", 5)

  return (
    <FeatureLayout profile={profile} title="Gerador de Vídeos de Marketing">
      <VideosForm profile={profile} agent={agent} history={history} />
    </FeatureLayout>
  )
}
