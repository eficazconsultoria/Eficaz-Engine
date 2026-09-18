"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Eye,
  Star,
  Trophy,
  BarChart3,
  CheckCircle2,
  Clock,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from "lucide-react"
import { 
  PeriodFilter, 
  type PeriodFilterValue, 
  getDefaultPeriodFilter,
  buildPeriodQueryParams 
} from "@/components/dashboard/period-filter"

interface MetricsSummary {
  overallVisibility: number
  overallReputation: number
  overallPosition: number
  totalTests: number
}

interface TestResult {
  id: string
  was_mentioned: boolean
  visibility_score: number
  tested_at: string
  client_ai_prompts?: { prompt: string }
}

interface ClientDashboardMetricsProps {
  clientSlug: string
  promptIds: string[]
  initialMetrics: MetricsSummary
}

// Helper for score colors
function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-500"
  if (score >= 40) return "text-amber-500"
  return "text-red-500"
}

// Info tooltip component
function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3 bg-popover text-popover-foreground">
          <p className="text-xs">{text}</p>
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

export function ClientDashboardMetrics({ 
  clientSlug, 
  promptIds, 
  initialMetrics 
}: ClientDashboardMetricsProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>(getDefaultPeriodFilter())
  const [metrics, setMetrics] = useState<MetricsSummary>(initialMetrics)
  const [comparisonMetrics, setComparisonMetrics] = useState<MetricsSummary | null>(null)
  const [recentTests, setRecentTests] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchMetrics = useCallback(async () => {
    if (promptIds.length === 0) return
    
    setIsLoading(true)
    
    try {
      const periodParams = buildPeriodQueryParams(periodFilter)
      
      // Fetch tests for all prompts
      const responses = await Promise.all(
        promptIds.map(promptId => 
          fetch(`/api/clients/${clientSlug}/prompts/${promptId}/history?${periodParams.toString()}&limit=100`)
            .then(res => res.json())
        )
      )
      
      // Aggregate tests
      const allTests = responses.flatMap(r => r.tests || [])
      
      // Calculate metrics
      if (allTests.length > 0) {
        const testsWithVisibility = allTests.filter((t: { visibility_score: number; analysis_metadata?: { client_mentioned?: boolean } }) => 
          t.visibility_score > 0 || t.analysis_metadata?.client_mentioned
        ).length
        
        const visibility = (testsWithVisibility / allTests.length) * 100
        const reputation = allTests.reduce((acc: number, t: { reputation_score?: number }) => acc + (t.reputation_score || 0), 0) / allTests.length
        
        const positionRanks = allTests
          .map((t: { position_rank?: number | null }) => t.position_rank)
          .filter((p: number | null | undefined): p is number => p !== null && p !== undefined && p > 0)
        
        const position = positionRanks.length > 0
          ? Math.round(positionRanks.reduce((a: number, b: number) => a + b, 0) / positionRanks.length * 10) / 10
          : 0
        
        setMetrics({
          overallVisibility: Math.round(visibility),
          overallReputation: Math.round(reputation),
          overallPosition: position,
          totalTests: allTests.length,
        })
        
        // Get recent tests for activity section
        const sortedTests = allTests
          .sort((a: { tested_at: string }, b: { tested_at: string }) => 
            new Date(b.tested_at).getTime() - new Date(a.tested_at).getTime()
          )
          .slice(0, 5)
        
        setRecentTests(sortedTests)
      } else {
        setMetrics({
          overallVisibility: 0,
          overallReputation: 0,
          overallPosition: 0,
          totalTests: 0,
        })
        setRecentTests([])
      }
      
      // Fetch comparison if enabled
      if (periodFilter.comparison) {
        const comparisonParams = new URLSearchParams()
        
        // Set comparison dates with proper time range
        const compFromStart = new Date(periodFilter.comparison.from)
        compFromStart.setHours(0, 0, 0, 0)
        
        const compToEnd = new Date(periodFilter.comparison.to)
        compToEnd.setHours(23, 59, 59, 999)
        
        comparisonParams.set("from", compFromStart.toISOString())
        comparisonParams.set("to", compToEnd.toISOString())
        
        const comparisonResponses = await Promise.all(
          promptIds.map(promptId => 
            fetch(`/api/clients/${clientSlug}/prompts/${promptId}/history?${comparisonParams.toString()}&limit=100`)
              .then(res => res.json())
          )
        )
        
        const comparisonTests = comparisonResponses.flatMap(r => r.tests || [])
        
        if (comparisonTests.length > 0) {
          const testsWithVis = comparisonTests.filter((t: { visibility_score: number; analysis_metadata?: { client_mentioned?: boolean } }) => 
            t.visibility_score > 0 || t.analysis_metadata?.client_mentioned
          ).length
          
          const vis = (testsWithVis / comparisonTests.length) * 100
          const rep = comparisonTests.reduce((acc: number, t: { reputation_score?: number }) => acc + (t.reputation_score || 0), 0) / comparisonTests.length
          
          const posRanks = comparisonTests
            .map((t: { position_rank?: number | null }) => t.position_rank)
            .filter((p: number | null | undefined): p is number => p !== null && p !== undefined && p > 0)
          
          const pos = posRanks.length > 0
            ? Math.round(posRanks.reduce((a: number, b: number) => a + b, 0) / posRanks.length * 10) / 10
            : 0
          
          setComparisonMetrics({
            overallVisibility: Math.round(vis),
            overallReputation: Math.round(rep),
            overallPosition: pos,
            totalTests: comparisonTests.length,
          })
        } else {
          setComparisonMetrics(null)
        }
      } else {
        setComparisonMetrics(null)
      }
    } catch (error) {
      console.error("Error fetching metrics:", error)
    } finally {
      setIsLoading(false)
    }
  }, [clientSlug, promptIds, periodFilter])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Metricas do Periodo</h2>
        <PeriodFilter
          value={periodFilter}
          onChange={setPeriodFilter}
          showComparison={true}
        />
      </div>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Visibility Score */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-background to-blue-500/5 border-blue-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Eye className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Visibilidade</span>
                <InfoTooltip text="Percentual de vezes que sua empresa aparece nas respostas da IA." />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className={`text-3xl font-bold ${getScoreColor(metrics.overallVisibility)}`}>
                    {metrics.overallVisibility}%
                  </div>
                  {comparisonMetrics && (
                    <ComparisonIndicator 
                      current={metrics.overallVisibility} 
                      previous={comparisonMetrics.overallVisibility} 
                    />
                  )}
                </div>
                <Progress value={metrics.overallVisibility} className="h-1.5 mt-3" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Reputation Score */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-background to-amber-500/5 border-amber-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -mr-10 -mt-10" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Reputacao</span>
                <InfoTooltip text="Avalia o tom com que sua empresa e apresentada nas respostas." />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className={`text-3xl font-bold ${getScoreColor(metrics.overallReputation)}`}>
                    {metrics.overallReputation}%
                  </div>
                  {comparisonMetrics && (
                    <ComparisonIndicator 
                      current={metrics.overallReputation} 
                      previous={comparisonMetrics.overallReputation} 
                    />
                  )}
                </div>
                <Progress value={metrics.overallReputation} className="h-1.5 mt-3" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Position */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-background to-yellow-500/5 border-yellow-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full -mr-10 -mt-10" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Posicao Media</span>
                <InfoTooltip text="Posicao media em que sua empresa aparece nas listas de recomendacao." />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold">
                    {metrics.overallPosition > 0 ? `${metrics.overallPosition}°` : "N/A"}
                  </div>
                  {comparisonMetrics && metrics.overallPosition > 0 && comparisonMetrics.overallPosition > 0 && (
                    <ComparisonIndicator 
                      current={metrics.overallPosition} 
                      previous={comparisonMetrics.overallPosition}
                      suffix="°"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {metrics.overallPosition > 0 && metrics.overallPosition <= 3 
                    ? "Otima posicao!" 
                    : metrics.overallPosition > 0 
                      ? "Pode melhorar" 
                      : "Sem dados ainda"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tests Count */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-background to-emerald-500/5 border-emerald-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -mr-10 -mt-10" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <BarChart3 className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Testes</span>
                <InfoTooltip text="Total de testes de IA executados no periodo selecionado." />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold text-emerald-500">
                    {metrics.totalTests}
                  </div>
                  {comparisonMetrics && (
                    <ComparisonIndicator 
                      current={metrics.totalTests} 
                      previous={comparisonMetrics.totalTests}
                      suffix=""
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Testes no periodo
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              <span>Atividade Recente</span>
            </CardTitle>
            <CardDescription>
              Ultimos testes de IA no periodo selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTests.map((test) => (
                <div 
                  key={test.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-full ${test.was_mentioned ? "bg-emerald-500/10" : "bg-muted"}`}>
                      {test.was_mentioned ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {test.client_ai_prompts?.prompt || "Prompt"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(test.tested_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getScoreColor(test.visibility_score || 0)}`}>
                        {test.visibility_score}%
                      </p>
                      <p className="text-xs text-muted-foreground">visibilidade</p>
                    </div>
                    {test.was_mentioned && (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0">
                        Mencionado
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Link href={`/${clientSlug}/prompts`}>
                <Button variant="ghost" className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground">
                  Ver todos os prompts e analytics
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
