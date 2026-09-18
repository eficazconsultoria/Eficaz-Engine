import { requireFeatureAccess } from "@/lib/auth"
import { getAgentPrompt, getGenerationHistory } from "@/lib/services/generation"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { ProductImagesForm } from "./product-images-form"

export default async function ProductImagesPage() {
  const profile = await requireFeatureAccess("product_image_variations")
  const agent = await getAgentPrompt("product_image_variations")
  const history = await getGenerationHistory(profile.id, "product_image_variations", 5)

  return (
    <FeatureLayout
      profile={profile}
      title="Variações de Imagens"
      description="Gere variações de imagens de produtos para e-commerce"
    >
      <ProductImagesForm profile={profile} agent={agent} history={history} />
    </FeatureLayout>
  )
}
