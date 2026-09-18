"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
  ArrowLeft,
  Users,
  Building2,
  Globe,
  ShoppingCart,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  TrendingUp,
  MapPin,
  Share2,
  Store,
  Smartphone,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Sparkles,
  AlertTriangle,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts"

interface ReportData {
  total: number
  statusCounts: {
    pendente: number
    processando: number
    enriquecido: number
    erro: number
  }
  modeloNegocioCounts: Record<string, number>
  classificacaoCounts: Record<string, number>
  topSegmentos: Array<{ nome: string; count: number }>
  topEstados: Array<{ nome: string; count: number }>
  topCidades: Array<{ nome: string; count: number }>
  presencaDigital: {
    comSite: number
    comEcommerce: number
    comRedesSociais: number
    comMarketplace: number
    comTelefone: number
    comWhatsapp: number
    comEmail: number
  }
  redesSociaisCounts: Record<string, number>
  topMarketplaces: Array<{ nome: string; count: number }>
  topPlataformas: Array<{ nome: string; count: number }>
  topDores: Array<{ nome: string; count: number }>
  evolucaoLeads: Array<{ data: string; count: number }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const STATUS_COLORS = {
  pendente: '#f59e0b',
  processando: '#3b82f6',
  enriquecido: '#10b981',
  erro: '#ef4444',
}

const STATUS_LABELS = {
  pendente: 'Pendente',
  processando: 'Processando',
  enriquecido: 'Enriquecido',
  erro: 'Erro',
}

export function RelatoriosContent() {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/leads/relatorios')
        if (!response.ok) throw new Error('Erro ao carregar dados')
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError('Erro ao carregar relatórios')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="mt-4 text-lg font-medium">{error || 'Erro ao carregar dados'}</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/prospeccao">Voltar</Link>
        </Button>
      </div>
    )
  }

  const taxaEnriquecimento = data.total > 0 
    ? Math.round((data.statusCounts.enriquecido / data.total) * 100) 
    : 0

  const statusData = Object.entries(data.statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
    value: count,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
  }))

  const modeloData = Object.entries(data.modeloNegocioCounts).map(([nome, count]) => ({
    nome: nome || 'Não identificado',
    count,
  }))

  const classificacaoData = Object.entries(data.classificacaoCounts).map(([nome, count]) => ({
    nome: nome || 'Não identificado',
    count,
  }))

  const redesSociaisData = Object.entries(data.redesSociaisCounts)
    .filter(([, count]) => count > 0)
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/prospeccao">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Prospecção
          </Link>
        </Button>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Leads</p>
                <p className="text-3xl font-bold">{data.total.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enriquecidos</p>
                <p className="text-3xl font-bold text-green-600">{data.statusCounts.enriquecido.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de enriquecimento</span>
                <span className="font-medium">{taxaEnriquecimento}%</span>
              </div>
              <Progress value={taxaEnriquecimento} className="mt-2 h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold text-amber-600">{data.statusCounts.pendente.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-full bg-amber-100 p-3">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Com Erro</p>
                <p className="text-3xl font-bold text-red-600">{data.statusCounts.erro.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Presença Digital */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Presença Digital dos Leads
          </CardTitle>
          <CardDescription>
            Quantos leads possuem cada tipo de presença online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
            <PresencaItem 
              icon={Globe} 
              label="Site" 
              count={data.presencaDigital.comSite} 
              total={data.total}
              color="text-blue-600"
            />
            <PresencaItem 
              icon={ShoppingCart} 
              label="E-commerce" 
              count={data.presencaDigital.comEcommerce} 
              total={data.total}
              color="text-green-600"
            />
            <PresencaItem 
              icon={Share2} 
              label="Redes Sociais" 
              count={data.presencaDigital.comRedesSociais} 
              total={data.total}
              color="text-purple-600"
            />
            <PresencaItem 
              icon={Store} 
              label="Marketplace" 
              count={data.presencaDigital.comMarketplace} 
              total={data.total}
              color="text-orange-600"
            />
            <PresencaItem 
              icon={Phone} 
              label="Telefone" 
              count={data.presencaDigital.comTelefone} 
              total={data.total}
              color="text-slate-600"
            />
            <PresencaItem 
              icon={Smartphone} 
              label="WhatsApp" 
              count={data.presencaDigital.comWhatsapp} 
              total={data.total}
              color="text-green-500"
            />
            <PresencaItem 
              icon={Mail} 
              label="Email" 
              count={data.presencaDigital.comEmail} 
              total={data.total}
              color="text-red-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Gráficos de Status e Modelo */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status dos Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Status dos Leads
            </CardTitle>
            <CardDescription>Distribuição por status de processamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}: {item.value.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Modelo de Negócio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Modelo de Negócio
            </CardTitle>
            <CardDescription>Distribuição B2B, B2C e híbrido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modeloData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução de Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Evolução de Leads (Últimos 30 dias)
          </CardTitle>
          <CardDescription>Novos leads adicionados por dia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.evolucaoLeads}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="data" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getDate()}/${date.getMonth() + 1}`
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('pt-BR')
                  }}
                  formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Leads']}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Segmentos e Localização */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Segmentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top 10 Segmentos
            </CardTitle>
            <CardDescription>Segmentos de atuação mais frequentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topSegmentos.map((item, index) => (
                <div key={item.nome} className="flex items-center gap-3">
                  <span className="w-6 text-sm font-medium text-muted-foreground">{index + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[200px]" title={item.nome}>
                        {item.nome}
                      </span>
                      <span className="text-sm text-muted-foreground">{item.count}</span>
                    </div>
                    <Progress 
                      value={(item.count / data.total) * 100} 
                      className="mt-1 h-1.5" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Estados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Leads por Estado
            </CardTitle>
            <CardDescription>Distribuição geográfica dos leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topEstados}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {data.topEstados.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Redes Sociais e Marketplaces */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Redes Sociais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Redes Sociais Encontradas
            </CardTitle>
            <CardDescription>Presença em cada rede social</CardDescription>
          </CardHeader>
          <CardContent>
            {redesSociaisData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={redesSociaisData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {redesSociaisData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Share2 className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma rede social encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Marketplaces */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Presença em Marketplaces
            </CardTitle>
            <CardDescription>Leads com lojas em marketplaces</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topMarketplaces.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topMarketplaces} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Store className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhum marketplace encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Classificação e Plataformas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Classificação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Classificação dos Leads
            </CardTitle>
            <CardDescription>Tipo de empresa identificado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={classificacaoData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ nome, percent }) => `${nome.substring(0, 15)}${nome.length > 15 ? '...' : ''} ${(percent * 100).toFixed(0)}%`}
                  >
                    {classificacaoData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plataformas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Plataformas de Site
            </CardTitle>
            <CardDescription>Tecnologias identificadas nos sites</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topPlataformas.length > 0 ? (
              <div className="space-y-3">
                {data.topPlataformas.map((item, index) => (
                  <div key={item.nome} className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 justify-center">{index + 1}</Badge>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.nome}</span>
                        <span className="text-sm text-muted-foreground">{item.count} leads</span>
                      </div>
                      <Progress 
                        value={(item.count / data.presencaDigital.comSite) * 100} 
                        className="mt-1 h-1.5" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma plataforma identificada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Principais Dores dos Prospectos */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-5 w-5" />
            Principais Dores dos Prospectos
          </CardTitle>
          <CardDescription>
            As dores mais comuns identificadas nos leads - oportunidades de venda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.topDores && data.topDores.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.topDores.map((item, index) => {
                const maxCount = data.topDores[0]?.count || 1
                const percentage = Math.round((item.count / maxCount) * 100)
                
                return (
                  <div 
                    key={item.nome} 
                    className="flex items-start gap-3 rounded-lg border border-orange-200 bg-white p-3 transition-all hover:shadow-md"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight text-gray-800">
                        {item.nome}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-orange-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-orange-700 whitespace-nowrap">
                          {item.count} leads
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Nenhuma dor identificada ainda. Enriqueça mais leads para ver as principais dores dos seus prospectos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Cidades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Top 10 Cidades
          </CardTitle>
          <CardDescription>Cidades com mais leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topCidades}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="nome" 
                  tick={{ fontSize: 10 }} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PresencaItem({ 
  icon: Icon, 
  label, 
  count, 
  total,
  color 
}: { 
  icon: React.ElementType
  label: string
  count: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  
  return (
    <div className="flex flex-col items-center rounded-lg border bg-card p-4 text-center">
      <Icon className={`h-6 w-6 ${color}`} />
      <span className="mt-2 text-2xl font-bold">{count.toLocaleString('pt-BR')}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant="secondary" className="mt-2">{percentage}%</Badge>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
