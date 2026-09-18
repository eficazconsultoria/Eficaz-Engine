import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth"
import { isClientUser } from "@/lib/rbac"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Building2, 
  Globe, 
  Target, 
  Users, 
  Search,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Zap,
} from "lucide-react"
import { ClientDashboardMetrics } from "./client-dashboard-metrics"

interface ClientDashboardPageProps {
  params: Promise<{ client_slug: string }>
}

const SEGMENT_LABELS: Record<string, string> = {
  imobiliario: "Imobiliario",
  moda: "Moda",
  automotivo: "Automotivo",
  tecnologia: "Tecnologia",
  saude: "Saude",
  educacao: "Educacao",
  alimentacao: "Alimentacao",
  servicos: "Servicos",
  varejo: "Varejo",
  industria: "Industria",
  financeiro: "Financeiro",
  turismo: "Turismo",
  beleza: "Beleza",
  esportes: "Esportes",
  pets: "Pets",
  outro: "Outro",
}

const TYPE_LABELS: Record<string, string> = {
  ecommerce: "E-commerce",
  lead_generation: "Coleta de Leads",
}

const FOCUS_LABELS: Record<string, string> = {
  autoridade: "Autoridade",
  venda: "Venda",
  coleta_leads: "Coleta de Leads",
  branding: "Branding",
  engajamento: "Engajamento",
  trafego: "Trafego",
}



export default async function ClientDashboardPage({ params }: ClientDashboardPageProps) {
  const { client_slug } = await params
  
  // Block client users from accessing this page
  const profile = await getProfile()
  if (profile && isClientUser(profile.role)) {
    redirect("/dashboard")
  }
  
  const supabase = await createClient()
  
  // Fetch client data
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", client_slug)
    .eq("active", true)
    .single()

  if (error || !client) {
    notFound()
  }

  // Fetch prompts count and stats
  const { data: prompts, error: promptsError } = await supabase
    .from("client_ai_prompts")
    .select("id, is_active")
    .eq("client_id", client.id)

  const totalPrompts = prompts?.length || 0
  const activePrompts = prompts?.filter(p => p.is_active).length || 0

  // Fetch competitors count
  const { data: competitors, error: competitorsError } = await supabase
    .from("client_competitors")
    .select("id, is_active")
    .eq("client_id", client.id)

  const totalCompetitors = competitors?.length || 0
  const activeCompetitors = competitors?.filter(c => c.is_active).length || 0

  // Fetch analytics summary for overall metrics
  const promptIds = prompts?.map(p => p.id) || []
  let overallVisibility = 0
  let overallReputation = 0
  let overallPosition = 0
  let totalTests = 0

  if (promptIds.length > 0) {
    const { data: analytics } = await supabase
      .from("prompt_analytics_summary")
      .select("*")
      .in("prompt_id", promptIds)

    if (analytics && analytics.length > 0) {
      const validAnalytics = analytics.filter(a => a.total_tests > 0)
      if (validAnalytics.length > 0) {
        // Calculate visibility rate: (tests_with_visibility / total_tests) * 100
        const totalTestsSum = validAnalytics.reduce((acc, a) => acc + (a.total_tests || 0), 0)
        const testsWithVisibility = validAnalytics.reduce((acc, a) => acc + (a.tests_with_visibility || 0), 0)
        overallVisibility = totalTestsSum > 0 
          ? Math.round((testsWithVisibility / totalTestsSum) * 100) 
          : 0
        
        // Average reputation score
        overallReputation = Math.round(
          validAnalytics.reduce((acc, a) => acc + (a.avg_reputation_score || 0), 0) / validAnalytics.length
        )
        
        // Average position rank
        const positionData = validAnalytics.filter(a => a.avg_position_rank)
        if (positionData.length > 0) {
          overallPosition = Math.round(
            positionData.reduce((acc, a) => acc + a.avg_position_rank, 0) / positionData.length * 10
          ) / 10
        }
        
        totalTests = totalTestsSum
      }
    }
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-muted-foreground mt-1">Visao geral do monitoramento de IA</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {SEGMENT_LABELS[client.segment] || client.segment}
              </Badge>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {TYPE_LABELS[client.type] || client.type}
              </Badge>
              {client.site && (
                <a
                  href={client.site.startsWith("http") ? client.site : `https://${client.site}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  {client.site.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Metrics with Period Filter */}
      <ClientDashboardMetrics
        clientSlug={client_slug}
        promptIds={promptIds}
        initialMetrics={{
          overallVisibility,
          overallReputation,
          overallPosition,
          totalTests,
        }}
      />

      {/* Quick Actions & Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Prompts Status */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" />
              <span>Buscas de IA</span>
            </CardTitle>
            <CardDescription>
              Prompts configurados para monitoramento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{activePrompts} ativos</p>
                  <p className="text-xs text-muted-foreground">de {totalPrompts} prompts</p>
                </div>
              </div>
              <Progress value={(activePrompts / Math.max(totalPrompts, 1)) * 100} className="w-20 h-2" />
            </div>
            
            <Link href={`/${client_slug}/prompts`}>
              <Button variant="outline" className="w-full justify-between group">
                <span>Gerenciar Prompts</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Competitors Status */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              <span>Concorrentes</span>
            </CardTitle>
            <CardDescription>
              Empresas sendo monitoradas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-500/10">
                  <Target className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="font-medium">{activeCompetitors} monitorando</p>
                  <p className="text-xs text-muted-foreground">de {totalCompetitors} cadastrados</p>
                </div>
              </div>
              <Progress value={(activeCompetitors / Math.max(totalCompetitors, 1)) * 100} className="w-20 h-2" />
            </div>
            
            <Link href={`/${client_slug}/concorrentes`}>
              <Button variant="outline" className="w-full justify-between group">
                <span>Gerenciar Concorrentes</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Informacoes</span>
            </CardTitle>
            <CardDescription>
              Dados do cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Segmento</span>
              <span className="text-sm font-medium">{SEGMENT_LABELS[client.segment] || client.segment}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Tipo</span>
              <span className="text-sm font-medium">{TYPE_LABELS[client.type] || client.type}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Foco</span>
              <span className="text-sm font-medium">{FOCUS_LABELS[client.focus] || client.focus}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Audience */}
      {client.target_audience && (
        <Card className="bg-gradient-to-br from-background to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              <span>Publico-Alvo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{client.target_audience}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No data yet */}
      {totalPrompts === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Comece o monitoramento</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Configure os prompts de busca para comecar a monitorar como sua marca aparece nas respostas de IA.
            </p>
            <Link href={`/${client_slug}/prompts`}>
              <Button className="gap-2">
                <Search className="h-4 w-4" />
                Configurar Prompts
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
