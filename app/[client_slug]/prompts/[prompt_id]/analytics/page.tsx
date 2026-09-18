"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Play,
  Eye,
  Star,
  ShoppingBag,
  Trophy,
  Users,
  Globe,
  MapPin,
  Link2,
  Search,
  TrendingUp,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Minus,
  Power,
  PowerOff,
  Timer,
  Target,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Bot,
  User,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  Lightbulb,
  ListChecks,
  Loader2,
  FileText,
  Megaphone,
  Link as LinkIcon,
  Rocket,
  TrendingDown,
  LogOut,
  Phone,
  MessageCircle,
  Quote,
  AlertTriangle,
  Filter,
  ArrowDown,
  ArrowUp,
  ImageIcon,
  ThumbsUp,
  Package,
  Store,
  DollarSign,
  ShoppingCart,
  Check,
  BarChart3,
  Heart,
  Cloud,
} from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Client, ClientAIPrompt, PromptTestResult, PromptAnalyticsSummary, ClientCompetitor } from "@/lib/types"
import { 
  PeriodFilter, 
  type PeriodFilterValue, 
  getDefaultPeriodFilter,
  buildPeriodQueryParams 
} from "@/components/dashboard/period-filter"

// Helper component for metric tooltips
function MetricTooltip({ whatIs, purpose, calculation }: { 
  whatIs: string
  purpose: string
  calculation: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm p-4 bg-popover text-popover-foreground">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-xs text-primary mb-0.5">O que e?</p>
              <p className="text-xs text-popover-foreground">{whatIs}</p>
            </div>
            <div>
              <p className="font-semibold text-xs text-primary mb-0.5">Para que serve?</p>
              <p className="text-xs text-popover-foreground">{purpose}</p>
            </div>
            <div>
              <p className="font-semibold text-xs text-primary mb-0.5">Como e calculada?</p>
              <p className="text-xs text-popover-foreground font-mono bg-muted/20 px-2 py-1 rounded">{calculation}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Comparison indicator component
function ComparisonIndicator({ current, previous, suffix = "%" }: { 
  current: number
  previous: number | null | undefined
  suffix?: string
}) {
  if (previous === null || previous === undefined) return null
  
  const diff = current - previous
  const percentChange = previous !== 0 ? ((current - previous) / previous) * 100 : 0
  
  if (Math.abs(diff) < 0.1) return null
  
  const isPositive = diff > 0
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight
  const colorClass = isPositive ? "text-emerald-500" : "text-red-500"
  
  return (
    <div className={`flex items-center gap-0.5 text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{isPositive ? "+" : ""}{diff.toFixed(1)}{suffix}</span>
    </div>
  )
}

// Score indicator component
function ScoreIndicator({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const getColor = () => {
    if (score >= 70) return { bg: "bg-emerald-500/10", text: "text-emerald-500", ring: "ring-emerald-500/20" }
    if (score >= 40) return { bg: "bg-amber-500/10", text: "text-amber-500", ring: "ring-amber-500/20" }
    return { bg: "bg-red-500/10", text: "text-red-500", ring: "ring-red-500/20" }
  }
  const colors = getColor()
  
  return (
    <div className={`inline-flex items-center justify-center rounded-full ${colors.bg} ${colors.text} ring-1 ${colors.ring} ${
      size === "lg" ? "h-16 w-16 text-xl font-bold" : "h-8 w-8 text-xs font-semibold"
    }`}>
      {score.toFixed(0)}%
    </div>
  )
}

export default function PromptAnalyticsPage() {
  const params = useParams()
  const clientSlug = params.client_slug as string
  const promptId = params.prompt_id as string

  const [prompt, setPrompt] = useState<ClientAIPrompt | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [summary, setSummary] = useState<PromptAnalyticsSummary | null>(null)
  const [testHistory, setTestHistory] = useState<PromptTestResult[]>([])
  const [trackedCompetitors, setTrackedCompetitors] = useState<ClientCompetitor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [isClientUserView, setIsClientUserView] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set())
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>(getDefaultPeriodFilter())
  const [comparisonSummary, setComparisonSummary] = useState<PromptAnalyticsSummary | null>(null)
  const [sourceSortOrder, setSourceSortOrder] = useState<"desc" | "asc">("desc")
  
  // Insights state
  const [insights, setInsights] = useState<string[]>([])
  const [actionPlan, setActionPlan] = useState<Array<{ title: string; description: string; priority: string; category: string }>>([])
  const [insightCreatedAt, setInsightCreatedAt] = useState<string | null>(null)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    function calculateCountdown() {
      const now = new Date()
      const brazilOffset = -3 * 60
      const localOffset = now.getTimezoneOffset()
      const diffMinutes = brazilOffset - (-localOffset)
      
      const target = new Date(now)
      target.setHours(9, 0, 0, 0)
      target.setMinutes(target.getMinutes() - diffMinutes)
      
      if (target <= now) {
        target.setDate(target.getDate() + 1)
      }
      
      const diff = target.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }

    setCountdown(calculateCountdown())
    const interval = setInterval(() => {
      setCountdown(calculateCountdown())
    }, 1000)

    return () => clearInterval(interval)
  }, [isMounted])

  const fetchData = useCallback(async () => {
    try {
      const promptRes = await fetch(`/api/clients/${clientSlug}/prompts/${promptId}`)
      const promptData = await promptRes.json()
      
      if (!promptRes.ok) {
        throw new Error(promptData.error || "Erro ao buscar prompt")
      }
      
      setPrompt(promptData.prompt)
      setClient(promptData.client)
      setCanManage(promptData.canManage || false)
      setIsClientUserView(promptData.isClientUser || false)

      // Build query params for period filtering
      const periodParams = buildPeriodQueryParams(periodFilter)
      
      const summaryRes = await fetch(`/api/clients/${clientSlug}/prompts/${promptId}/analytics?${periodParams.toString()}`)
      const summaryData = await summaryRes.json()
      
      if (summaryRes.ok) {
        setSummary(summaryData.summary)
        setComparisonSummary(summaryData.comparison || null)
      }

      const historyRes = await fetch(`/api/clients/${clientSlug}/prompts/${promptId}/history?${periodParams.toString()}&limit=50`)
      const historyData = await historyRes.json()
      
      if (historyRes.ok) {
        setTestHistory(historyData.tests)
      }

      const competitorsRes = await fetch(`/api/clients/${clientSlug}/competitors`)
      const competitorsData = await competitorsRes.json()
      
      if (competitorsRes.ok) {
        setTrackedCompetitors(
          (competitorsData.competitors || []).filter((c: ClientCompetitor) => c.is_active)
        )
      }

      // Fetch existing insights
      const insightsRes = await fetch(`/api/clients/${clientSlug}/prompts/${promptId}/insights`)
      const insightsData = await insightsRes.json()
      
      if (insightsRes.ok && insightsData.insight) {
        try {
          setInsights(JSON.parse(insightsData.insight.insights_text))
          setActionPlan(JSON.parse(insightsData.insight.action_plan))
          setInsightCreatedAt(insightsData.insight.created_at)
        } catch {
          // Reset if parsing fails
          setInsights([])
          setActionPlan([])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados")
    } finally {
      setIsLoading(false)
    }
  }, [clientSlug, promptId, periodFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleGenerateInsights() {
    setIsGeneratingInsights(true)
    setInsightsError(null)

    try {
      const response = await fetch(`/api/clients/${clientSlug}/prompts/${promptId}/insights`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar insights")
      }

      setInsights(data.insights || [])
      setActionPlan(data.actionPlan || [])
      setInsightCreatedAt(data.insight?.created_at || new Date().toISOString())
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Erro ao gerar insights")
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  async function handleRunTest() {
    setIsTesting(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${clientSlug}/prompts/${promptId}/test`, {
        method: "POST",
      })
      
      // Check content type before parsing
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("[v0] Non-JSON response:", text.substring(0, 200))
        throw new Error("Erro de servidor. Tente novamente em alguns segundos.")
      }
      
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error("[v0] JSON parse error:", parseError)
        throw new Error("Erro ao processar resposta. Tente novamente.")
      }

      if (!response.ok) {
        throw new Error(data.error || "Erro ao executar teste")
      }

      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar teste")
    } finally {
      setIsTesting(false)
    }
  }

  async function handleToggleStatus() {
    if (!prompt) return
    
    setIsTogglingStatus(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${clientSlug}/prompts/${promptId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !prompt.is_active }),
      })
      
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Erro de servidor. Tente novamente.")
      }
      
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao alterar status")
      }

      setPrompt({ ...prompt, is_active: !prompt.is_active })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar status")
    } finally {
      setIsTogglingStatus(false)
    }
  }

  function toggleTestExpanded(testId: string) {
    setExpandedTests(prev => {
      const next = new Set(prev)
      if (next.has(testId)) {
        next.delete(testId)
      } else {
        next.add(testId)
      }
      return next
    })
  }

  if (isLoading) {
return (
    <div className="space-y-6 p-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-7 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (error && !prompt) {
return (
    <div className="flex items-center justify-center min-h-[400px] px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full bg-destructive/5 border-destructive/20">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Erro ao carregar</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getSentimentConfig = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Positivo" }
      case "negative":
        return { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Negativo" }
      default:
        return { icon: Minus, color: "text-amber-500", bg: "bg-amber-500/10", label: "Neutro" }
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-500"
    if (score >= 40) return "text-amber-500"
    return "text-red-500"
  }

  const appearanceRate = summary && summary.total_tests > 0 
    ? (summary.tests_with_visibility / summary.total_tests) * 100 
    : 0

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          {!isClientUserView && (
            <Link href={`/${clientSlug}/prompts`}>
              <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">Monitoramento de Visibilidade</h1>
              {prompt && (
                <Badge 
                  variant="outline"
                  className={prompt.is_active 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
                    : "bg-muted text-muted-foreground"
                  }
                >
                  <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${prompt.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  {prompt.is_active ? "Monitoramento Ativo" : "Pausado"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <p className="text-sm">&ldquo;{prompt?.prompt}&rdquo;</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Filter */}
          <PeriodFilter
            value={periodFilter}
            onChange={setPeriodFilter}
            showComparison={true}
          />
          
          {/* Timer */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-full border border-primary/20">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Proximo teste:</span>
            <span className="font-mono font-semibold text-primary" suppressHydrationWarning>
              {countdown ?? "--:--:--"}
            </span>
          </div>

          {canManage && (
            <>
              <Button 
                variant="outline" 
                onClick={handleToggleStatus} 
                disabled={isTogglingStatus}
                className="rounded-full"
              >
                {isTogglingStatus ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : prompt?.is_active ? (
                  <PowerOff className="h-4 w-4 mr-2" />
                ) : (
                  <Power className="h-4 w-4 mr-2" />
                )}
                {prompt?.is_active ? "Pausar" : "Ativar"}
              </Button>
              <Button onClick={handleRunTest} disabled={isTesting} className="rounded-full">
                {isTesting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Testar Agora
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* View-only banner for client users */}
      {isClientUserView && (
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-teal-600 shrink-0" />
            <div>
              <p className="font-medium text-teal-700 text-sm">Modo Visualizacao</p>
              <p className="text-xs text-teal-600/80">
                Voce esta visualizando os analytics deste prompt. Acoes de gerenciamento estao desabilitadas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/${clientSlug}/prompts`}>
              <Button variant="outline" size="sm" className="gap-2">
                Ver Prompts
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" })
                  window.location.href = "/login"
                } catch {
                  window.location.href = "/login"
                }
              }}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-sm">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards - Visual Dashboard */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Visibilidade Card */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-indigo-500/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                <Eye className="h-4 w-4 text-blue-500" />
                <span>Visibilidade</span>
                <MetricTooltip
                  whatIs="Mede com que frequencia sua empresa aparece nas respostas da IA quando usuarios fazem perguntas sobre seu segmento."
                  purpose="Indica se sua marca esta sendo lembrada e recomendada. Maior visibilidade significa mais chances de ser descoberto por potenciais clientes."
                  calculation="(Testes onde foi mencionado / Total de testes) x 100"
                />
              </div>
              <div className="flex items-end justify-between">
                <div>
<div className="flex items-center gap-2">
                    <div className={`text-4xl font-bold tracking-tight ${getScoreColor(appearanceRate)}`}>
                      {appearanceRate.toFixed(0)}%
                    </div>
                    {comparisonSummary && (
                      <ComparisonIndicator 
                        current={appearanceRate} 
                        previous={comparisonSummary.total_tests > 0 
                          ? (comparisonSummary.tests_with_visibility / comparisonSummary.total_tests) * 100 
                          : 0
                        } 
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.tests_with_visibility} de {summary.total_tests} testes
                  </p>
                </div>
                <ScoreIndicator score={appearanceRate} size="sm" />
              </div>
              <Progress value={appearanceRate} className="mt-4 h-1.5" />
            </CardContent>
          </Card>

          {/* Reputacao Card */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                <Star className="h-4 w-4 text-amber-500" />
                <span>Reputacao</span>
                <MetricTooltip
                  whatIs="Avalia o tom e a qualidade com que sua empresa e apresentada nas respostas - se e recomendada positivamente ou apenas mencionada."
                  purpose="Indica a percepcao que a IA transmite sobre sua marca. Uma alta reputacao significa recomendacoes mais confiantes e favoraveis."
                  calculation="Analise de sentimento: presenca de palavras positivas, recomendacoes explicitas e destaque dado a empresa."
                />
              </div>
              <div className="flex items-end justify-between">
                <div>
<div className="flex items-center gap-2">
                    <div className={`text-4xl font-bold tracking-tight ${getScoreColor(summary.avg_reputation_score)}`}>
                      {summary.avg_reputation_score.toFixed(0)}%
                    </div>
                    {comparisonSummary && (
                      <ComparisonIndicator 
                        current={summary.avg_reputation_score} 
                        previous={comparisonSummary.avg_reputation_score} 
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nivel de confianca da IA
                  </p>
                </div>
                <ScoreIndicator score={summary.avg_reputation_score} size="sm" />
              </div>
              <Progress value={summary.avg_reputation_score} className="mt-4 h-1.5" />
            </CardContent>
          </Card>

          {/* Posicao Card */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-yellow-500/5 via-yellow-500/10 to-lime-500/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span>Posicao Media</span>
                <MetricTooltip
                  whatIs="Indica em que ordem sua empresa aparece quando a IA lista multiplas opcoes. Posicao 1 significa que voce foi a primeira opcao citada."
                  purpose="Quanto menor a posicao, maior a relevancia percebida. Empresas nas primeiras posicoes tendem a receber mais atencao dos usuarios."
                  calculation="Media das posicoes em que sua empresa aparece. Mostra tambem melhor e pior posicao alcancada."
                />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-bold tracking-tight">
                    {summary.avg_position_rank ? (
                      <span className={summary.avg_position_rank <= 3 ? "text-emerald-500" : summary.avg_position_rank <= 5 ? "text-amber-500" : "text-red-500"}>
                        {summary.avg_position_rank.toFixed(1)}°
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.best_position ? `Melhor: ${summary.best_position}°` : "Sem dados"}
                  </p>
                </div>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  summary.avg_position_rank && summary.avg_position_rank <= 3 
                    ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {summary.avg_position_rank ? `#${Math.round(summary.avg_position_rank)}` : "--"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shopping Card */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-teal-500/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                <ShoppingBag className="h-4 w-4 text-emerald-500" />
                <span>Vitrine</span>
                <MetricTooltip
                  whatIs="Mede se a IA exibe produtos da sua empresa em carroseis de compras ou areas de destaque visual nas respostas."
                  purpose="Produtos exibidos em vitrines visuais tem maior taxa de clique e conversao. Importante para e-commerces e varejo."
                  calculation="(Testes com produtos exibidos / Total de testes) x 100"
                />
              </div>
              <div className="flex items-end justify-between">
                <div>
<div className="flex items-center gap-2">
                    <div className={`text-4xl font-bold tracking-tight ${getScoreColor(summary.avg_shopping_score)}`}>
                      {summary.avg_shopping_score.toFixed(0)}%
                    </div>
                    {comparisonSummary && (
                      <ComparisonIndicator 
                        current={summary.avg_shopping_score} 
                        previous={comparisonSummary.avg_shopping_score} 
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.tests_with_shopping} de {summary.total_tests} testes
                  </p>
                </div>
                <ScoreIndicator score={summary.avg_shopping_score} size="sm" />
              </div>
              <Progress value={summary.avg_shopping_score} className="mt-4 h-1.5" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Search Queries Section */}
      {testHistory.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-blue-500" />
              <span>Queries de Busca da IA</span>
              <MetricTooltip
                whatIs="Lista de todas as queries (termos de busca) que a IA utilizou para encontrar informacoes sobre este prompt."
                purpose="Mostra exatamente o que a IA pesquisa quando recebe este tipo de pergunta, ajudando a entender como otimizar sua presenca online."
                calculation="Agregacao de todos os termos de busca identificados nos testes, ordenados por frequencia de uso."
              />
            </CardTitle>
            <CardDescription>
              Termos que a IA pesquisa ao responder este tipo de pergunta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Aggregate all search terms from test history
              const termCounts = new Map<string, number>()
              testHistory.forEach(test => {
                if (test.search_terms_used && Array.isArray(test.search_terms_used)) {
                  test.search_terms_used.forEach(term => {
                    const normalizedTerm = term.toLowerCase().trim()
                    termCounts.set(normalizedTerm, (termCounts.get(normalizedTerm) || 0) + 1)
                  })
                }
              })
              
              // Sort by frequency
              const sortedTerms = Array.from(termCounts.entries())
                .sort((a, b) => b[1] - a[1])
              
              if (sortedTerms.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma query de busca identificada ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Execute mais testes para coletar dados
                    </p>
                  </div>
                )
              }
              
              const maxCount = sortedTerms[0][1]
              
              return (
                <div className="space-y-4">
                  {/* Main queries grid */}
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {sortedTerms.slice(0, 9).map(([term, count], index) => {
                      const percentage = (count / testHistory.length) * 100
                      const isTopQuery = index < 3
                      
                      return (
                        <div 
                          key={term}
                          className={`relative p-4 rounded-xl border transition-all ${
                            isTopQuery 
                              ? "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20" 
                              : "bg-muted/30 hover:bg-muted/50"
                          }`}
                        >
                          {isTopQuery && (
                            <div className="absolute -top-2 -right-2">
                              <Badge className="bg-blue-500 text-white text-[10px] px-1.5">
                                Top {index + 1}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${
                              isTopQuery ? "bg-blue-500/20" : "bg-muted"
                            }`}>
                              <Search className={`h-4 w-4 ${isTopQuery ? "text-blue-500" : "text-muted-foreground"}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm truncate ${isTopQuery ? "text-foreground" : ""}`}>
                                &ldquo;{term}&rdquo;
                              </p>
                              
                              <div className="flex items-center gap-2 mt-2">
                                <Progress 
                                  value={(count / maxCount) * 100} 
                                  className="h-1 flex-1" 
                                />
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {count}x
                                </span>
                              </div>
                              
                              <p className="text-xs text-muted-foreground mt-1">
                                {percentage.toFixed(0)}% dos testes
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Additional queries if more than 9 */}
                  {sortedTerms.length > 9 && (
                    <div className="pt-4 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                        <Search className="h-3 w-3" />
                        Outras queries identificadas ({sortedTerms.length - 9})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {sortedTerms.slice(9).map(([term, count]) => (
                          <Badge 
                            key={term} 
                            variant="secondary" 
                            className="text-xs font-normal py-1 px-2"
                          >
                            {term}
                            <span className="ml-1.5 text-muted-foreground">({count}x)</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Insight box */}
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20 shrink-0">
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Dica de Otimizacao
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sortedTerms.length > 0 
                            ? `A query "${sortedTerms[0][0]}" e a mais usada pela IA. Certifique-se de que seu site e conteudo estao otimizados para este termo e suas variacoes.`
                            : "Execute mais testes para identificar padroes nas queries de busca."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Google My Business & Maps Section */}
      {testHistory.length > 0 && (
        <div className="rounded-xl border-0 shadow-sm overflow-hidden bg-card">
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-b p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 shadow-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span>Google Meu Negocio & Maps</span>
              <MetricTooltip
                whatIs="Informacoes completas do Google Meu Negocio e Maps, incluindo localizacao, avaliacoes e presenca local."
                purpose="Mostra como a empresa aparece nas buscas locais do Google e qual sua reputacao baseada em avaliacoes de clientes."
                calculation="Dados coletados dos testes de IA que simulam buscas no Google."
              />
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5">
              Presenca local, avaliacoes e informacoes do Google
            </p>
          </div>
          <div>
            {(() => {
              // Find the most recent test with Google Business data
              const testWithGMB = testHistory.find(test => 
                test.analysis_metadata?.google_business?.found === true
              )
              
              const gmb = testWithGMB?.analysis_metadata?.google_business
              
              // Aggregate GMB data from all tests
              const allGMBTests = testHistory.filter(t => t.analysis_metadata?.google_business?.found)
              const gmbFoundRate = testHistory.length > 0 
                ? (allGMBTests.length / testHistory.length) * 100 
                : 0
              
              // Collect all reviews from all tests with helpful count
              const allReviews: Array<{author: string; rating: number; text: string; date: string; helpful_count?: number}> = []
              testHistory.forEach(test => {
                const reviews = test.analysis_metadata?.google_business?.recent_reviews
                if (reviews && Array.isArray(reviews)) {
                  reviews.forEach(review => {
                    const isDuplicate = allReviews.some(r => 
                      r.author === review.author && r.text === review.text
                    )
                    if (!isDuplicate) {
                      allReviews.push(review)
                    }
                  })
                }
              })
              
              // Sort reviews by helpful count
              allReviews.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0))
              
              if (!gmb) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <div className="p-4 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 mb-4">
                      <MapPin className="h-10 w-10 text-amber-500/50" />
                    </div>
                    <p className="text-base font-medium text-muted-foreground mb-2">
                      Nenhum perfil do Google Meu Negocio identificado
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      A IA nao encontrou um perfil do Google Meu Negocio para esta empresa nas buscas realizadas. 
                      Isso pode indicar que o perfil nao existe ou nao esta otimizado para este tipo de busca.
                    </p>
                    <Button variant="outline" className="mt-4 gap-2" asChild>
                      <a href="https://business.google.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Criar perfil no Google Meu Negocio
                      </a>
                    </Button>
                  </div>
                )
              }
              
              return (
                <div className="divide-y">
                  {/* Hero Section - Business Overview */}
                  <div className="p-6 bg-gradient-to-br from-background to-amber-500/5">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Left - Business Card */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 shadow-lg shrink-0">
                            <Building2 className="h-8 w-8 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-bold truncate">
                                {gmb.name || client?.name}
                              </h3>
                              {gmb.price_level && (
                                <Badge variant="secondary" className="text-xs font-medium">
                                  {gmb.price_level}
                                </Badge>
                              )}
                            </div>
                            {gmb.category && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {gmb.category}
                              </p>
                            )}
                            
                            {/* Rating Display */}
                            {gmb.rating && (
                              <div className="flex items-center gap-3 mt-3">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                  <span className="font-bold text-lg text-amber-600">
                                    {gmb.rating.toFixed(1)}
                                  </span>
                                </div>
                                {gmb.total_reviews && (
                                  <span className="text-sm text-muted-foreground">
                                    {gmb.total_reviews.toLocaleString()} avaliacoes
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-2 mt-4">
                              {gmb.maps_url && (
                                <Button size="sm" variant="outline" className="gap-2" asChild>
                                  <a href={gmb.maps_url} target="_blank" rel="noopener noreferrer">
                                    <MapPin className="h-3.5 w-3.5" />
                                    Ver no Maps
                                  </a>
                                </Button>
                              )}
                              {gmb.website && (
                                <Button size="sm" variant="outline" className="gap-2" asChild>
                                  <a href={gmb.website} target="_blank" rel="noopener noreferrer">
                                    <Globe className="h-3.5 w-3.5" />
                                    Site
                                  </a>
                                </Button>
                              )}
                              {gmb.phone && (
                                <Button size="sm" variant="outline" className="gap-2" asChild>
                                  <a href={`tel:${gmb.phone}`}>
                                    <Phone className="h-3.5 w-3.5" />
                                    Ligar
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right - Stats Summary */}
                      <div className="lg:w-72 grid grid-cols-2 lg:grid-cols-1 gap-3">
                        <div className="p-3 rounded-xl bg-background border">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Presenca nos Testes</span>
                            <span className="text-sm font-bold text-emerald-600">{gmbFoundRate.toFixed(0)}%</span>
                          </div>
                          <Progress value={gmbFoundRate} className="h-1.5 mt-2" />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {allGMBTests.length}/{testHistory.length} testes
                          </p>
                        </div>
                        
                        {gmb.photos_count && (
                          <div className="p-3 rounded-xl bg-background border">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Fotos</span>
                            </div>
                            <p className="text-lg font-bold mt-1">{gmb.photos_count}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact & Location Info */}
                  <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {gmb.address && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border">
                        <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                          <MapPin className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Endereco</p>
                          <p className="text-sm">{gmb.address}</p>
                          {gmb.coordinates && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {gmb.coordinates.lat.toFixed(4)}, {gmb.coordinates.lng.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {gmb.phone && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border">
                        <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                          <Phone className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Telefone</p>
                          <p className="text-sm font-medium">{gmb.phone}</p>
                        </div>
                      </div>
                    )}
                    
                    {gmb.hours && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border">
                        <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                          <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Horario</p>
                          <p className="text-sm">{gmb.hours}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Rating Breakdown */}
                  {gmb.rating_breakdown && (
                    <div className="p-6">
                      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-amber-500" />
                        Distribuicao de Avaliacoes
                      </h4>
                      <div className="grid gap-2 max-w-md">
                        {[
                          { stars: 5, percent: gmb.rating_breakdown.five_star, color: "bg-emerald-500" },
                          { stars: 4, percent: gmb.rating_breakdown.four_star, color: "bg-green-500" },
                          { stars: 3, percent: gmb.rating_breakdown.three_star, color: "bg-amber-500" },
                          { stars: 2, percent: gmb.rating_breakdown.two_star, color: "bg-orange-500" },
                          { stars: 1, percent: gmb.rating_breakdown.one_star, color: "bg-red-500" },
                        ].map((item) => (
                          <div key={item.stars} className="flex items-center gap-3">
                            <div className="flex items-center gap-1 w-12 shrink-0">
                              <span className="text-sm font-medium">{item.stars}</span>
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            </div>
                            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${item.color} rounded-full transition-all`}
                                style={{ width: `${item.percent}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {item.percent}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Reviews Section - Only Ratings */}
                  {allReviews.length > 0 && (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-500" />
                          Avaliacoes Recentes ({allReviews.length})
                        </h4>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {allReviews.slice(0, 12).map((review, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                          >
                            <span className="text-xs font-medium truncate max-w-24">
                              {review.author}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= review.rating
                                      ? "text-amber-500 fill-amber-500"
                                      : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {allReviews.length > 6 && (
                        <p className="text-xs text-muted-foreground text-center mt-4">
                          +{allReviews.length - 6} avaliacoes adicionais encontradas nos testes
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Insight Box */}
                  <div className="p-6 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-background/80 border border-amber-500/20">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow shrink-0">
                        <Lightbulb className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold mb-1">
                          Dica de Otimizacao
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {gmb.rating && gmb.rating >= 4.5
                            ? "Excelente nota! Continue incentivando clientes satisfeitos a deixarem avaliacoes. Responda a todas as avaliacoes para aumentar o engajamento."
                            : gmb.rating && gmb.rating >= 4.0
                            ? "Boa nota! Responda as avaliacoes negativas de forma profissional e rapida. Adicione fotos atualizadas ao seu perfil para aumentar a atratividade."
                            : gmb.rating
                            ? "Sua nota pode melhorar. Foque em resolver os problemas apontados nas avaliacoes negativas. Incentive clientes satisfeitos a avaliar com follow-up pos-atendimento."
                            : "Mantenha seu perfil do Google Meu Negocio atualizado com fotos, horarios e informacoes de contato para melhorar sua visibilidade nas buscas locais."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Shopping Products Section */}
      {testHistory.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500/5 to-pink-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-purple-500" />
              <span>Produtos em Vitrine</span>
              <MetricTooltip
                whatIs="Produtos que apareceram na vitrine/carousel de shopping do Google quando a IA realizou buscas relacionadas a este prompt."
                purpose="Identifica quais produtos e lojas estao dominando a vitrine de shopping para este tipo de busca."
                calculation="Agregacao de todos os produtos encontrados nas vitrines durante os testes."
              />
            </CardTitle>
            <CardDescription>
              Produtos exibidos nas buscas relacionadas ao prompt
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Aggregate all products from test history
              const allProducts: Array<{
                name: string
                price?: string
                brand?: string
                store?: string
                url?: string
                rating?: number
                reviews_count?: number
                appearances: number
              }> = []
              
              // Count tests with shopping presence
              const testsWithShopping = testHistory.filter(t => t.shopping_presence === true).length
              const shoppingRate = testHistory.length > 0 
                ? (testsWithShopping / testHistory.length) * 100 
                : 0
              
              // Aggregate products
              testHistory.forEach(test => {
                const products = (test as any).shopping_products
                if (products && Array.isArray(products)) {
                  products.forEach((product: any) => {
                    const existingProduct = allProducts.find(p => 
                      p.name.toLowerCase() === product.name?.toLowerCase() &&
                      p.store?.toLowerCase() === product.store?.toLowerCase()
                    )
                    if (existingProduct) {
                      existingProduct.appearances++
                    } else {
                      allProducts.push({
                        name: product.name || "Produto",
                        price: product.price || null,
                        brand: product.brand || null,
                        store: product.store || null,
                        url: product.url || null,
                        rating: product.rating || null,
                        reviews_count: product.reviews_count || null,
                        appearances: 1
                      })
                    }
                  })
                }
              })
              
              // Sort by appearances
              allProducts.sort((a, b) => b.appearances - a.appearances)
              
              // Group products by store
              const productsByStore = new Map<string, typeof allProducts>()
              allProducts.forEach(product => {
                const store = product.store || "Outras Lojas"
                if (!productsByStore.has(store)) {
                  productsByStore.set(store, [])
                }
                productsByStore.get(store)!.push(product)
              })
              
              // Check if client's store is in the products
              const clientStoreName = client?.name?.toLowerCase() || ""
              const clientSite = client?.site?.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') || ""
              const clientProducts = allProducts.filter(p => {
                const store = (p.store || "").toLowerCase()
                const url = (p.url || "").toLowerCase()
                return store.includes(clientStoreName) || 
                       url.includes(clientSite) ||
                       store.includes(clientSite)
              })
              
              if (allProducts.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum produto em vitrine identificado ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {testsWithShopping === 0 
                        ? "Nenhum teste mostrou vitrine de shopping para este prompt"
                        : "Execute mais testes para coletar dados"
                      }
                    </p>
                  </div>
                )
              }
              
              return (
                <div className="space-y-6">
                  {/* Stats Summary */}
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Vitrine Exibida
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-purple-600">{shoppingRate.toFixed(0)}%</span>
                        <span className="text-xs text-muted-foreground">
                          ({testsWithShopping}/{testHistory.length} testes)
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Package className="h-3.5 w-3.5" />
                        Produtos Unicos
                      </div>
                      <span className="text-2xl font-bold">{allProducts.length}</span>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Store className="h-3.5 w-3.5" />
                        Lojas na Vitrine
                      </div>
                      <span className="text-2xl font-bold">{productsByStore.size}</span>
                    </div>
                  </div>
                  
                  {/* Client Products Alert */}
                  {clientProducts.length > 0 ? (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/20 shrink-0">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            Seus produtos estao na vitrine!
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {clientProducts.length} produto(s) de {client?.name} apareceram na vitrine de shopping.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            Seus produtos nao estao na vitrine
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Nenhum produto de {client?.name} apareceu na vitrine de shopping para este tipo de busca.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Products Grid */}
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Top Produtos na Vitrine ({Math.min(allProducts.length, 12)})
                    </h5>
                    
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {allProducts.slice(0, 12).map((product, index) => {
                        const isClientProduct = clientProducts.includes(product)
                        const isTopProduct = index < 3
                        
                        return (
                          <div 
                            key={`${product.name}-${product.store}-${index}`}
                            className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                              isClientProduct 
                                ? "bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30" 
                                : isTopProduct
                                ? "bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20"
                                : "bg-muted/20"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate" title={product.name}>
                                  {product.name}
                                </p>
                                {product.brand && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {product.brand}
                                  </p>
                                )}
                              </div>
                              {isTopProduct && (
                                <Badge className="bg-purple-500 text-white text-[10px] shrink-0">
                                  Top {index + 1}
                                </Badge>
                              )}
                              {isClientProduct && (
                                <Badge className="bg-emerald-500 text-white text-[10px] shrink-0">
                                  Seu
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-1.5 mt-3">
                              {product.price && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-semibold text-emerald-600">
                                    {product.price}
                                  </span>
                                </div>
                              )}
                              
                              {product.store && (
                                <div className="flex items-center gap-2">
                                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground truncate">
                                    {product.store}
                                  </span>
                                </div>
                              )}
                              
                              {product.rating && (
                                <div className="flex items-center gap-2">
                                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                  <span className="text-xs">
                                    {product.rating.toFixed(1)}
                                    {product.reviews_count && (
                                      <span className="text-muted-foreground ml-1">
                                        ({product.reviews_count.toLocaleString()})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-[10px] text-muted-foreground">
                                  Apareceu {product.appearances}x nos testes
                                </span>
                              </div>
                            </div>
                            
                            {product.url && (
                              <a 
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 flex items-center justify-center gap-1 p-2 rounded-lg bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Ver produto
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {allProducts.length > 12 && (
                      <p className="text-xs text-muted-foreground text-center mt-4">
                        +{allProducts.length - 12} produtos adicionais encontrados
                      </p>
                    )}
                  </div>
                  
                  {/* Stores Summary */}
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Lojas na Vitrine
                    </h5>
                    
                    <div className="flex flex-wrap gap-2">
                      {Array.from(productsByStore.entries())
                        .sort((a, b) => b[1].length - a[1].length)
                        .slice(0, 15)
                        .map(([store, products]) => {
                          const isClientStore = store.toLowerCase().includes(clientStoreName) ||
                            store.toLowerCase().includes(clientSite)
                          
                          return (
                            <Badge 
                              key={store}
                              variant={isClientStore ? "default" : "secondary"}
                              className={`text-xs py-1.5 px-3 ${
                                isClientStore ? "bg-emerald-500 hover:bg-emerald-600" : ""
                              }`}
                            >
                              {store}
                              <span className="ml-1.5 opacity-70">
                                ({products.length})
                              </span>
                            </Badge>
                          )
                        })}
                    </div>
                  </div>
                  
                  {/* Insight */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20 shrink-0">
                        <Lightbulb className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Dica de Otimizacao
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {clientProducts.length > 0
                            ? `Seus produtos estao aparecendo! Para melhorar a posicao, garanta que seus produtos tenham avaliacoes positivas, precos competitivos e imagens de alta qualidade.`
                            : shoppingRate > 50
                            ? `A vitrine de shopping aparece em ${shoppingRate.toFixed(0)}% das buscas, mas seus produtos nao estao la. Considere cadastrar seus produtos no Google Shopping e otimizar os feeds de produtos.`
                            : `A vitrine de shopping aparece em apenas ${shoppingRate.toFixed(0)}% das buscas. Este tipo de prompt pode nao ser ideal para shopping ads.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Sentiment Analysis Section */}
      {testHistory.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-500/5 to-violet-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-indigo-500" />
              <span>Analise de Sentimento</span>
              <MetricTooltip
                whatIs="Analise das palavras e sentimentos que a IA associa a empresa do cliente nas respostas."
                purpose="Identifica a percepcao geral da IA sobre a empresa, destacando pontos fortes e fracos na comunicacao."
                calculation="Agregacao de todas as palavras de sentimento coletadas nos testes, com tamanho proporcional a frequencia e intensidade."
              />
            </CardTitle>
            <CardDescription>
              Como a IA percebe e descreve a empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Aggregate all sentiment words from test history
              const wordCounts = new Map<string, { 
                count: number
                sentiment: "positive" | "neutral" | "negative"
                totalIntensity: number
              }>()
              
              // Count overall sentiments
              let positiveCount = 0
              let neutralCount = 0
              let negativeCount = 0
              
              testHistory.forEach(test => {
                // Count overall sentiment
                const sentiment = test.analysis_metadata?.sentiment
                if (sentiment === "positive") positiveCount++
                else if (sentiment === "negative") negativeCount++
                else neutralCount++
                
                // Collect sentiment words
                const words = test.analysis_metadata?.sentiment_words
                if (words && Array.isArray(words)) {
                  words.forEach((w: any) => {
                    const word = String(w.word || "").toLowerCase().trim()
                    if (!word) return
                    
                    const existing = wordCounts.get(word)
                    if (existing) {
                      existing.count++
                      existing.totalIntensity += (w.intensity || 5)
                    } else {
                      wordCounts.set(word, {
                        count: 1,
                        sentiment: w.sentiment || "neutral",
                        totalIntensity: w.intensity || 5
                      })
                    }
                  })
                }
              })
              
              // Convert to array and sort by frequency * intensity
              const sortedWords = Array.from(wordCounts.entries())
                .map(([word, data]) => ({
                  word,
                  count: data.count,
                  sentiment: data.sentiment,
                  avgIntensity: data.totalIntensity / data.count,
                  score: data.count * (data.totalIntensity / data.count)
                }))
                .sort((a, b) => b.score - a.score)
              
              const totalTests = testHistory.length
              const positivePercent = totalTests > 0 ? (positiveCount / totalTests) * 100 : 0
              const neutralPercent = totalTests > 0 ? (neutralCount / totalTests) * 100 : 0
              const negativePercent = totalTests > 0 ? (negativeCount / totalTests) * 100 : 0
              
              // Determine overall sentiment
              const overallSentiment = positiveCount > negativeCount && positiveCount > neutralCount
                ? "positive"
                : negativeCount > positiveCount && negativeCount > neutralCount
                ? "negative"
                : "neutral"
              
              if (sortedWords.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Heart className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum dado de sentimento coletado ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Execute mais testes para coletar dados de sentimento
                    </p>
                  </div>
                )
              }
              
              // Calculate max score for sizing
              const maxScore = sortedWords[0]?.score || 1
              
              // Get color based on sentiment
              const getSentimentColor = (sentiment: string) => {
                switch (sentiment) {
                  case "positive": return "text-emerald-600 dark:text-emerald-400"
                  case "negative": return "text-red-500 dark:text-red-400"
                  default: return "text-amber-500 dark:text-amber-400"
                }
              }
              
              const getSentimentBg = (sentiment: string) => {
                switch (sentiment) {
                  case "positive": return "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
                  case "negative": return "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                  default: return "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
                }
              }
              
              return (
                <div className="space-y-6">
                  {/* Overall Sentiment Summary */}
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className={`p-4 rounded-xl border ${
                      overallSentiment === "positive" 
                        ? "bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30" 
                        : overallSentiment === "negative"
                        ? "bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/30"
                        : "bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/30"
                    }`}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Heart className="h-3.5 w-3.5" />
                        Sentimento Geral
                      </div>
                      <p className={`text-lg font-bold ${
                        overallSentiment === "positive" 
                          ? "text-emerald-600" 
                          : overallSentiment === "negative"
                          ? "text-red-500"
                          : "text-amber-500"
                      }`}>
                        {overallSentiment === "positive" ? "Positivo" : overallSentiment === "negative" ? "Negativo" : "Neutro"}
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        Positivo
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">{positivePercent.toFixed(0)}%</span>
                        <span className="text-xs text-muted-foreground">({positiveCount} testes)</span>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Minus className="h-3.5 w-3.5 text-amber-500" />
                        Neutro
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-500">{neutralPercent.toFixed(0)}%</span>
                        <span className="text-xs text-muted-foreground">({neutralCount} testes)</span>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        Negativo
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-red-500">{negativePercent.toFixed(0)}%</span>
                        <span className="text-xs text-muted-foreground">({negativeCount} testes)</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Word Cloud */}
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                      <Cloud className="h-4 w-4" />
                      Nuvem de Palavras
                    </h5>
                    
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-6 rounded-xl bg-muted/10 min-h-[200px]">
                      {sortedWords.slice(0, 25).map((item, index) => {
                        // Calculate font size based on score (min 0.85rem, max 2.5rem)
                        const sizeRatio = item.score / maxScore
                        const fontSize = 0.85 + (sizeRatio * 1.65)
                        const fontWeight = sizeRatio > 0.6 ? 700 : sizeRatio > 0.3 ? 600 : 500
                        
                        return (
                          <span
                            key={item.word}
                            className={`transition-all cursor-default hover:scale-110 ${getSentimentColor(item.sentiment)}`}
                            style={{ 
                              fontSize: `${fontSize}rem`,
                              fontWeight,
                              opacity: 0.75 + (sizeRatio * 0.25)
                            }}
                            title={`"${item.word}" - ${item.sentiment === "positive" ? "Positivo" : item.sentiment === "negative" ? "Negativo" : "Neutro"} | Apareceu ${item.count}x | Intensidade media: ${item.avgIntensity.toFixed(1)}`}
                          >
                            {item.word}
                          </span>
                        )
                      })}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-xs text-muted-foreground">Positivo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-xs text-muted-foreground">Neutro</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-xs text-muted-foreground">Negativo</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Top Words by Sentiment */}
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Positive Words */}
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <h6 className="text-sm font-medium text-emerald-600 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Palavras Positivas
                      </h6>
                      <div className="flex flex-wrap gap-2">
                        {sortedWords
                          .filter(w => w.sentiment === "positive")
                          .slice(0, 8)
                          .map(item => (
                            <Badge 
                              key={item.word}
                              className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            >
                              {item.word}
                              <span className="ml-1 opacity-60">({item.count})</span>
                            </Badge>
                          ))}
                        {sortedWords.filter(w => w.sentiment === "positive").length === 0 && (
                          <p className="text-xs text-muted-foreground">Nenhuma palavra positiva encontrada</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Neutral Words */}
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <h6 className="text-sm font-medium text-amber-600 mb-3 flex items-center gap-2">
                        <Minus className="h-4 w-4" />
                        Palavras Neutras
                      </h6>
                      <div className="flex flex-wrap gap-2">
                        {sortedWords
                          .filter(w => w.sentiment === "neutral")
                          .slice(0, 8)
                          .map(item => (
                            <Badge 
                              key={item.word}
                              className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            >
                              {item.word}
                              <span className="ml-1 opacity-60">({item.count})</span>
                            </Badge>
                          ))}
                        {sortedWords.filter(w => w.sentiment === "neutral").length === 0 && (
                          <p className="text-xs text-muted-foreground">Nenhuma palavra neutra encontrada</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Negative Words */}
                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                      <h6 className="text-sm font-medium text-red-500 mb-3 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Palavras Negativas
                      </h6>
                      <div className="flex flex-wrap gap-2">
                        {sortedWords
                          .filter(w => w.sentiment === "negative")
                          .slice(0, 8)
                          .map(item => (
                            <Badge 
                              key={item.word}
                              className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
                            >
                              {item.word}
                              <span className="ml-1 opacity-60">({item.count})</span>
                            </Badge>
                          ))}
                        {sortedWords.filter(w => w.sentiment === "negative").length === 0 && (
                          <p className="text-xs text-muted-foreground">Nenhuma palavra negativa encontrada</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Insight */}
                  <div className={`p-4 rounded-xl border ${
                    overallSentiment === "positive" 
                      ? "bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/20" 
                      : overallSentiment === "negative"
                      ? "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/20"
                      : "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        overallSentiment === "positive" 
                          ? "bg-emerald-500/20" 
                          : overallSentiment === "negative"
                          ? "bg-red-500/20"
                          : "bg-amber-500/20"
                      }`}>
                        <Lightbulb className={`h-4 w-4 ${
                          overallSentiment === "positive" 
                            ? "text-emerald-600" 
                            : overallSentiment === "negative"
                            ? "text-red-500"
                            : "text-amber-600"
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Analise de Sentimento
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {overallSentiment === "positive"
                            ? `A IA tem uma percepcao predominantemente positiva da empresa. As palavras mais frequentes indicam ${sortedWords.filter(w => w.sentiment === "positive").slice(0, 3).map(w => w.word).join(", ")}. Continue fortalecendo esses aspectos na comunicacao.`
                            : overallSentiment === "negative"
                            ? `A percepcao da IA e predominantemente negativa. As palavras ${sortedWords.filter(w => w.sentiment === "negative").slice(0, 3).map(w => w.word).join(", ")} aparecem com frequencia. Trabalhe esses pontos para melhorar a reputacao.`
                            : `A percepcao e neutra, sem fortes indicacoes positivas ou negativas. Para se destacar, foque em construir uma identidade mais marcante com diferenciais claros.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Sources Section */}
      {testHistory.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-emerald-500" />
              <span>Fontes Consultadas pela IA</span>
              <MetricTooltip
                whatIs="Lista de todas as fontes (sites, artigos, etc) que a IA consulta para responder perguntas sobre este prompt."
                purpose="Identifica quais sites sao mais relevantes para este tipo de busca e se as paginas do seu site estao entre as fontes."
                calculation="Agregacao de todas as fontes citadas nos testes, ordenadas por frequencia de aparicao."
              />
            </CardTitle>
            <CardDescription>
              Sites e paginas que a IA utiliza como referencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Sort Filter */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Ordenar:</span>
              </div>
              <ToggleGroup 
                type="single" 
                value={sourceSortOrder} 
                onValueChange={(value) => value && setSourceSortOrder(value as "desc" | "asc")}
                className="bg-background rounded-md border"
              >
                <ToggleGroupItem value="desc" aria-label="Mais citadas" className="text-xs px-3 gap-1.5">
                  <ArrowDown className="h-3.5 w-3.5" />
                  Mais citadas
                </ToggleGroupItem>
                <ToggleGroupItem value="asc" aria-label="Menos citadas" className="text-xs px-3 gap-1.5">
                  <ArrowUp className="h-3.5 w-3.5" />
                  Menos citadas
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            {(() => {
              // Aggregate all sources from test history
              const sourceCounts = new Map<string, number>()
              testHistory.forEach(test => {
                if (test.sources_cited && Array.isArray(test.sources_cited)) {
                  test.sources_cited.forEach(source => {
                    const normalizedSource = source.toLowerCase().trim()
                    sourceCounts.set(normalizedSource, (sourceCounts.get(normalizedSource) || 0) + 1)
                  })
                }
              })
              
              // Sort by frequency based on selected order
              const sortedSources = Array.from(sourceCounts.entries())
                .sort((a, b) => sourceSortOrder === "desc" ? b[1] - a[1] : a[1] - b[1])
              
              // Separate client site pages from external sources
              const clientSite = client?.site?.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') || ''
              const clientPages: Array<[string, number]> = []
              const externalSources: Array<[string, number]> = []
              
              sortedSources.forEach(([source, count]) => {
                const sourceDomain = source.toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
                if (clientSite && (sourceDomain.includes(clientSite) || clientSite.includes(sourceDomain))) {
                  clientPages.push([source, count])
                } else {
                  externalSources.push([source, count])
                }
              })
              
              if (sortedSources.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma fonte identificada ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Execute mais testes para coletar dados
                    </p>
                  </div>
                )
              }
              
              const maxCount = sortedSources[0][1]
              
              // Helper to extract domain from URL
              const getDomain = (url: string) => {
                try {
                  const domain = url.replace(/^https?:\/\//, '').split('/')[0]
                  return domain
                } catch {
                  return url
                }
              }
              
              // Helper to get favicon
              const getFaviconUrl = (url: string) => {
                const domain = getDomain(url)
                return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
              }
              
              return (
                <div className="space-y-6">
                  {/* Client Site Pages Section */}
                  {clientPages.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20">
                          <FileText className="h-4 w-4 text-emerald-500" />
                        </div>
                        <h5 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          Paginas do Seu Site ({clientPages.length})
                        </h5>
                        <Badge className="bg-emerald-500 text-white text-[10px]">
                          Seu conteudo
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2">
                        {clientPages.map(([source, count], index) => {
                          const percentage = (count / testHistory.length) * 100
                          
                          return (
                            <div 
                              key={source}
                              className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                            >
                              <div className="p-2 rounded-lg bg-emerald-500/20 shrink-0">
                                <Link2 className="h-4 w-4 text-emerald-600" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-emerald-700 dark:text-emerald-300">
                                  {source}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Progress 
                                    value={(count / maxCount) * 100} 
                                    className="h-1 flex-1 max-w-32" 
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {count}x ({percentage.toFixed(0)}% dos testes)
                                  </span>
                                </div>
                              </div>
                              
                              <a 
                                href={source.startsWith('http') ? source : `https://${source}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-emerald-500/20 transition-colors shrink-0"
                              >
                                <ExternalLink className="h-4 w-4 text-emerald-600" />
                              </a>
                            </div>
                          )
                        })}
                      </div>
                      
                      {clientPages.length === 0 && (
                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                Seu site nao esta sendo citado
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Nenhuma pagina do seu site ({client?.site}) apareceu nas fontes consultadas. Otimize seu conteudo para melhorar sua presenca.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* External Sources Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-muted">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h5 className="text-sm font-semibold">
                        Fontes Externas ({externalSources.length})
                      </h5>
                    </div>
                    
                    <div className="grid gap-2 md:grid-cols-2">
                      {externalSources.slice(0, 10).map(([source, count], index) => {
                        const percentage = (count / testHistory.length) * 100
                        const isTopSource = index < 3
                        const domain = getDomain(source)
                        
                        return (
                          <div 
                            key={source}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              isTopSource 
                                ? "bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border-blue-500/20 hover:border-blue-500/40" 
                                : "bg-muted/30 hover:bg-muted/50"
                            }`}
                          >
                            {/* Favicon */}
                            <div className="relative shrink-0">
                              <img 
                                src={getFaviconUrl(source)}
                                alt=""
                                className="w-8 h-8 rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                              {isTopSource && (
                                <div className="absolute -top-1 -right-1">
                                  <Badge className="bg-blue-500 text-white text-[8px] px-1 h-4">
                                    #{index + 1}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" title={source}>
                                {domain}
                              </p>
                              <p className="text-xs text-muted-foreground truncate" title={source}>
                                {source.replace(/^https?:\/\/[^\/]+/, '').substring(0, 50) || '/'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {count}x ({percentage.toFixed(0)}%)
                                </span>
                              </div>
                            </div>
                            
                            <a 
                              href={source.startsWith('http') ? source : `https://${source}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-muted transition-colors shrink-0"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Additional sources if more than 10 */}
                    {externalSources.length > 10 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Outras fontes ({externalSources.length - 10})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {externalSources.slice(10).map(([source, count]) => (
                            <Badge 
                              key={source} 
                              variant="secondary" 
                              className="text-xs font-normal py-1"
                            >
                              {getDomain(source)}
                              <span className="ml-1 text-muted-foreground">({count}x)</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* No client pages warning */}
                  {clientPages.length === 0 && client?.site && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">
                            Seu site nao esta nas fontes
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Nenhuma pagina de <span className="font-medium">{client.site}</span> foi citada como fonte pela IA. 
                            Isso pode indicar que seu conteudo precisa ser otimizado para este tipo de busca.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Insight box */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/20 shrink-0">
                        <Lightbulb className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Dica de Otimizacao
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {clientPages.length > 0
                            ? `Otimo! ${clientPages.length} pagina(s) do seu site estao sendo citadas. Continue criando conteudo relevante para aumentar sua presenca nas respostas da IA.`
                            : externalSources.length > 0
                            ? `A fonte mais citada e "${getDomain(externalSources[0][0])}". Analise o conteudo dessas fontes e crie conteudo similar ou melhor para competir por essas citacoes.`
                            : "Execute mais testes para identificar as fontes mais relevantes para este tipo de busca."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Competitor Comparison */}
      {summary && trackedCompetitors.length > 0 && (
        <Card className="border-0 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span>Comparacao com Concorrentes</span>
              <MetricTooltip
                whatIs="Tabela comparativa entre sua empresa e os concorrentes que voce adicionou a lista de monitoramento."
                purpose="Permite visualizar rapidamente quem esta ganhando mais visibilidade e identificar oportunidades de melhoria."
                calculation="Compara aparicoes e posicoes de cada empresa nos testes realizados."
              />
            </CardTitle>
            <CardDescription>
              Acompanhe sua posicao em relacao aos concorrentes monitorados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-background/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Empresa</TableHead>
                    <TableHead className="text-center font-semibold">Aparicoes</TableHead>
                    <TableHead className="text-center font-semibold">Taxa</TableHead>
                    <TableHead className="text-center font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-primary/5 hover:bg-primary/10">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-primary/10">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {client?.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{client?.name}</span>
                          <Badge variant="secondary" className="ml-2 text-[10px] bg-primary/10 text-primary border-0">
                            Voce
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{summary.tests_with_visibility}</span>
                      <span className="text-muted-foreground text-sm">/{summary.total_tests}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${getScoreColor(appearanceRate)}`}>
                        {appearanceRate.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-primary/10 text-primary border-0">
                        Referencia
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {trackedCompetitors.map((competitor) => {
                    const competitorCount = summary.top_competitors?.[competitor.name] || 0
                    const competitorRate = summary.total_tests > 0 ? (competitorCount / summary.total_tests) * 100 : 0
                    const isClientBetter = appearanceRate >= competitorRate

                    return (
                      <TableRow key={competitor.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 bg-muted">
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {competitor.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{competitor.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold">{competitorCount}</span>
                          <span className="text-muted-foreground text-sm">/{summary.total_tests}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${getScoreColor(competitorRate)}`}>
                            {competitorRate.toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {competitorCount > 0 ? (
                            isClientBetter ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Voce lidera
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                Atencao
                              </Badge>
                            )
                          ) : (
                            <Badge variant="secondary" className="text-muted-foreground">
                              Nao detectado
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Baseado em {summary.total_tests} teste(s) realizados
              </p>
              <Link href={`/${clientSlug}/concorrentes`}>
                <Button variant="ghost" size="sm" className="text-xs">
                  Gerenciar Concorrentes
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking de Concorrentes Detectados */}
      {summary && Object.keys(summary.top_competitors || {}).length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                <span>Ranking de Concorrentes</span>
                <MetricTooltip
                  whatIs="Lista de todas as empresas que a IA menciona nas respostas para este prompt, ordenadas por frequencia de aparicao."
                  purpose="Identifica quem sao seus principais concorrentes neste tipo de busca e com que frequencia eles aparecem."
                  calculation="Contagem de aparicoes de cada empresa dividida pelo total de testes realizados."
                />
              </CardTitle>
              <CardDescription>
                Empresas mais mencionadas nas respostas da IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summary.top_competitors)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([competitor, count], index) => {
                    const isTracked = trackedCompetitors.some(c => c.name.toLowerCase() === competitor.toLowerCase())
                    const rate = summary.total_tests > 0 ? (count / summary.total_tests) * 100 : 0
                    
                    return (
                      <div key={competitor} className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < 3 
                            ? "bg-amber-500/10 text-amber-600" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{competitor}</span>
                            {isTracked && (
                              <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/5 text-primary border-primary/20">
                                Monitorado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={rate} className="h-1 flex-1" />
                            <span className="text-xs text-muted-foreground w-12 text-right">{rate.toFixed(0)}%</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {count}x
                        </Badge>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Metadados de Busca */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-primary" />
                <span>Metadados de Busca</span>
                <MetricTooltip
                  whatIs="Informacoes tecnicas sobre como a IA processa e responde a este tipo de pergunta."
                  purpose="Entenda se sua empresa performa melhor em buscas web gerais ou em buscas locais (Google Maps, etc)."
                  calculation="Web Score: performance em buscas gerais. Local Score: performance em buscas com intencao local."
                />
              </CardTitle>
              <CardDescription>
                Desempenho em diferentes tipos de busca
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Search className="h-4 w-4" />
                    Web Score
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(summary.web_search_score)}`}>
                    {summary.web_search_score.toFixed(0)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Buscas gerais</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" />
                    Local Score
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(summary.local_search_score)}`}>
                    {summary.local_search_score.toFixed(0)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Buscas locais</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Dica de Melhoria</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.web_search_score < summary.local_search_score 
                    ? "Voce performa melhor em buscas locais. Considere otimizar seu conteudo online para buscas gerais."
                    : summary.local_search_score < 50
                    ? "Seu score local esta baixo. Certifique-se de ter presenca no Google Meu Negocio e directories locais."
                    : "Bom desempenho! Continue monitorando para manter sua visibilidade."
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat-style Test History */}
      {testHistory.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>Historico de Testes</span>
              <MetricTooltip
                whatIs="Registro completo de todos os testes executados para este prompt, com data, hora e resultados detalhados."
                purpose="Acompanhe a evolucao dos resultados ao longo do tempo, veja a resposta completa da IA e analise cada teste individualmente."
                calculation="Clique em um teste para expandir e ver metricas, termos de busca, concorrentes detectados e resposta completa."
              />
            </CardTitle>
            <CardDescription>
              Simulacao de conversas com a IA - clique para ver detalhes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testHistory.map((test) => {
                const isExpanded = expandedTests.has(test.id)
                const sentiment = getSentimentConfig(test.analysis_metadata?.sentiment || "neutral")
                const SentimentIcon = sentiment.icon
                
                return (
                  <div 
                    key={test.id} 
                    className="rounded-2xl border bg-gradient-to-b from-muted/20 to-muted/5 overflow-hidden transition-all"
                  >
                    {/* Chat Header */}
                    <button
                      onClick={() => toggleTestExpanded(test.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {new Date(test.tested_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {test.analysis_metadata?.client_mentioned ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-0">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mencionado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-muted-foreground">
                              <XCircle className="h-3 w-3 mr-1" />
                              Nao mencionado
                            </Badge>
                          )}
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${sentiment.bg} ${sentiment.color}`}>
                            <SentimentIcon className="h-3 w-3" />
                            {sentiment.label}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Visibilidade:</span>
                          <span className={`text-sm font-semibold ${getScoreColor(test.visibility_score)}`}>
                            {test.visibility_score}%
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Chat Content */}
                    <div 
                      className={`grid transition-all duration-300 ease-in-out ${
                        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-4">
                        {/* User Message (Prompt) */}
                        <div className="flex gap-3 justify-end">
                          <div className="max-w-[80%] space-y-1">
                            <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
                              <p className="text-sm">{prompt?.prompt}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground text-right">Usuario</p>
                          </div>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* AI Response */}
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8 shrink-0 bg-gradient-to-br from-emerald-500 to-teal-500">
                            <AvatarFallback className="bg-transparent text-white text-xs">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="max-w-[80%] space-y-1">
                            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{test.ai_response}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Assistente IA</p>
                          </div>
                        </div>

                        {/* Metrics & Details */}
                        <div className="mt-4 pt-4 border-t border-dashed space-y-4">
                          {/* Quick Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 rounded-xl bg-muted/30 text-center">
                              <p className="text-[10px] text-muted-foreground mb-1">Visibilidade</p>
                              <p className={`text-lg font-bold ${getScoreColor(test.visibility_score)}`}>
                                {test.visibility_score}%
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-muted/30 text-center">
                              <p className="text-[10px] text-muted-foreground mb-1">Reputacao</p>
                              <p className={`text-lg font-bold ${getScoreColor(test.reputation_score)}`}>
                                {test.reputation_score}%
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-muted/30 text-center">
                              <p className="text-[10px] text-muted-foreground mb-1">Posicao</p>
                              <p className="text-lg font-bold">
                                {test.position_rank ? `${test.position_rank}°` : "--"}
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-muted/30 text-center">
                              <p className="text-[10px] text-muted-foreground mb-1">Sentimento</p>
                              <div className={`inline-flex items-center gap-1 ${sentiment.color}`}>
                                <SentimentIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">{sentiment.label}</span>
                              </div>
                            </div>
                          </div>

                          {/* Search Terms */}
                          {test.search_terms_used && test.search_terms_used.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Search className="h-3 w-3" />
                                Termos de Busca Identificados
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {test.search_terms_used.map((term, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs font-normal">
                                    {term}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Competitors Found */}
                          {test.competitors_found && Object.keys(test.competitors_found).length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Empresas Mencionadas
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(test.competitors_found)
                                  .sort(([, a], [, b]) => (a as number) - (b as number))
                                  .map(([comp, position], i) => {
                                    const isTracked = trackedCompetitors.some(
                                      c => c.name.toLowerCase() === comp.toLowerCase()
                                    )
                                    return (
                                      <div 
                                        key={i} 
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                                          isTracked ? "bg-primary/10 text-primary" : "bg-muted"
                                        }`}
                                      >
                                        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                          (position as number) <= 3 
                                            ? "bg-amber-500/20 text-amber-600" 
                                            : "bg-muted-foreground/20 text-muted-foreground"
                                        }`}>
                                          {position as number}°
                                        </span>
                                        <span className="font-medium">{comp}</span>
                                        {isTracked && (
                                          <Target className="h-3 w-3" />
                                        )}
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Sources */}
                          {test.sources_cited && test.sources_cited.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                Fontes Citadas
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {test.sources_cited.map((source, i) => (
                                  <a
                                    key={i}
                                    href={source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer font-normal">
                                      {(() => {
                                        try {
                                          return new URL(source).hostname.replace("www.", "")
                                        } catch {
                                          return source
                                        }
                                      })()}
                                      <ExternalLink className="h-2.5 w-2.5 ml-1" />
                                    </Badge>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )}

      {/* Insights & Action Plan Section - Only for authorized users */}
      {canManage && testHistory.length > 0 && (
        <Card className="bg-gradient-to-br from-background to-purple-500/5 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-purple-500" />
              <span>Insights e Plano de Acao</span>
              <MetricTooltip
                whatIs="Analise inteligente gerada por IA com base nos dados de monitoramento deste prompt."
                purpose="Fornece insights estrategicos e um plano de acao pratico para melhorar sua visibilidade nas respostas de IA."
                calculation="A IA analisa metricas, respostas e concorrentes para gerar recomendacoes personalizadas."
              />
            </CardTitle>
            <CardDescription>
              Analise os dados e receba recomendacoes para melhorar suas metricas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Generate Button */}
            {insights.length === 0 && !isGeneratingInsights && (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                  <Rocket className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Gerar Insights com IA</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Clique no botao abaixo para que a IA analise seus dados e gere insights 
                  estrategicos e um plano de acao personalizado.
                </p>
                <Button 
                  onClick={handleGenerateInsights} 
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4" />
                  Gerar Insights
                </Button>
                {insightsError && (
                  <p className="text-sm text-destructive mt-4">{insightsError}</p>
                )}
              </div>
            )}

            {/* Loading State */}
            {isGeneratingInsights && (
              <div className="text-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-purple-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Analisando dados...</h3>
                <p className="text-sm text-muted-foreground">
                  A IA esta analisando suas metricas, respostas e concorrentes. Isso pode levar alguns segundos.
                </p>
              </div>
            )}

            {/* Insights Content */}
            {insights.length > 0 && !isGeneratingInsights && (
              <div className="space-y-6">
                {/* Last Generated Info */}
                {insightCreatedAt && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Gerado em {new Date(insightCreatedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateInsights}
                      disabled={isGeneratingInsights}
                      className="gap-2"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerar
                    </Button>
                  </div>
                )}

                {/* Insights */}
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-purple-500" />
                    Insights Estrategicos
                  </h4>
                  <div className="space-y-3">
                    {insights.map((insight, index) => (
                      <div 
                        key={index}
                        className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                      >
                        <div className="shrink-0 w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center text-xs font-medium text-purple-600">
                          {index + 1}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Plan */}
                {actionPlan.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                      <ListChecks className="h-4 w-4 text-purple-500" />
                      Plano de Acao
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {actionPlan.map((action, index) => {
                        const categoryIcons: Record<string, React.ReactNode> = {
                          conteudo: <FileText className="h-4 w-4" />,
                          seo: <Search className="h-4 w-4" />,
                          presenca: <Megaphone className="h-4 w-4" />,
                          autoridade: <LinkIcon className="h-4 w-4" />,
                        }
                        const categoryColors: Record<string, string> = {
                          conteudo: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                          seo: "bg-green-500/10 text-green-600 border-green-500/20",
                          presenca: "bg-orange-500/10 text-orange-600 border-orange-500/20",
                          autoridade: "bg-purple-500/10 text-purple-600 border-purple-500/20",
                        }
                        const priorityColors: Record<string, string> = {
                          alta: "bg-red-500/10 text-red-600",
                          media: "bg-yellow-500/10 text-yellow-600",
                          baixa: "bg-gray-500/10 text-gray-600",
                        }

                        return (
                          <div 
                            key={index}
                            className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className={`p-1.5 rounded-md ${categoryColors[action.category] || "bg-muted"}`}>
                                {categoryIcons[action.category] || <Target className="h-4 w-4" />}
                              </div>
                              <Badge variant="secondary" className={`text-xs ${priorityColors[action.priority] || ""}`}>
                                {action.priority === "alta" ? "Prioridade Alta" : 
                                 action.priority === "media" ? "Prioridade Media" : "Prioridade Baixa"}
                              </Badge>
                            </div>
                            <h5 className="font-medium text-sm mb-1">{action.title}</h5>
                            <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {insightsError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {insightsError}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {testHistory.length === 0 && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Nenhum teste realizado ainda</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Execute o primeiro teste para ver como a IA responde a este prompt e monitorar sua visibilidade.
            </p>
            {canManage && (
              <Button onClick={handleRunTest} disabled={isTesting}>
                <Zap className="h-4 w-4 mr-2" />
                Executar Primeiro Teste
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
