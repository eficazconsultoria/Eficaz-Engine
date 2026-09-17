"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, Suspense, useEffect } from "react"
import {
  Loader2,
  Zap,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Brain,
  Cpu,
  Sparkles,
  Rocket,
  Activity,
  Network,
} from "lucide-react"
import { cn } from "@/lib/utils"

function FloatingParticle({
  delay,
  duration,
  size,
  left,
  top,
}: {
  delay: number
  duration: number
  size: number
  left: string
  top: string
}) {
  return (
    <div
      className="absolute rounded-full bg-gradient-to-r from-cyan-400/30 to-purple-400/30 blur-sm animate-float"
      style={{
        width: size,
        height: size,
        left,
        top,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  )
}

function CircuitLine({ className }: { className?: string }) {
  return (
    <svg className={cn("absolute opacity-20", className)} viewBox="0 0 100 100" fill="none">
      <path
        d="M0 50 H30 L40 30 H60 L70 50 H100"
        stroke="url(#circuit-gradient)"
        strokeWidth="0.5"
        className="animate-circuit-flow"
      />
      <circle cx="30" cy="50" r="2" fill="currentColor" className="text-cyan-400" />
      <circle cx="70" cy="50" r="2" fill="currentColor" className="text-purple-400" />
      <defs>
        <linearGradient id="circuit-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function DataStream({ delay }: { delay: number }) {
  return (
    <div
      className="absolute w-px h-20 bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent animate-data-stream"
      style={{ animationDelay: `${delay}s` }}
    />
  )
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const router = useRouter()
  const searchParams = useSearchParams()

  const errorParam = searchParams.get("error")

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      // Usar window.location para garantir que os cookies sejam enviados corretamente
      // router.push + router.refresh pode causar race conditions
      window.location.href = "/dashboard"
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao fazer login"
      // Detect network/server errors (521, fetch failed, etc.)
      if (message.includes("Failed to fetch") || message.includes("fetch") || message.includes("521") || message.includes("Web server is down")) {
        setError("Servico temporariamente indisponivel. O servidor esta em manutencao. Tente novamente em alguns minutos.")
      } else {
        setError(message)
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh w-full">
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-[#0a0a0f]">
        {/* Deep space gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2d] to-[#0a0a0f]" />

        {/* Animated mesh gradient */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(ellipse at ${50 + mousePosition.x}% ${50 + mousePosition.y}%, rgba(34, 211, 238, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at ${30 - mousePosition.x}% ${70 - mousePosition.y}%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at ${70 + mousePosition.x}% ${30 + mousePosition.y}%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)
            `,
            transition: "background 0.3s ease-out",
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 211, 238, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 211, 238, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            transform: `perspective(500px) rotateX(60deg) translateY(-50%)`,
            transformOrigin: "center top",
          }}
        />

        {/* Floating particles */}
        <FloatingParticle delay={0} duration={8} size={4} left="20%" top="30%" />
        <FloatingParticle delay={1} duration={10} size={6} left="70%" top="20%" />
        <FloatingParticle delay={2} duration={7} size={3} left="40%" top="60%" />
        <FloatingParticle delay={3} duration={9} size={5} left="80%" top="70%" />
        <FloatingParticle delay={4} duration={11} size={4} left="15%" top="80%" />
        <FloatingParticle delay={5} duration={8} size={7} left="60%" top="45%" />

        {/* Circuit lines */}
        <CircuitLine className="w-40 h-20 top-[20%] left-[10%] rotate-12" />
        <CircuitLine className="w-32 h-16 top-[60%] right-[15%] -rotate-6" />
        <CircuitLine className="w-36 h-18 bottom-[25%] left-[25%] rotate-3" />

        {/* Data streams */}
        <div className="absolute top-0 left-[20%]">
          <DataStream delay={0} />
        </div>
        <div className="absolute top-0 left-[50%]">
          <DataStream delay={0.5} />
        </div>
        <div className="absolute top-0 left-[80%]">
          <DataStream delay={1} />
        </div>

        {/* Central AI brain visualization */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            transform: `translate(calc(-50% + ${mousePosition.x}px), calc(-50% + ${mousePosition.y}px))`,
            transition: "transform 0.3s ease-out",
          }}
        >
          {/* Outer rings */}
          <div className="absolute -inset-32 rounded-full border border-cyan-500/10 animate-spin-slow" />
          <div className="absolute -inset-24 rounded-full border border-purple-500/15 animate-spin-reverse" />
          <div
            className="absolute -inset-16 rounded-full border border-blue-500/20 animate-spin-slow"
            style={{ animationDuration: "15s" }}
          />

          {/* Orbital dots */}
          <div className="absolute -inset-32 animate-spin-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
          </div>
          <div className="absolute -inset-24 animate-spin-reverse">
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50" />
          </div>

          {/* Core glow */}
          <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl animate-pulse" />

          {/* Central icon */}
          <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/10 backdrop-blur-sm">
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
            <Brain className="w-12 h-12 text-cyan-400 animate-pulse" style={{ animationDuration: "3s" }} />
          </div>
        </div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 backdrop-blur-sm">
              <Zap className="h-6 w-6 text-cyan-400" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Eficaz Engine
            </span>
          </div>

          {/* Main content */}
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-white/10 text-xs text-cyan-400 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Powered by Artificial Intelligence
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
              <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
                O futuro do marketing
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                esta aqui
              </span>
            </h1>

            <p className="text-lg text-white/60 mb-10 leading-relaxed">
              Acelere sua producao de conteudo com inteligencia artificial de ultima geracao. Evolua sua estrategia em
              velocidade exponencial.
            </p>

            {/* Tech features */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Cpu, label: "Processamento Neural", desc: "IA de ultima geracao" },
                { icon: Rocket, label: "Alta Velocidade", desc: "Resultados instantaneos" },
                { icon: Network, label: "Multi-plataforma", desc: "Todas as redes" },
                { icon: Activity, label: "Evolucao Continua", desc: "Sempre melhorando" },
              ].map((feature, index) => (
                <div
                  key={feature.label}
                  className="group flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.06] hover:border-white/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 transition-transform group-hover:scale-110">
                    <feature.icon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white/90">{feature.label}</span>
                    <p className="text-xs text-white/40 mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Sistema Online</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-xs text-white/30">v2.0 Neural Engine</span>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full lg:w-1/2 xl:w-[45%] flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">Eficaz Engine</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h2>
            <p className="mt-2 text-muted-foreground">Entre com suas credenciais para acessar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {errorParam === "inactive" && (
              <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                  <Lock className="h-4 w-4" />
                </div>
                <span>Sua conta esta inativa. Contate o administrador.</span>
              </div>
            )}

            {errorParam === "service_unavailable" && (
              <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-600 dark:text-amber-400 animate-in fade-in slide-in-from-top-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Servico temporariamente indisponivel</p>
                  <p className="text-xs mt-0.5 opacity-80">O servidor esta passando por uma manutencao. Tente novamente em alguns minutos.</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={cn("text-sm font-medium transition-colors", focused === "email" && "text-primary")}
              >
                Email
              </Label>
              <div className="relative">
                <Mail
                  className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors",
                    focused === "email" ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  disabled={isLoading}
                  className="h-12 pl-12 pr-4 rounded-xl border-border/50 bg-secondary/30 transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className={cn("text-sm font-medium transition-colors", focused === "password" && "text-primary")}
              >
                Senha
              </Label>
              <div className="relative">
                <Lock
                  className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors",
                    focused === "password" ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  disabled={isLoading}
                  className="h-12 pl-12 pr-12 rounded-xl border-border/50 bg-secondary/30 transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                  <Lock className="h-4 w-4" />
                </div>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-xl text-base font-medium transition-all hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-10 text-center text-sm text-muted-foreground">Sistema interno da Eficaz Marketing</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 animate-pulse">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
