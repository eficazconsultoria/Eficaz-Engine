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
  ChevronLeft,
  Sparkles,
  Home,
  PanelLeftClose,
  PanelLeft,
  Settings,
  Building2,
  Briefcase,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { type FeatureKey, FEATURE_LABELS, hasAccess, ROLE_LABELS } from "@/lib/rbac"
import type { Profile } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SidebarProps {
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
  "site_banners",
  "whatsapp_dispatcher",
  "lead_prospecting",
  "client_management",
  "my_account",
  "user_management",
]

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const updateCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed)
    localStorage.setItem("sidebar-collapsed", String(collapsed))
    window.dispatchEvent(new CustomEvent("sidebar-collapse-change", { detail: { collapsed } }))
  }

  // Persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored) setIsCollapsed(stored === "true")
  }, [])

  // Keyboard shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "[" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        updateCollapsed(!isCollapsed)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isCollapsed])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const accessibleFeatures = FEATURE_ORDER.filter((feature) => hasAccess(profile.role, feature))
  const aiFeatures = accessibleFeatures.filter((f) => f !== "my_account" && f !== "user_management" && f !== "client_management" && f !== "lead_prospecting")
  const managementFeatures = accessibleFeatures.filter((f) => f === "client_management" || f === "lead_prospecting")
  const accountFeatures = accessibleFeatures.filter((f) => f === "my_account" || f === "user_management")

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Show expanded when hovering over collapsed sidebar
  const showExpanded = !isCollapsed || isHovering

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        onMouseEnter={() => isCollapsed && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "group/sidebar fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 bg-card/50 backdrop-blur-xl transition-all duration-300 ease-out",
          isCollapsed && !isHovering ? "w-[68px]" : "w-[260px]",
          isHovering && isCollapsed && "shadow-2xl z-50",
        )}
      >
        {/* Collapse/Expand handle on the edge */}
        <button
          onClick={() => updateCollapsed(!isCollapsed)}
          className={cn(
            "absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-md transition-all",
            "hover:bg-primary hover:text-primary-foreground hover:scale-110",
            "opacity-0 group-hover/sidebar:opacity-100",
          )}
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", isCollapsed && "rotate-180")} />
        </button>

        {/* Header */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-border/50 px-4 transition-all",
            !showExpanded ? "justify-center" : "gap-3",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 transition-transform hover:scale-105">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {showExpanded && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-200">
              <span className="font-semibold tracking-tight">Eficaz Engine</span>
              <p className="text-[10px] text-muted-foreground">Marketing AI Platform</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3">
          {/* Home link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/dashboard">
                <Button
                  variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                  className={cn(
                    "mb-1 w-full transition-all duration-200",
                    !showExpanded ? "justify-center px-0" : "justify-start px-3",
                    pathname === "/dashboard" && "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm",
                  )}
                  size={!showExpanded ? "icon" : "default"}
                >
                  <Home className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
                  {showExpanded && <span className="animate-in fade-in duration-200">Inicio</span>}
                </Button>
              </Link>
            </TooltipTrigger>
            {!showExpanded && <TooltipContent side="right">Inicio</TooltipContent>}
          </Tooltip>

          {/* AI Features Section */}
          {showExpanded && (
            <div className="mb-2 mt-6 flex items-center gap-2 px-3 animate-in fade-in duration-200">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ferramentas IA
              </span>
            </div>
          )}
          {!showExpanded && <div className="my-4 mx-2 border-t border-border/50" />}

          <div className="space-y-1">
            {aiFeatures.map((feature, index) => {
              const Icon = FEATURE_ICONS[feature]
              const isActive = pathname === FEATURE_ROUTES[feature]

              return (
                <Tooltip key={feature}>
                  <TooltipTrigger asChild>
                    <Link href={FEATURE_ROUTES[feature]}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full transition-all duration-200",
                          !showExpanded ? "justify-center px-0" : "justify-start px-3",
                          isActive ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm" : "hover:bg-muted/50",
                        )}
                        size={!showExpanded ? "icon" : "default"}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors",
                            showExpanded && "mr-3",
                            isActive && "text-primary",
                          )}
                        />
                        {showExpanded && (
                          <span className="truncate animate-in fade-in duration-200">{FEATURE_LABELS[feature]}</span>
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  {!showExpanded && <TooltipContent side="right">{FEATURE_LABELS[feature]}</TooltipContent>}
                </Tooltip>
              )
            })}
          </div>

          {/* Management Features Section */}
          {managementFeatures.length > 0 && (
            <>
              {showExpanded ? (
                <div className="mb-2 mt-6 flex items-center gap-2 px-3 animate-in fade-in duration-200">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Gestao
                  </span>
                </div>
              ) : (
                <div className="my-4 mx-2 border-t border-border/50" />
              )}
              <div className="space-y-1">
                {managementFeatures.map((feature) => {
                  const Icon = FEATURE_ICONS[feature]
                  const isActive = pathname === FEATURE_ROUTES[feature]

                  return (
                    <Tooltip key={feature}>
                      <TooltipTrigger asChild>
                        <Link href={FEATURE_ROUTES[feature]}>
                          <Button
                            variant={isActive ? "secondary" : "ghost"}
                            className={cn(
                              "w-full transition-all duration-200",
                              !showExpanded ? "justify-center px-0" : "justify-start px-3",
                              isActive
                                ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
                                : "hover:bg-muted/50",
                            )}
                            size={!showExpanded ? "icon" : "default"}
                          >
                            <Icon
                              className={cn(
                                "h-[18px] w-[18px] shrink-0 transition-colors",
                                showExpanded && "mr-3",
                                isActive && "text-primary",
                              )}
                            />
                            {showExpanded && (
                              <span className="truncate animate-in fade-in duration-200">
                                {FEATURE_LABELS[feature]}
                              </span>
                            )}
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      {!showExpanded && <TooltipContent side="right">{FEATURE_LABELS[feature]}</TooltipContent>}
                    </Tooltip>
                  )
                })}
              </div>
            </>
          )}

          {/* Account Features Section */}
          {accountFeatures.length > 0 && (
            <>
              {showExpanded ? (
                <div className="mb-2 mt-6 flex items-center gap-2 px-3 animate-in fade-in duration-200">
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Configuracoes
                  </span>
                </div>
              ) : (
                <div className="my-4 mx-2 border-t border-border/50" />
              )}
              <div className="space-y-1">
                {accountFeatures.map((feature) => {
                  const Icon = FEATURE_ICONS[feature]
                  const isActive = pathname === FEATURE_ROUTES[feature]

                  return (
                    <Tooltip key={feature}>
                      <TooltipTrigger asChild>
                        <Link href={FEATURE_ROUTES[feature]}>
                          <Button
                            variant={isActive ? "secondary" : "ghost"}
                            className={cn(
                              "w-full transition-all duration-200",
                              !showExpanded ? "justify-center px-0" : "justify-start px-3",
                              isActive
                                ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
                                : "hover:bg-muted/50",
                            )}
                            size={!showExpanded ? "icon" : "default"}
                          >
                            <Icon
                              className={cn(
                                "h-[18px] w-[18px] shrink-0 transition-colors",
                                showExpanded && "mr-3",
                                isActive && "text-primary",
                              )}
                            />
                            {showExpanded && (
                              <span className="truncate animate-in fade-in duration-200">
                                {FEATURE_LABELS[feature]}
                              </span>
                            )}
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      {!showExpanded && <TooltipContent side="right">{FEATURE_LABELS[feature]}</TooltipContent>}
                    </Tooltip>
                  )
                })}
              </div>
            </>
          )}
        </nav>

        {/* User info and controls */}
        <div className="border-t border-border/50 p-3">
          {showExpanded ? (
            <div className="animate-in fade-in slide-in-from-left-2 duration-200">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-3 rounded-xl bg-muted/50 p-3 transition-all hover:bg-muted">
                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-medium">
                        {getInitials(profile.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium">{profile.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/account" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Minha Conta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Collapse button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateCollapsed(true)}
                className="mt-2 w-full justify-center text-xs text-muted-foreground hover:text-foreground"
              >
                <PanelLeftClose className="mr-2 h-3.5 w-3.5" />
                Recolher menu
                <kbd className="ml-auto inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                  <span className="text-xs">⌘</span>[
                </kbd>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-xl p-1 transition-all hover:bg-muted">
                        <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-medium">
                            {getInitials(profile.name)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" side="right" className="w-56">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{profile.name}</p>
                        <p className="text-xs text-muted-foreground">{profile.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/account" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Minha Conta
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent side="right">{profile.name}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateCollapsed(false)}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Expandir menu
                  <kbd className="ml-2 inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]">
                    <span className="text-xs">⌘</span>[
                  </kbd>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
