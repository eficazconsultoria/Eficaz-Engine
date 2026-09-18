"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SidebarSpacerContextValue {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

const SidebarSpacerContext = createContext<SidebarSpacerContextValue>({
  isCollapsed: false,
  setIsCollapsed: () => {},
})

export function useSidebarSpacer() {
  return useContext(SidebarSpacerContext)
}

export function SidebarSpacerProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Sync with localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored) setIsCollapsed(stored === "true")

    // Listen for storage changes from sidebar
    const handleStorage = () => {
      const stored = localStorage.getItem("sidebar-collapsed")
      if (stored) setIsCollapsed(stored === "true")
    }

    // Custom event for same-tab updates
    const handleSidebarChange = (e: CustomEvent) => {
      setIsCollapsed(e.detail.collapsed)
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("sidebar-collapse-change" as any, handleSidebarChange as any)

    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("sidebar-collapse-change" as any, handleSidebarChange as any)
    }
  }, [])

  return (
    <SidebarSpacerContext.Provider value={{ isCollapsed, setIsCollapsed }}>{children}</SidebarSpacerContext.Provider>
  )
}

export function SidebarSpacer({ className }: { className?: string }) {
  const { isCollapsed } = useSidebarSpacer()

  return (
    <div
      className={cn("shrink-0 transition-all duration-300 ease-out", isCollapsed ? "w-[68px]" : "w-[260px]", className)}
    />
  )
}
