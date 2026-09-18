"use client"

import { useState, useEffect } from "react"
import type { Profile } from "@/lib/types"
import { ROLE_LABELS } from "@/lib/rbac"
import { Menu, Search, ChevronDown, LogOut, User, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MobileSidebar } from "./mobile-sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { CommandSearch } from "./command-search"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface HeaderProps {
  profile: Profile
  title: string
  description?: string
}

export function Header({ profile, title, description }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "gerente":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "coordenador":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      default:
        return "bg-primary/10 text-primary border-primary/20"
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          {/* Left section - Mobile menu and title */}
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl lg:hidden hover:bg-accent">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <MobileSidebar profile={profile} />
              </SheetContent>
            </Sheet>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight lg:text-xl">{title}</h1>
              </div>
              {description && (
                <p className="hidden text-sm text-muted-foreground md:block max-w-md truncate">{description}</p>
              )}
            </div>
          </div>

          {/* Right section - Search, theme, and user */}
          <div className="flex items-center gap-2 lg:gap-3">
            <Button
              variant="outline"
              onClick={() => setSearchOpen(true)}
              className="h-10 gap-2 rounded-xl border-border/50 bg-background/50 px-3 hover:bg-accent transition-all duration-200 sm:w-auto sm:min-w-[200px] lg:min-w-[280px]"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="hidden text-sm text-muted-foreground sm:inline flex-1 text-left">Buscar...</span>
              <kbd className="hidden pointer-events-none h-6 select-none items-center gap-1 rounded-md border border-border/50 bg-muted/50 px-2 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 gap-2 rounded-xl px-2 hover:bg-accent transition-all duration-200 sm:pl-2 sm:pr-3"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-border/50 transition-all duration-200 group-hover:ring-primary/50">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-semibold">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden flex-col items-start sm:flex">
                    <span className="text-sm font-medium max-w-[120px] truncate">{profile.name}</span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${getRoleColor(profile.role)}`}
                    >
                      {ROLE_LABELS[profile.role]}
                    </span>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link href="/dashboard/account" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Minha Conta</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link href="/dashboard/account" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Configuracoes</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="rounded-lg cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} userRole={profile.role} />
    </>
  )
}
