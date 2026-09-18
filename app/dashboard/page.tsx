import type React from "react"
import { requireAuth } from "@/lib/auth"
import { Header } from "@/components/dashboard/header"
import { FEATURE_LABELS, getAccessibleFeatures, ROLE_LABELS } from "@/lib/rbac"
import Link from "next/link"
import {
  ImageIcon,
  Palette,
  Video,
  FileText,
  Layout,
  MessageSquare,
  Search,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  Star,
  BarChart3,
  ChevronRight,
  Play,
  Lightbulb,
  Rocket,
  Target,
} from "lucide-react"
import type { FeatureKey } from "@/lib/rbac"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const FEATURE_ICONS: Record<FeatureKey, React.ComponentType<{ className?: string }>> = {
  product_image_variations: ImageIcon,
  creatives: Palette,
  marketing_videos: Video,
  post_texts: FileText,
  site_banners: Layout,
  whatsapp_dispatcher: MessageSquare,
  seo_texts: Search,
  my_account: () => null,
  user_management: () => null,
  client_management: () => null,
  lead_prospecting: Target,
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

const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  product_image_variations: "Crie variações profissionais de fotos de produtos para e-commerce",
  creatives: "Gere criativos impactantes para suas campanhas nas redes sociais",
  marketing_videos: "Produza vídeos envolventes para marketing digital",
  post_texts: "Escreva textos persuasivos para blog e redes sociais",
  site_banners: "Design de banners atrativos para seu site",
  whatsapp_dispatcher: "Envie mensagens personalizadas em massa via WhatsApp",
  seo_texts: "Conteúdo otimizado para ranquear no Google",
  my_account: "",
  user_management: "",
  client_management: "",
  lead_prospecting: "Importe e enriqueça leads B2B com dados reais usando IA",
}

const FEATURE_COLORS: Record<FeatureKey, { bg: string; icon: string; border: string }> = {
  product_image_variations: {
    bg: "from-blue-500/10 via-blue-500/5 to-transparent",
    icon: "bg-blue-500/10 text-blue-500",
    border: "group-hover:border-blue-500/30",
  },
  creatives: {
    bg: "from-purple-500/10 via-purple-500/5 to-transparent",
    icon: "bg-purple-500/10 text-purple-500",
    border: "group-hover:border-purple-500/30",
  },
  marketing_videos: {
    bg: "from-pink-500/10 via-pink-500/5 to-transparent",
    icon: "bg-pink-500/10 text-pink-500",
    border: "group-hover:border-pink-500/30",
  },
  post_texts: {
    bg: "from-green-500/10 via-green-500/5 to-transparent",
    icon: "bg-green-500/10 text-green-500",
    border: "group-hover:border-green-500/30",
  },
  site_banners: {
    bg: "from-orange-500/10 via-orange-500/5 to-transparent",
    icon: "bg-orange-500/10 text-orange-500",
    border: "group-hover:border-orange-500/30",
  },
  whatsapp_dispatcher: {
    bg: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    icon: "bg-emerald-500/10 text-emerald-500",
    border: "group-hover:border-emerald-500/30",
  },
  seo_texts: {
    bg: "from-cyan-500/10 via-cyan-500/5 to-transparent",
    icon: "bg-cyan-500/10 text-cyan-500",
    border: "group-hover:border-cyan-500/30",
  },
  lead_prospecting: {
    bg: "from-amber-500/10 via-amber-500/5 to-transparent",
    icon: "bg-amber-500/10 text-amber-500",
    border: "group-hover:border-amber-500/30",
  },
  my_account: { bg: "", icon: "", border: "" },
  user_management: { bg: "", icon: "", border: "" },
  client_management: { bg: "", icon: "", border: "" },
}

const QUICK_TIPS = [
  { icon: Lightbulb, text: "Use referências visuais para resultados mais precisos" },
  { icon: Star, text: "Quanto mais detalhes, melhor o resultado da IA" },
  { icon: Rocket, text: "Experimente diferentes estilos para encontrar o ideal" },
]

export default async function DashboardPage() {
  // Note: Client users are blocked at layout level and redirected to their analytics page
  const profile = await requireAuth()

  const accessibleFeatures = getAccessibleFeatures(profile.role).filter(
    (f) => f !== "my_account" && f !== "user_management" && f !== "client_management" && f !== "lead_prospecting",
  )

  const firstName = profile.name?.split(" ")[0] || "Usuário"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  // Simulated recent activity
  const recentTools = accessibleFeatures.slice(0, 3)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header profile={profile} title="Dashboard" />

      <div className="flex-1 p-4 lg:p-8 space-y-8">
        {/* Hero Welcome Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/50 p-6 lg:p-8 animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-chart-2/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-sm text-muted-foreground mb-4">
                <Clock className="h-3.5 w-3.5" />
                <span>{greeting}</span>
                <span className="text-foreground font-medium">
                  {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">
                Olá, {firstName}! <span className="inline-block animate-bounce">👋</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Bem-vindo ao Eficaz Engine. Utilize nossas ferramentas de IA para criar conteúdos incríveis para sua
                marca.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={FEATURE_ROUTES[accessibleFeatures[0] || "creatives"]}>
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Começar a Criar
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className="group rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-border hover:shadow-lg animate-slide-up"
            style={{ animationDelay: "50ms" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted/50">Total</span>
            </div>
            <p className="text-3xl font-bold">{accessibleFeatures.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Ferramentas disponíveis</p>
          </div>

          <div
            className="group rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-border hover:shadow-lg animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 transition-transform group-hover:scale-110">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-xs text-green-500 px-2 py-1 rounded-full bg-green-500/10">Este mês</span>
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-1">Gerações realizadas</p>
          </div>

          <div
            className="group rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-border hover:shadow-lg animate-slide-up"
            style={{ animationDelay: "150ms" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-1/10 transition-transform group-hover:scale-110">
                <BarChart3 className="h-5 w-5 text-chart-1" />
              </div>
              <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted/50">Status</span>
            </div>
            <p className="text-3xl font-bold capitalize">{ROLE_LABELS[profile.role]}</p>
            <p className="text-sm text-muted-foreground mt-1">Nível de acesso</p>
          </div>

          <div
            className="group rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-border hover:shadow-lg animate-slide-up"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 transition-transform group-hover:scale-110">
                <Zap className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-xs text-orange-500 px-2 py-1 rounded-full bg-orange-500/10">Ativo</span>
            </div>
            <p className="text-3xl font-bold">100%</p>
            <p className="text-sm text-muted-foreground mt-1">Disponibilidade</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Tools Section - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Ferramentas de IA
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Selecione uma ferramenta para começar a criar</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {accessibleFeatures.map((feature, index) => {
                const Icon = FEATURE_ICONS[feature]
                const colors = FEATURE_COLORS[feature]

                return (
                  <Link
                    key={feature}
                    href={FEATURE_ROUTES[feature]}
                    className="group animate-slide-up"
                    style={{ animationDelay: `${250 + index * 50}ms` }}
                  >
                    <div
                      className={cn(
                        "relative h-full overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br p-5 transition-all duration-300",
                        "hover:shadow-xl hover:-translate-y-1",
                        colors.bg,
                        colors.border,
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
                            colors.icon,
                          )}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold truncate">{FEATURE_LABELS[feature]}</h3>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {FEATURE_DESCRIPTIONS[feature]}
                          </p>
                        </div>
                      </div>

                      {/* Hover effect gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="space-y-6">
            {/* Quick Access */}
            <div
              className="rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm animate-slide-up"
              style={{ animationDelay: "400ms" }}
            >
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Play className="h-4 w-4 text-primary" />
                Acesso Rápido
              </h3>
              <div className="space-y-2">
                {recentTools.map((feature) => {
                  const Icon = FEATURE_ICONS[feature]
                  const colors = FEATURE_COLORS[feature]
                  return (
                    <Link
                      key={feature}
                      href={FEATURE_ROUTES[feature]}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
                          colors.icon,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{FEATURE_LABELS[feature]}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Tips Card */}
            <div
              className="rounded-2xl border border-border/50 bg-gradient-to-br from-chart-2/10 via-chart-2/5 to-transparent p-5 backdrop-blur-sm animate-slide-up"
              style={{ animationDelay: "450ms" }}
            >
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Lightbulb className="h-4 w-4 text-chart-2" />
                Dicas Rápidas
              </h3>
              <div className="space-y-3">
                {QUICK_TIPS.map((tip, index) => {
                  const Icon = tip.icon
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chart-2/10 mt-0.5">
                        <Icon className="h-3 w-3 text-chart-2" />
                      </div>
                      <p className="text-sm text-muted-foreground">{tip.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Help Card */}
            <div
              className="rounded-2xl border border-dashed border-border/50 bg-muted/30 p-5 text-center animate-slide-up"
              style={{ animationDelay: "500ms" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">Precisa de ajuda?</h3>
              <p className="text-sm text-muted-foreground mb-4">Nossa equipe está pronta para auxiliar você</p>
              <Button variant="outline" size="sm" className="rounded-xl bg-transparent">
                Falar com Suporte
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
