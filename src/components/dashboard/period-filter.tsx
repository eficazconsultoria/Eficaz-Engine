"use client"

import * as React from "react"
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  isAfter,
  isBefore,
  isEqual,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, ArrowRight, X, ArrowLeftRight } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7_days"
  | "last_week"
  | "this_month"
  | "last_30_days"
  | "custom"

export interface DateRangeValue {
  from: Date
  to: Date
}

export interface PeriodFilterValue {
  primary: DateRangeValue
  comparison?: DateRangeValue | null
  preset: PeriodPreset
  comparisonPreset?: PeriodPreset | "previous_period" | "previous_year" | null
}

interface PeriodFilterProps {
  value: PeriodFilterValue
  onChange: (value: PeriodFilterValue) => void
  showComparison?: boolean
  className?: string
}

const PRESET_LABELS: Record<PeriodPreset | "previous_period" | "previous_year", string> = {
  today: "Hoje",
  yesterday: "Ontem",
  this_week: "Esta semana",
  last_7_days: "Ultimos 7 dias",
  last_week: "Semana passada",
  this_month: "Este mes",
  last_30_days: "Ultimos 30 dias",
  custom: "Personalizado",
  previous_period: "Periodo anterior",
  previous_year: "Mesmo periodo ano anterior",
}

function getPresetRange(preset: PeriodPreset): DateRangeValue {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (preset) {
    case "today":
      return { from: today, to: today }
    case "yesterday": {
      const yesterday = subDays(today, 1)
      return { from: yesterday, to: yesterday }
    }
    case "this_week": {
      const weekStart = startOfWeek(today, { weekStartsOn: 0 })
      return { from: weekStart, to: today }
    }
    case "last_7_days":
      return { from: subDays(today, 6), to: today }
    case "last_week": {
      const lastWeekEnd = subDays(startOfWeek(today, { weekStartsOn: 0 }), 1)
      const lastWeekStart = startOfWeek(lastWeekEnd, { weekStartsOn: 0 })
      return { from: lastWeekStart, to: lastWeekEnd }
    }
    case "this_month": {
      const monthStart = startOfMonth(today)
      return { from: monthStart, to: today }
    }
    case "last_30_days":
      return { from: subDays(today, 29), to: today }
    case "custom":
      return { from: subDays(today, 6), to: today }
    default:
      return { from: today, to: today }
  }
}

function getComparisonRange(
  primaryRange: DateRangeValue,
  comparisonPreset: "previous_period" | "previous_year"
): DateRangeValue {
  const daysDiff = Math.ceil(
    (primaryRange.to.getTime() - primaryRange.from.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (comparisonPreset === "previous_period") {
    return {
      from: subDays(primaryRange.from, daysDiff + 1),
      to: subDays(primaryRange.from, 1),
    }
  }
  
  // previous_year
  return {
    from: new Date(
      primaryRange.from.getFullYear() - 1,
      primaryRange.from.getMonth(),
      primaryRange.from.getDate()
    ),
    to: new Date(
      primaryRange.to.getFullYear() - 1,
      primaryRange.to.getMonth(),
      primaryRange.to.getDate()
    ),
  }
}

function formatDateRange(range: DateRangeValue): string {
  if (isEqual(range.from, range.to)) {
    return format(range.from, "dd MMM yyyy", { locale: ptBR })
  }
  
  const sameYear = range.from.getFullYear() === range.to.getFullYear()
  const sameMonth = sameYear && range.from.getMonth() === range.to.getMonth()
  
  if (sameMonth) {
    return `${format(range.from, "dd", { locale: ptBR })} - ${format(range.to, "dd MMM yyyy", { locale: ptBR })}`
  }
  
  if (sameYear) {
    return `${format(range.from, "dd MMM", { locale: ptBR })} - ${format(range.to, "dd MMM yyyy", { locale: ptBR })}`
  }
  
  return `${format(range.from, "dd MMM yyyy", { locale: ptBR })} - ${format(range.to, "dd MMM yyyy", { locale: ptBR })}`
}

export function getDefaultPeriodFilter(): PeriodFilterValue {
  const primary = getPresetRange("last_7_days")
  const comparison = getComparisonRange(primary, "previous_period")
  return {
    primary,
    comparison,
    preset: "last_7_days",
    comparisonPreset: "previous_period",
  }
}

export function PeriodFilter({
  value,
  onChange,
  showComparison = true,
  className,
}: PeriodFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>({
    from: value.primary.from,
    to: value.primary.to,
  })
  const [tempPreset, setTempPreset] = React.useState<PeriodPreset>(value.preset)
  const [tempComparisonPreset, setTempComparisonPreset] = React.useState<
    "previous_period" | "previous_year" | null
  >(value.comparisonPreset as "previous_period" | "previous_year" | null)

  // Reset temp state when popover opens
  React.useEffect(() => {
    if (open) {
      setCustomRange({ from: value.primary.from, to: value.primary.to })
      setTempPreset(value.preset)
      setTempComparisonPreset(value.comparisonPreset as "previous_period" | "previous_year" | null)
    }
  }, [open, value])

  const handlePresetChange = (preset: PeriodPreset) => {
    setTempPreset(preset)
    if (preset !== "custom") {
      const range = getPresetRange(preset)
      setCustomRange({ from: range.from, to: range.to })
    }
  }

  const handleApply = () => {
    if (!customRange?.from || !customRange?.to) return
    
    const primaryRange: DateRangeValue = {
      from: customRange.from,
      to: customRange.to,
    }
    
    let comparison: DateRangeValue | null = null
    if (tempComparisonPreset) {
      comparison = getComparisonRange(primaryRange, tempComparisonPreset)
    }
    
    onChange({
      primary: primaryRange,
      comparison,
      preset: tempPreset,
      comparisonPreset: tempComparisonPreset,
    })
    
    setOpen(false)
  }

  const handleClearComparison = () => {
    onChange({
      ...value,
      comparison: null,
      comparisonPreset: null,
    })
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal gap-2 h-9",
              !value.primary && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:inline">
              {value.preset !== "custom" 
                ? PRESET_LABELS[value.preset]
                : formatDateRange(value.primary)}
            </span>
            <span className="sm:hidden">
              {formatDateRange(value.primary)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            {/* Presets */}
            <div className="p-3 border-b sm:border-b-0 sm:border-r">
              <p className="text-sm font-medium mb-2 text-muted-foreground">Periodo</p>
              <div className="grid gap-1">
                {(Object.keys(PRESET_LABELS) as PeriodPreset[])
                  .filter(p => p !== "previous_period" && p !== "previous_year")
                  .map((preset) => (
                    <Button
                      key={preset}
                      variant={tempPreset === preset ? "secondary" : "ghost"}
                      size="sm"
                      className="justify-start h-8 px-2"
                      onClick={() => handlePresetChange(preset)}
                    >
                      {PRESET_LABELS[preset]}
                    </Button>
                  ))}
              </div>
            </div>
            
            {/* Calendar */}
            <div className="p-3">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={(range) => {
                  setCustomRange(range)
                  setTempPreset("custom")
                }}
                numberOfMonths={1}
                disabled={(date) => isAfter(date, new Date())}
              />
              
              {showComparison && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Comparar com
                    </p>
                    <Select
                      value={tempComparisonPreset || "none"}
                      onValueChange={(v) =>
                        setTempComparisonPreset(
                          v === "none" ? null : (v as "previous_period" | "previous_year")
                        )
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Selecionar periodo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="previous_period">Periodo anterior</SelectItem>
                        <SelectItem value="previous_year">Mesmo periodo ano anterior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={!customRange?.from || !customRange?.to}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Comparison Badge */}
      {value.comparison && (
        <Badge
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1 h-7 cursor-default"
        >
          <span className="text-xs">
            vs {value.comparisonPreset === "previous_period" 
              ? "periodo anterior" 
              : formatDateRange(value.comparison)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={handleClearComparison}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
    </div>
  )
}

// Export helper to build query params
export function buildPeriodQueryParams(filter: PeriodFilterValue): URLSearchParams {
  const params = new URLSearchParams()
  
  // Set 'from' to start of day (00:00:00)
  const fromStart = new Date(filter.primary.from)
  fromStart.setHours(0, 0, 0, 0)
  
  // Set 'to' to end of day (23:59:59.999)
  const toEnd = new Date(filter.primary.to)
  toEnd.setHours(23, 59, 59, 999)
  
  params.set("from", fromStart.toISOString())
  params.set("to", toEnd.toISOString())
  
  if (filter.comparison) {
    const compareFromStart = new Date(filter.comparison.from)
    compareFromStart.setHours(0, 0, 0, 0)
    
    const compareToEnd = new Date(filter.comparison.to)
    compareToEnd.setHours(23, 59, 59, 999)
    
    params.set("compare_from", compareFromStart.toISOString())
    params.set("compare_to", compareToEnd.toISOString())
  }
  
  return params
}
