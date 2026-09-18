import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, getGenerationHistory } from "@/lib/services/generation"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { PostsForm } from "./posts-form"

export default async function PostsPage() {
  const profile = await requireFeatureAccess("post_texts")
  const agent = await getAgentPrompt("post_texts")
  const history = await getGenerationHistory(profile.id, "post_texts", 5)

  return (
    <FeatureLayout profile={profile} title="Gerador de Textos para Posts">
      <PostsForm profile={profile} agent={agent} history={history} />
    </FeatureLayout>
  )
}
