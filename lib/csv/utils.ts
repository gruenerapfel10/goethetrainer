import type { CsvStreamUpdate, ProgressState } from "@/lib/csv/types"

// Generate a timestamp within the last hour (for demo data)
export const getRecentTimestamp = (minutesAgo: number): number => {
  return Date.now() - minutesAgo * 60 * 1000
}

// Deduplicate updates by id, keeping the most recent version
export const deduplicateUpdates = (updates: CsvStreamUpdate[]): CsvStreamUpdate[] => {
  const updateMap = new Map<string, CsvStreamUpdate>()

  // Sort updates by timestamp to process newer updates last
  const sortedUpdates = [...updates].sort((a, b) => a.timestamp - b.timestamp)

  sortedUpdates.forEach((update) => {
    if (update.overwrite || !updateMap.has(update.id)) {
      updateMap.set(update.id, update)
    } else {
      const existing = updateMap.get(update.id)!
      if (update.status === "completed" && existing.status !== "completed") {
        updateMap.set(update.id, update)
      }
    }
  })

  return Array.from(updateMap.values())
}

// Filter out progress updates
export const filterProgressUpdates = (updates: CsvStreamUpdate[]): CsvStreamUpdate[] => {
  return updates.filter((update) => update.type !== "progress")
}

// Calculate progress state from updates
export const calculateProgressState = (updates: CsvStreamUpdate[]): ProgressState => {
  // Find the main progress update
  const progressUpdate = updates.find((u) => u.type === "progress")

  if (progressUpdate) {
    // If we have a progress update, use its values directly
    return {
      completedSteps: progressUpdate.completedSteps || 0,
      totalSteps: progressUpdate.totalSteps || 0,
      isComplete: progressUpdate.isComplete === true,
      showRunningIndicators: !progressUpdate.isComplete && updates.some((u) => u.status === "running"),
      currentStage: null,
      currentStageStatus: null,
    }
  }

  // If no progress update, calculate from individual updates
  const completed = updates.filter((u) => u.status === "completed").length
  const total = updates.length || 1 // Avoid division by zero

  // Find the most recent running or last completed analysis/plan update
  const runningAnalysis = updates
    .filter((u) => (u.type === "analysis" || u.type === "plan") && u.status === "running")
    .sort((a, b) => b.timestamp - a.timestamp)[0]

  const lastCompletedAnalysis = updates
    .filter((u) => (u.type === "analysis" || u.type === "plan") && u.status === "completed")
    .sort((a, b) => b.timestamp - a.timestamp)[0]

  // Use running stage if available, otherwise use last completed
  const stageUpdate = runningAnalysis || lastCompletedAnalysis

  return {
    completedSteps: completed,
    totalSteps: total,
    isComplete: false,
    showRunningIndicators: updates.some((u) => u.status === "running"),
    currentStage: stageUpdate
      ? stageUpdate.analysisType || stageUpdate.title || `${stageUpdate.type === "plan" ? "Planning" : "Analyzing"}`
      : null,
    currentStageStatus: stageUpdate ? stageUpdate.status : null,
  }
}

// Calculate progress percentage
export const calculateProgressPercentage = (completedSteps: number, totalSteps: number): number => {
  if (totalSteps === 0) return 0
  const percentage = (completedSteps / totalSteps) * 100
  return Math.min(Math.max(0, percentage), 100) // Clamp between 0 and 100
}
