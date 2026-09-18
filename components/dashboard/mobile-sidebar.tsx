"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  LogOut,
  Zap,
  Home,
  Sparkles,
  Settings,
  ChevronRight,
  Building2,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { type FeatureKey, FEATURE_LABELS, hasAccess, ROLE_LABELS } from "@/lib/rbac"
import type { Profile } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { SheetClose } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface MobileSidebarProps {
  profile: Profile
}

const FEATURE_ICONS: Record<FeatureKey, React.ComponentType<{ className?: string }>> = {
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

const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  product_image_variations: "Crie variacoes de fotos",
  creatives: "Gere artes para anuncios",
  marketing_videos: "Produza videos curtos",
  post_texts: "Escreva legendas e posts",
  site_banners: "Crie banners para sites",
  whatsapp_dispatcher: "Envie mensagens em massa",
  seo_texts: "Otimize textos para buscas",
  my_account: "Gerencie seus dados",
  user_management: "Administre usuarios",
  client_management: "Gerencie clientes",
  lead_prospecting: "Enriqueça leads B2B",
}

const FEATURE_ROUTES: Record<FeatureKey, string> = {
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

const FEATURE_ORDER: FeatureKey[] = [
  "product_image_variations",
  "creatives",
  "marketing_videos",
  "post_texts",
  "site_banners",
  "whatsapp_dispatcher",
  "seo_texts",
  "lead_prospecting",
  "client_management",
  "my_account",
  "user_management",
]

export function MobileSidebar({ profile }: MobileSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const accessibleFeatures = FEATURE_ORDER.filter((feature) => hasAccess(profile.role, feature))
  const aiFeatures = accessibleFeatures.filter(
    (f) =>
      f !== "my_account" &&
      f !== "user_management" &&
      f !== "client_management" &&
      f !== "lead_prospecting" &&
      f !== "seo_texts" &&
      f !== "post_texts",
  )
  const accountFeatures = accessibleFeatures.filter((f) => f === "my_account" || f === "user_management")

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <span className="font-semibold tracking-tight">Eficaz Engine</span>
          <p className="text-[10px] text-muted-foreground">Marketing AI Platform</p>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
          <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-medium">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{profile.name}</p>
            <p className="truncate text-sm text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <SheetClose asChild>
          <Link href="/dashboard">
            <Button
              variant={pathname === "/dashboard" ? "secondary" : "ghost"}
              className={cn(
                "mb-2 w-full justify-start h-auto py-3 px-4",
                pathname === "/dashboard" && "bg-primary/10 text-primary hover:bg-primary/15",
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mr-3">
                <Home className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-medium">Inicio</p>
                <p className="text-xs text-muted-foreground">Visao geral do sistema</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </Button>
          </Link>
        </SheetClose>

        {/* AI Features */}
        <div className="mb-3 mt-6 flex items-center gap-2 px-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ferramentas IA</span>
        </div>

        <div className="space-y-1">
          {aiFeatures.map((feature) => {
            const Icon = FEATURE_ICONS[feature]
            const isActive = pathname === FEATURE_ROUTES[feature]

            return (
              <SheetClose key={feature} asChild>
                <Link href={FEATURE_ROUTES[feature]}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start h-auto py-3 px-4",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/15",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg mr-3",
                        isActive ? "bg-primary/20" : "bg-muted",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium">{FEATURE_LABELS[feature]}</p>
                      <p className="text-xs text-muted-foreground">{FEATURE_DESCRIPTIONS[feature]}</p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
              </SheetClose>
            )
          })}
        </div>

        {/* Account Features */}
        {accountFeatures.length > 0 && (
          <>
            <div className="mb-3 mt-6 flex items-center gap-2 px-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Configuracoes
              </span>
            </div>
            <div className="space-y-1">
              {accountFeatures.map((feature) => {
                const Icon = FEATURE_ICONS[feature]
                const isActive = pathname === FEATURE_ROUTES[feature]

                return (
                  <SheetClose key={feature} asChild>
                    <Link href={FEATURE_ROUTES[feature]}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start h-auto py-3 px-4",
                          isActive && "bg-primary/10 text-primary hover:bg-primary/15",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg mr-3",
                            isActive ? "bg-primary/20" : "bg-muted",
                          )}
                        >
                          <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium">{FEATURE_LABELS[feature]}</p>
                          <p className="text-xs text-muted-foreground">{FEATURE_DESCRIPTIONS[feature]}</p>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                      </Button>
                    </Link>
                  </SheetClose>
                )
              })}
            </div>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="border-t p-4">
        <SheetClose asChild>
          <Button
            variant="ghost"
            className="w-full justify-start h-auto py-3 px-4 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 mr-3">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <div className="text-left">
              <p className="font-medium">Sair</p>
              <p className="text-xs text-muted-foreground">Encerrar sessao</p>
            </div>
          </Button>
        </SheetClose>
      </div>
    </div>
  )
}
