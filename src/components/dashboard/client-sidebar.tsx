"use client"

import type React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Zap,
  ChevronLeft,
  Home,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Building2,
  ArrowLeft,
  Sparkles,
  Search,
  Users,
  FileText,
  PenTool,
  History,
  FileSearch,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Profile, Client } from "@/lib/types"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
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
import { ROLE_LABELS } from "@/lib/rbac"

interface ClientSidebarProps {
  profile: Profile
  client: Client
}

export function ClientSidebar({ profile, client }: ClientSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  // Helper to check if a route is active
  const isActiveRoute = (path: string) => {
    if (path === `/${client.slug}`) {
      return pathname === `/${client.slug}`
    }
    return pathname.startsWith(path)
  }

  const updateCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed)
    localStorage.setItem("client-sidebar-collapsed", String(collapsed))
    window.dispatchEvent(new CustomEvent("sidebar-collapse-change", { detail: { collapsed } }))
  }

  // Persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem("client-sidebar-collapsed")
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
    const supabase = createSupabaseClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

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
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          {showExpanded && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-200 min-w-0 flex-1">
              <span className="font-semibold tracking-tight truncate block">{client.name}</span>
              <p className="text-[10px] text-muted-foreground">Dashboard do Cliente</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3">
          {/* Back to main dashboard */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  className={cn(
                    "mb-4 w-full transition-all duration-200 text-muted-foreground hover:text-foreground",
                    !showExpanded ? "justify-center px-0" : "justify-start px-3",
                  )}
                  size={!showExpanded ? "icon" : "default"}
                >
                  <ArrowLeft className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
                  {showExpanded && <span className="animate-in fade-in duration-200">Voltar ao Painel</span>}
                </Button>
              </Link>
            </TooltipTrigger>
            {!showExpanded && <TooltipContent side="right">Voltar ao Painel Principal</TooltipContent>}
          </Tooltip>

          {!showExpanded && <div className="my-4 mx-2 border-t border-border/50" />}

          {/* Home link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/${client.slug}`}>
                <Button
                  variant={isActiveRoute(`/${client.slug}`) ? "secondary" : "ghost"}
                  className={cn(
                    "mb-1 w-full transition-all duration-200",
                    !showExpanded ? "justify-center px-0" : "justify-start px-3",
                    isActiveRoute(`/${client.slug}`) 
                      ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
                      : "hover:bg-muted/50",
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

          {/* AI Prompts section */}
          {showExpanded && (
            <div className="mb-2 mt-6 flex items-center gap-2 px-3 animate-in fade-in duration-200">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Inteligencia Artificial
              </span>
            </div>
          )}

          {!showExpanded && <div className="my-4 mx-2 border-t border-border/50" />}

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/${client.slug}/prompts`}>
                <Button
                  variant={isActiveRoute(`/${client.slug}/prompts`) ? "secondary" : "ghost"}
                  className={cn(
                    "mb-1 w-full transition-all duration-200",
                    !showExpanded ? "justify-center px-0" : "justify-start px-3",
                    isActiveRoute(`/${client.slug}/prompts`)
                      ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
                      : "hover:bg-muted/50",
                  )}
                  size={!showExpanded ? "icon" : "default"}
                >
                  <Search className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
                  {showExpanded && (
                    <span className="truncate animate-in fade-in duration-200">Busca de IA (prompts)</span>
                  )}
                </Button>
              </Link>
            </TooltipTrigger>
{!showExpanded && <TooltipContent side="right">Busca de IA (prompts)</TooltipContent>}
  </Tooltip>

  <Tooltip>
  <TooltipTrigger asChild>
  <Link href={`/${client.slug}/keywords`}>
  <Button
  variant={isActiveRoute(`/${client.slug}/keywords`) ? "secondary" : "ghost"}
  className={cn(
  "mb-1 w-full transition-all duration-200",
  !showExpanded ? "justify-center px-0" : "justify-start px-3",
  isActiveRoute(`/${client.slug}/keywords`)
  ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
  : "hover:bg-muted/50",
  )}
  size={!showExpanded ? "icon" : "default"}
  >
  <Zap className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
  {showExpanded && (
  <span className="truncate animate-in fade-in duration-200">Palavras-Chave</span>
  )}
  </Button>
  </Link>
  </TooltipTrigger>
  {!showExpanded && <TooltipContent side="right">Palavras-Chave</TooltipContent>}
  </Tooltip>

  <Tooltip>
  <TooltipTrigger asChild>
  <Link href={`/${client.slug}/audit`}>
  <Button
  variant={isActiveRoute(`/${client.slug}/audit`) ? "secondary" : "ghost"}
  className={cn(
  "mb-1 w-full transition-all duration-200",
  !showExpanded ? "justify-center px-0" : "justify-start px-3",
  isActiveRoute(`/${client.slug}/audit`)
  ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
  : "hover:bg-muted/50",
  )}
  size={!showExpanded ? "icon" : "default"}
  >
  <FileSearch className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
  {showExpanded && (
  <span className="truncate animate-in fade-in duration-200">Auditoria</span>
  )}
  </Button>
  </Link>
  </TooltipTrigger>
  {!showExpanded && <TooltipContent side="right">Auditoria</TooltipContent>}
  </Tooltip>

  <Tooltip>
  <TooltipTrigger asChild>
  <Link href={`/${client.slug}/reputation`}>
  <Button
  variant={isActiveRoute(`/${client.slug}/reputation`) ? "secondary" : "ghost"}
  className={cn(
  "mb-1 w-full transition-all duration-200",
  !showExpanded ? "justify-center px-0" : "justify-start px-3",
  isActiveRoute(`/${client.slug}/reputation`)
  ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
  : "hover:bg-muted/50",
  )}
  size={!showExpanded ? "icon" : "default"}
  >
  <Star className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
  {showExpanded && (
  <span className="truncate animate-in fade-in duration-200">Reputacao</span>
  )}
  </Button>
  </Link>
  </TooltipTrigger>
  {!showExpanded && <TooltipContent side="right">Reputacao da Marca</TooltipContent>}
  </Tooltip>
  
  <Tooltip>
  <TooltipTrigger asChild>
  <Link href={`/${client.slug}/concorrentes`}>
                <Button
                  variant={isActiveRoute(`/${client.slug}/concorrentes`) ? "secondary" : "ghost"}
                  className={cn(
                    "mb-1 w-full transition-all duration-200",
                    !showExpanded ? "justify-center px-0" : "justify-start px-3",
                    isActiveRoute(`/${client.slug}/concorrentes`)
                      ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
                      : "hover:bg-muted/50",
                  )}
                  size={!showExpanded ? "icon" : "default"}
                >
                  <Users className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
                  {showExpanded && (
                    <span className="truncate animate-in fade-in duration-200">Concorrentes</span>
                  )}
                </Button>
              </Link>
            </TooltipTrigger>
            {!showExpanded && <TooltipContent side="right">Concorrentes</TooltipContent>}
          </Tooltip>

          {/* Content Generation section */}
          {showExpanded && (
            <div className="mb-2 mt-6 flex items-center gap-2 px-3 animate-in fade-in duration-200">
              <PenTool className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Geracao de Conteudo
              </span>
            </div>
          )}

          {!showExpanded && <div className="my-4 mx-2 border-t border-border/50" />}

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/${client.slug}/seo`}>
                <Button
                  variant={pathname === `/${client.slug}/seo` ? "secondary" : "ghost"}
                  className={cn(
                    "mb-1 w-full transition-all duration-200",
                    !showExpanded ? "justify-center px-0" : "justify-start px-3",
                    pathname === `/${client.slug}/seo`
                      ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
                      : "hover:bg-muted/50",
                  )}
                  size={!showExpanded ? "icon" : "default"}
                >
                  <FileText className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
                  {showExpanded && (
                    <span className="truncate animate-in fade-in duration-200">Textos SEO</span>
                  )}
                </Button>
              </Link>
            </TooltipTrigger>
            {!showExpanded && <TooltipContent side="right">Textos SEO</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/${client.slug}/seo/history`}>
                <Button
                  variant={pathname === `/${client.slug}/seo/history` ? "secondary" : "ghost"}
                  className={cn(
                    "mb-1 w-full transition-all duration-200",
                    !showExpanded ? "justify-center px-0" : "justify-start px-3 pl-8",
                    pathname === `/${client.slug}/seo/history`
                      ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
                      : "hover:bg-muted/50 text-muted-foreground",
                  )}
                  size={!showExpanded ? "icon" : "default"}
                >
                  <History className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
                  {showExpanded && (
                    <span className="truncate animate-in fade-in duration-200">Historico SEO</span>
                  )}
                </Button>
              </Link>
            </TooltipTrigger>
            {!showExpanded && <TooltipContent side="right">Historico SEO</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/${client.slug}/posts`}>
                <Button
                  variant={pathname === `/${client.slug}/posts` ? "secondary" : "ghost"}
                  className={cn(
                    "mb-1 w-full transition-all duration-200",
                    !showExpanded ? "justify-center px-0" : "justify-start px-3",
                    pathname === `/${client.slug}/posts`
                      ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
                      : "hover:bg-muted/50",
                  )}
                  size={!showExpanded ? "icon" : "default"}
                >
                  <PenTool className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
                  {showExpanded && (
                    <span className="truncate animate-in fade-in duration-200">Posts Sociais</span>
                  )}
                </Button>
              </Link>
            </TooltipTrigger>
            {!showExpanded && <TooltipContent side="right">Posts Sociais</TooltipContent>}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/${client.slug}/posts/history`}>
                <Button
                  variant={pathname === `/${client.slug}/posts/history` ? "secondary" : "ghost"}
                  className={cn(
                    "mb-1 w-full transition-all duration-200",
                    !showExpanded ? "justify-center px-0" : "justify-start px-3 pl-8",
                    pathname === `/${client.slug}/posts/history`
                      ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
                      : "hover:bg-muted/50 text-muted-foreground",
                  )}
                  size={!showExpanded ? "icon" : "default"}
                >
                  <History className={cn("h-[18px] w-[18px] shrink-0", showExpanded && "mr-3")} />
                  {showExpanded && (
                    <span className="truncate animate-in fade-in duration-200">Historico Posts</span>
                  )}
                </Button>
              </Link>
            </TooltipTrigger>
            {!showExpanded && <TooltipContent side="right">Historico Posts</TooltipContent>}
          </Tooltip>
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
