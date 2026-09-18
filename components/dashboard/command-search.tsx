"use client"

import type * as React from "react"
import { useRouter } from "next/navigation"
import {
  ImageIcon,
  Palette,
  Video,
  FileText,
  Layout,
  MessageSquare,
  Search,
  User,
  Users,
  Home,
  Sparkles,
  ArrowRight,
  Building2,
  Target,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { type FeatureKey, FEATURE_LABELS, hasAccess } from "@/lib/rbac"
import type { UserRole } from "@/lib/types"

interface CommandSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole: UserRole
}

const FEATURE_ICONS: Record<FeatureKey | "home", React.ComponentType<{ className?: string }>> = {
  home: Home,
  product_image_variations: ImageIcon,
  creatives: Palette,
  marketing_videos: Video,
  post_texts: FileText,
  site_banners: Layout,
  whatsapp_dispatcher: MessageSquare,
  seo_texts: Search,
  my_account: User,
  user_management: Users,
  client_management: Building2,
  lead_prospecting: Target,
}

const FEATURE_ROUTES: Record<FeatureKey | "home", string> = {
  home: "/dashboard",
  product_image_variations: "/dashboard/product-images",
  creatives: "/dashboard/creatives",
  marketing_videos: "/dashboard/videos",
  post_texts: "/dashboard/posts",
  site_banners: "/dashboard/banners",
  whatsapp_dispatcher: "/dashboard/whatsapp",
  seo_texts: "/dashboard/seo",
  my_account: "/dashboard/account",
  user_management: "/dashboard/users",
  client_management: "/dashboard/clients",
  lead_prospecting: "/dashboard/prospeccao",
}

const FEATURE_DESCRIPTIONS: Record<FeatureKey | "home", string> = {
  home: "Voltar para a pagina inicial",
  product_image_variations: "Gerar variacoes de imagens de produtos com IA",
  creatives: "Criar artes e criativos para campanhas",
  marketing_videos: "Gerar videos de marketing",
  post_texts: "Criar textos para posts em redes sociais",
  site_banners: "Gerar banners para sites e landing pages",
  whatsapp_dispatcher: "Enviar mensagens em massa pelo WhatsApp",
  seo_texts: "Gerar textos otimizados para SEO",
  my_account: "Gerenciar suas informacoes pessoais",
  user_management: "Gerenciar usuarios do sistema",
  client_management: "Gerenciar clientes",
  lead_prospecting: "Importar e enriquecer leads B2B",
}

const FEATURE_COLORS: Record<FeatureKey | "home", string> = {
  home: "text-blue-500",
  product_image_variations: "text-violet-500",
  creatives: "text-pink-500",
  marketing_videos: "text-red-500",
  post_texts: "text-green-500",
  site_banners: "text-orange-500",
  whatsapp_dispatcher: "text-emerald-500",
  seo_texts: "text-cyan-500",
  my_account: "text-slate-500",
  user_management: "text-amber-500",
  client_management: "text-teal-500",
  lead_prospecting: "text-yellow-500",
}

export function CommandSearch({ open, onOpenChange, userRole }: CommandSearchProps) {
  const router = useRouter()

  const handleSelect = (route: string) => {
    onOpenChange(false)
    router.push(route)
  }

  const aiFeatures: FeatureKey[] = [
    "product_image_variations",
    "creatives",
    "marketing_videos",
    "post_texts",
    "site_banners",
    "seo_texts",
  ]

  const utilityFeatures: FeatureKey[] = ["whatsapp_dispatcher"]
  const accountFeatures: FeatureKey[] = ["my_account", "user_management"]

  const accessibleAiFeatures = aiFeatures.filter((f) => hasAccess(userRole, f))
  const accessibleUtilityFeatures = utilityFeatures.filter((f) => hasAccess(userRole, f))
  const accessibleAccountFeatures = accountFeatures.filter((f) => hasAccess(userRole, f))

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search className="h-5 w-5 text-muted-foreground" />
        <CommandInput
          placeholder="Buscar paginas, ferramentas..."
          className="border-0 focus:ring-0 placeholder:text-muted-foreground"
        />
      </div>
      <CommandList className="max-h-[400px] p-2">
        <CommandEmpty className="py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum resultado encontrado.</p>
        </CommandEmpty>

        <CommandGroup heading="Navegacao" className="px-2">
          <CommandItem
            onSelect={() => handleSelect("/dashboard")}
            className="gap-3 py-3 px-3 rounded-xl cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Home className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex flex-col gap-0.5 flex-1">
              <span className="font-medium">Inicio</span>
              <span className="text-xs text-muted-foreground">Voltar para a pagina inicial</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </CommandItem>
        </CommandGroup>

        {accessibleAiFeatures.length > 0 && (
          <>
            <CommandSeparator className="my-2" />
            <CommandGroup heading="Ferramentas IA" className="px-2">
              <div className="flex items-center gap-2 px-3 py-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Geracoes com Inteligencia Artificial</span>
              </div>
              {accessibleAiFeatures.map((feature) => {
                const Icon = FEATURE_ICONS[feature]
                const colorClass = FEATURE_COLORS[feature]
                return (
                  <CommandItem
                    key={feature}
                    onSelect={() => handleSelect(FEATURE_ROUTES[feature])}
                    className="gap-3 py-3 px-3 rounded-xl cursor-pointer group"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass.replace("text-", "bg-")}/10`}
                    >
                      <Icon className={`h-5 w-5 ${colorClass}`} />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="font-medium">{FEATURE_LABELS[feature]}</span>
                      <span className="text-xs text-muted-foreground">{FEATURE_DESCRIPTIONS[feature]}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}

        {accessibleUtilityFeatures.length > 0 && (
          <>
            <CommandSeparator className="my-2" />
            <CommandGroup heading="Utilidades" className="px-2">
              {accessibleUtilityFeatures.map((feature) => {
                const Icon = FEATURE_ICONS[feature]
                const colorClass = FEATURE_COLORS[feature]
                return (
                  <CommandItem
                    key={feature}
                    onSelect={() => handleSelect(FEATURE_ROUTES[feature])}
                    className="gap-3 py-3 px-3 rounded-xl cursor-pointer group"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass.replace("text-", "bg-")}/10`}
                    >
                      <Icon className={`h-5 w-5 ${colorClass}`} />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="font-medium">{FEATURE_LABELS[feature]}</span>
                      <span className="text-xs text-muted-foreground">{FEATURE_DESCRIPTIONS[feature]}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}

        {accessibleAccountFeatures.length > 0 && (
          <>
            <CommandSeparator className="my-2" />
            <CommandGroup heading="Conta" className="px-2">
              {accessibleAccountFeatures.map((feature) => {
                const Icon = FEATURE_ICONS[feature]
                const colorClass = FEATURE_COLORS[feature]
                return (
                  <CommandItem
                    key={feature}
                    onSelect={() => handleSelect(FEATURE_ROUTES[feature])}
                    className="gap-3 py-3 px-3 rounded-xl cursor-pointer group"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass.replace("text-", "bg-")}/10`}
                    >
                      <Icon className={`h-5 w-5 ${colorClass}`} />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="font-medium">{FEATURE_LABELS[feature]}</span>
                      <span className="text-xs text-muted-foreground">{FEATURE_DESCRIPTIONS[feature]}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
