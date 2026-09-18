import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, getGenerationHistory } from "@/lib/services/generation"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { SeoForm } from "./seo-form"

export default async function SeoPage() {
  const profile = await requireFeatureAccess("seo_texts")
  
  // Buscar ambos os agentes em paralelo
  const [seoAgent, keywordAgent, history] = await Promise.all([
    getAgentPrompt("seo_texts"),
    getAgentPrompt("keyword_research"),
    getGenerationHistory(profile.id, "seo_texts", 5)
  ])

  return (
    <FeatureLayout profile={profile} title="Gerador de Texto SEO">
      <SeoForm 
        profile={profile} 
        agent={seoAgent} 
        keywordAgent={keywordAgent}
        history={history} 
      />
    </FeatureLayout>
  )
}
