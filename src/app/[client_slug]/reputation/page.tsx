"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  RefreshCw,
  Award,
  Shield,
  Users,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Target,
  Lightbulb,
  AlertCircle,
  Zap,
  ChevronRight,
  Building2,
  Star,
  BarChart3,
} from "lucide-react"

interface AnalysisItem {
  aspect: string
  score: number
  status: "excellent" | "good" | "average" | "poor"
  description: string
  evidence: string[]
}

interface AnalysisSection {
  items: AnalysisItem[]
  summary: string
}

interface Recommendation {
  title: string
  description: string
  priority: "alta" | "media" | "baixa"
  impact: string
}

interface Competitor {
  name: string
  overall_score: number
  branding: number
  authority: number
  comparison: string
}

interface BrandReputation {
  id: string
  overall_score: number
  branding_score: number
  authority_score: number
  representativeness_score: number
  relevance_score: number
  branding_analysis: AnalysisSection
  authority_analysis: AnalysisSection
  representativeness_analysis: AnalysisSection
  relevance_analysis: AnalysisSection
  executive_summary: string
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
  recommendations: Recommendation[]
  competitors_analysis: Competitor[]
  last_analysis_at: string
}

export default function ReputationPage() {
  const params = useParams()
  const clientSlug = params.client_slug as string

  const [reputation, setReputation] = useState<BrandReputation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReputation()
  }, [clientSlug])

  async function fetchReputation() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${clientSlug}/reputation`)
      const data = await response.json()

      if (data.exists && data.reputation) {
        setReputation(data.reputation)
      }
    } catch (err) {
      setError("Erro ao carregar analise de reputacao")
    } finally {
      setIsLoading(false)
    }
  }

  async function generateReputation() {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${clientSlug}/reputation`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar analise")
      }

      setReputation(data.reputation)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar analise")
    } finally {
      setIsGenerating(false)
    }
  }

  function getScoreColor(score: number) {
    if (score >= 80) return "text-emerald-500"
    if (score >= 60) return "text-blue-500"
    if (score >= 40) return "text-amber-500"
    return "text-red-500"
  }

  function getScoreGradient(score: number) {
    if (score >= 80) return "from-emerald-500 to-green-500"
    if (score >= 60) return "from-blue-500 to-cyan-500"
    if (score >= 40) return "from-amber-500 to-yellow-500"
    return "from-red-500 to-orange-500"
  }

  function getScoreBg(score: number) {
    if (score >= 80) return "bg-emerald-500/10"
    if (score >= 60) return "bg-blue-500/10"
    if (score >= 40) return "bg-amber-500/10"
    return "bg-red-500/10"
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "excellent":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "good":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />
      case "average":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "poor":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "alta":
        return "bg-red-500/10 text-red-700 border-red-200"
      case "media":
        return "bg-amber-500/10 text-amber-700 border-amber-200"
      case "baixa":
        return "bg-blue-500/10 text-blue-700 border-blue-200"
      default:
        return "bg-muted"
    }
  }

  const scoreCards = [
    { key: "branding", label: "Branding", icon: Award, score: reputation?.branding_score || 0 },
    { key: "authority", label: "Autoridade", icon: Shield, score: reputation?.authority_score || 0 },
    { key: "representativeness", label: "Representatividade", icon: Users, score: reputation?.representativeness_score || 0 },
    { key: "relevance", label: "Relevancia", icon: TrendingUp, score: reputation?.relevance_score || 0 },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando analise de reputacao...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Analise de Reputacao
          </h1>
          <p className="text-muted-foreground">
            Avaliacao completa de branding, autoridade, representatividade e relevancia da marca
          </p>
        </div>

        <Button
          onClick={generateReputation}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : reputation ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Reanalisar
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Gerar Analise
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!reputation && !isGenerating ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Star className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma analise encontrada</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Clique no botao acima para gerar uma analise completa da reputacao da sua marca com IA.
            </p>
            <Button onClick={generateReputation} className="gap-2">
              <Zap className="h-4 w-4" />
              Gerar Analise Agora
            </Button>
          </CardContent>
        </Card>
      ) : isGenerating ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analisando reputacao da marca...</h3>
            <p className="text-muted-foreground text-center max-w-md">
              A IA esta avaliando branding, autoridade, representatividade e relevancia. Isso pode levar alguns segundos.
            </p>
          </CardContent>
        </Card>
      ) : reputation ? (
        <>
          {/* Overall Score */}
          <Card className="overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${getScoreGradient(reputation.overall_score)}`} />
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${getScoreGradient(reputation.overall_score)} p-1 shrink-0`}>
                  <div className="w-full h-full rounded-full bg-background flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${getScoreColor(reputation.overall_score)}`}>
                      {reputation.overall_score}
                    </span>
                    <span className="text-xs text-muted-foreground">Score Geral</span>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-xl font-semibold mb-2">Resumo Executivo</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {reputation.executive_summary}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Ultima analise: {new Date(reputation.last_analysis_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {scoreCards.map((card) => (
              <Card key={card.key} className={`${getScoreBg(card.score)} border-0`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-background`}>
                      <card.icon className={`h-5 w-5 ${getScoreColor(card.score)}`} />
                    </div>
                    <span className="font-medium text-sm">{card.label}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className={`text-3xl font-bold ${getScoreColor(card.score)}`}>
                      {card.score}
                    </span>
                    <span className="text-muted-foreground text-sm mb-1">/100</span>
                  </div>
                  <Progress value={card.score} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Analysis Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analise Detalhada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="branding">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="branding" className="gap-2">
                    <Award className="h-4 w-4" />
                    <span className="hidden sm:inline">Branding</span>
                  </TabsTrigger>
                  <TabsTrigger value="authority" className="gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Autoridade</span>
                  </TabsTrigger>
                  <TabsTrigger value="representativeness" className="gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Representatividade</span>
                  </TabsTrigger>
                  <TabsTrigger value="relevance" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Relevancia</span>
                  </TabsTrigger>
                </TabsList>

                {[
                  { key: "branding", analysis: reputation.branding_analysis },
                  { key: "authority", analysis: reputation.authority_analysis },
                  { key: "representativeness", analysis: reputation.representativeness_analysis },
                  { key: "relevance", analysis: reputation.relevance_analysis },
                ].map(({ key, analysis }) => (
                  <TabsContent key={key} value={key} className="space-y-4">
                    <p className="text-muted-foreground mb-4">{analysis?.summary}</p>
                    
                    <div className="space-y-3">
                      {analysis?.items?.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(item.status)}
                              <h4 className="font-medium">{item.aspect}</h4>
                            </div>
                            <Badge variant="outline" className={getScoreColor(item.score)}>
                              {item.score}/100
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.description}
                          </p>
                          {item.evidence?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.evidence.map((e, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {e}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* SWOT Analysis */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-emerald-200 bg-emerald-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Pontos Fortes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {reputation.strengths?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Pontos Fracos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {reputation.weaknesses?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                  <Lightbulb className="h-5 w-5" />
                  Oportunidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {reputation.opportunities?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-5 w-5" />
                  Ameacas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {reputation.threats?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recomendacoes Estrategicas
              </CardTitle>
              <CardDescription>
                Acoes priorizadas para melhorar a reputacao da marca
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reputation.recommendations?.map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="font-medium">{rec.title}</h4>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority === "alta" ? "Alta Prioridade" : rec.priority === "media" ? "Media Prioridade" : "Baixa Prioridade"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                    <p className="text-xs text-primary flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Impacto esperado: {rec.impact}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Competitors */}
          {reputation.competitors_analysis?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Comparativo com Concorrentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reputation.competitors_analysis.map((comp, idx) => (
                    <div key={idx} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{comp.name}</h4>
                        <Badge variant="outline" className={getScoreColor(comp.overall_score)}>
                          Score: {comp.overall_score}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Branding</p>
                          <Progress value={comp.branding} className="h-2" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Autoridade</p>
                          <Progress value={comp.authority} className="h-2" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{comp.comparison}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
