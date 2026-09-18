import { requireFeatureAccess } from "@/lib/auth"
import { getUserCampaigns } from "@/lib/services/whatsapp"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { WhatsAppDispatcher } from "./whatsapp-dispatcher"

export default async function WhatsAppPage() {
  const profile = await requireFeatureAccess("whatsapp_dispatcher")
  const campaigns = await getUserCampaigns(profile.id)

  return (
    <FeatureLayout profile={profile} title="Disparador de WhatsApp">
      <WhatsAppDispatcher campaigns={campaigns} />
    </FeatureLayout>
  )
}
