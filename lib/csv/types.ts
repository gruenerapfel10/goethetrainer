export type AnalysisStepType = "plan" | "query" | "analysis" | "progress"
export type AnalysisStepStatus = "running" | "completed"
export type QueryOperation = "explore" | "filter" | "analyze" | "summarize"

export interface TableColumn {
  name: string
  dataType: string
  hasMissingValues?: boolean
  missingCount?: number
}

export interface DataTable {
  tableName: string
  displayName: string
  rowCount: number
  columns?: TableColumn[]
}

export interface QueryPlan {
  query: string
  rationale: string
  operation: QueryOperation
  priority: number
}

export interface AnalysisPlan {
  type: string
  description: string
  importance: number
}

export interface Finding {
  insight: string
  evidence: string[]
  confidence: number
}

export interface CsvStreamUpdate {
  id: string
  type: AnalysisStepType
  status: AnalysisStepStatus
  timestamp: number
  message: string
  title?: string
  plan?: {
    queries: QueryPlan[]
    analyses: AnalysisPlan[]
  }
  query?: string
  results?: any[]
  findings?: Finding[]
  analysisType?: string
  completedSteps?: number
  totalSteps?: number
  isComplete?: boolean
  overwrite?: boolean
  tables?: DataTable[]
}

export interface ProgressState {
  completedSteps: number
  totalSteps: number
  isComplete: boolean
  showRunningIndicators: boolean
  currentStage: string | null
  currentStageStatus: string | null
}
