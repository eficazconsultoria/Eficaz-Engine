import { requireAuth } from "@/lib/auth"
import { FeatureLayout } from "@/components/dashboard/feature-layout"
import { AccountInfo } from "./account-info"

export default async function AccountPage() {
  const profile = await requireAuth()

  return (
    <FeatureLayout profile={profile} title="Minha Conta">
      <AccountInfo profile={profile} />
    </FeatureLayout>
  )
}
