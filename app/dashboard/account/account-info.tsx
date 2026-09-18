"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Mail,
  Shield,
  Calendar,
  Sparkles,
  CheckCircle2,
  ImageIcon,
  Palette,
  Video,
  FileText,
  LayoutGrid,
  Search,
  MessageSquare,
  Users,
  HelpCircle,
  ExternalLink,
} from "lucide-react"
import type { Profile } from "@/lib/types"
import { ROLE_LABELS, FEATURE_LABELS, getAccessibleFeatures } from "@/lib/rbac"

interface AccountInfoProps {
  profile: Profile
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  product_images: <ImageIcon className="h-4 w-4" />,
  creatives: <Palette className="h-4 w-4" />,
  videos: <Video className="h-4 w-4" />,
  posts: <FileText className="h-4 w-4" />,
  banners: <LayoutGrid className="h-4 w-4" />,
  seo: <Search className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  user_management: <Users className="h-4 w-4" />,
}

const ROLE_COLORS: Record<string, string> = {
  admin: "from-red-500 to-orange-500",
  gerente_marketing: "from-purple-500 to-pink-500",
  coordenador_marketing: "from-blue-500 to-cyan-500",
  analista_marketing: "from-green-500 to-emerald-500",
  designer: "from-yellow-500 to-orange-500",
  social_media: "from-pink-500 to-rose-500",
  redator: "from-indigo-500 to-purple-500",
  atendimento: "from-teal-500 to-green-500",
  estagiario: "from-gray-500 to-slate-500",
}

export function AccountInfo({ profile }: AccountInfoProps) {
  const accessibleFeatures = getAccessibleFeatures(profile.role).filter(
    (f) => f !== "my_account" && f !== "user_management",
  )

  const roleColor = ROLE_COLORS[profile.role] || "from-gray-500 to-slate-500"
  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const memberSince = new Date(profile.created_at)
  const daysAsMember = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="max-w-4xl space-y-8">
      {/* Profile Hero Card */}
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className={`h-32 bg-gradient-to-r ${roleColor}`} />
        <CardContent className="relative px-8 pb-8">
          {/* Avatar */}
          <div className="absolute -top-16 left-8">
            <div
              className={`flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br ${roleColor} text-4xl font-bold text-white shadow-2xl ring-4 ring-background`}
            >
              {initials}
            </div>
          </div>

          {/* Profile Info */}
          <div className="ml-40 pt-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">{profile.name}</h1>
                <div className="mt-2 flex items-center gap-3">
                  <Badge className={`bg-gradient-to-r ${roleColor} border-0 text-white`}>
                    <Shield className="mr-1 h-3 w-3" />
                    {ROLE_LABELS[profile.role]}
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    <CheckCircle2 className="mr-1 h-3 w-3 text-green-500" />
                    Conta Ativa
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Membro desde</p>
                <p className="font-semibold">
                  {memberSince.toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                <Mail className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
                <Sparkles className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ferramentas</p>
                <p className="font-medium">{accessibleFeatures.length} disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo de casa</p>
                <p className="font-medium">{daysAsMember} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Card */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Suas Permissões</h2>
              <p className="text-sm text-muted-foreground">Ferramentas que você pode acessar</p>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accessibleFeatures.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {FEATURE_ICONS[feature] || <Sparkles className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-medium">{FEATURE_LABELS[feature]}</p>
                  <p className="text-xs text-muted-foreground">Acesso liberado</p>
                </div>
                <CheckCircle2 className="ml-auto h-5 w-5 text-green-500" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="group relative overflow-hidden border-dashed transition-all hover:border-primary/50 hover:shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <CardContent className="flex items-center gap-6 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Precisa de ajuda?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Se você precisa alterar suas informações ou tem alguma dúvida sobre o sistema, entre em contato com o
              administrador.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <ExternalLink className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
