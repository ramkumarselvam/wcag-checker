export interface AuditIssue {
  id: string
  impact: "critical" | "serious" | "moderate" | "minor"
  description: string
  help: string
  helpUrl: string
  wcagCriteria: string[]
  nodes: AuditNode[]
}

export interface AuditNode {
  target: string[]
  html: string
  failureSummary: string
}

export interface AuditResults {
  url: string
  timestamp: string
  violations: AuditIssue[]
  passes: number
  incomplete: number
  inapplicable: number
  score: number
}

export type ImpactLevel = "critical" | "serious" | "moderate" | "minor"

export const IMPACT_ORDER: ImpactLevel[] = ["critical", "serious", "moderate", "minor"]

export const IMPACT_COLORS: Record<ImpactLevel, string> = {
  critical: "bg-red-600",
  serious: "bg-orange-500",
  moderate: "bg-yellow-500",
  minor: "bg-blue-400"
}

// --- Reflow & Text Spacing types ---

export interface ReflowIssue {
  selector: string
  html: string
  fixedHtml: string
  problem: string
  fix: string
}

export interface ReflowResults {
  passed: boolean
  issues: ReflowIssue[]
}

export interface TextSpacingIssue {
  selector: string
  html: string
  fixedHtml: string
  problem: string
  fix: string
  property: string
}

export interface TextSpacingResults {
  passed: boolean
  issues: TextSpacingIssue[]
}
