"use client"

import * as React from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"

interface DateRangePickerProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")

  // Update manual inputs when dateRange changes
  useEffect(() => {
    if (dateRange?.from) {
      setFromDate(format(dateRange.from, "yyyy-MM-dd"))
    }
    if (dateRange?.to) {
      setToDate(format(dateRange.to, "yyyy-MM-dd"))
    }
  }, [dateRange])

  const handleManualDateChange = () => {
    if (fromDate && toDate) {
      const from = new Date(fromDate)
      const to = new Date(toDate)
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        onDateRangeChange({ from, to })
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value)
            if (e.target.value && toDate) {
              const from = new Date(e.target.value)
              const to = new Date(toDate)
              if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
                onDateRangeChange({ from, to })
              }
            }
          }}
          className="w-[120px]"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value)
            if (fromDate && e.target.value) {
              const from = new Date(fromDate)
              const to = new Date(e.target.value)
              if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
                onDateRangeChange({ from, to })
              }
            }
          }}
          className="w-[120px]"
        />
      </div>
      <Calendar
        initialFocus
        mode="range"
        defaultMonth={dateRange?.from}
        selected={dateRange}
        onSelect={onDateRangeChange}
        numberOfMonths={1}
        className="rounded-md border"
      />
    </div>
  )
} 