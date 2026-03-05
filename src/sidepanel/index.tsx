import "../style.css"

import { useCallback, useEffect, useState } from "react"

import { IssueCard } from "~components/IssueCard"
import { ReflowPanel } from "~components/ReflowPanel"
import { SummaryBar } from "~components/SummaryBar"
import { TextSpacingPanel } from "~components/TextSpacingPanel"
import type { AuditIssue, AuditResults, ImpactLevel } from "~types/audit"
import { IMPACT_ORDER } from "~types/audit"

type Tab = "audit" | "reflow" | "spacing"

function SidePanel() {
  const [activeTab, setActiveTab] = useState<Tab>("audit")
  const [results, setResults] = useState<AuditResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoAudit, setAutoAudit] = useState(false)
  const [expandedImpact, setExpandedImpact] = useState<Set<ImpactLevel>>(
    new Set(["critical", "serious"])
  )

  const runAudit = useCallback(async () => {
    setLoading(true)
    setError(null)
    chrome.runtime.sendMessage({ type: "CLEAR_HIGHLIGHTS" })

    try {
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ type: "RUN_AUDIT" }, resolve)
      })

      if (response?.error) {
        setError(response.error)
        setResults(null)
        return
      }

      const raw = response.data
      if (!raw) {
        setError("No audit data returned")
        return
      }

      const violations: AuditIssue[] = raw.violations.map((v: any) => ({
        id: v.id,
        impact: v.impact as ImpactLevel,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        wcagCriteria: v.tags.filter((t: string) => t.startsWith("wcag")),
        nodes: v.nodes.map((n: any) => ({
          target: n.target,
          html: n.html,
          failureSummary: n.failureSummary || ""
        }))
      }))

      const totalChecks = raw.passes.length + raw.violations.length + raw.incomplete.length
      const score = totalChecks > 0 ? Math.round((raw.passes.length / totalChecks) * 100) : 100

      setResults({
        url: window.location?.href || "unknown",
        timestamp: new Date().toISOString(),
        violations,
        passes: raw.passes.length,
        incomplete: raw.incomplete.length,
        inapplicable: raw.inapplicable.length,
        score
      })
    } catch (err: any) {
      setError(err.message || "Audit failed")
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-audit on tab updates
  useEffect(() => {
    if (!autoAudit) return

    const listener = (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (changeInfo.status === "complete") {
        setTimeout(runAudit, 500)
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
    return () => chrome.tabs.onUpdated.removeListener(listener)
  }, [autoAudit, runAudit])

  const toggleImpact = (impact: ImpactLevel) => {
    setExpandedImpact((prev) => {
      const next = new Set(prev)
      next.has(impact) ? next.delete(impact) : next.add(impact)
      return next
    })
  }

  const exportJSON = () => {
    if (!results) return
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `wcag-audit-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const grouped = results
    ? IMPACT_ORDER.reduce(
        (acc, level) => {
          acc[level] = results.violations.filter((v) => v.impact === level)
          return acc
        },
        {} as Record<ImpactLevel, AuditIssue[]>
      )
    : null

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 text-sm">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3 mb-2">
          <h1 className="text-lg font-bold text-indigo-700">♿ WCAG Checker</h1>
          <button
            onClick={exportJSON}
            disabled={!results}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition">
            Export JSON
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-t border-gray-100">
          {([
            { id: "audit" as Tab, label: "Audit", icon: "🔍" },
            { id: "reflow" as Tab, label: "Reflow", icon: "📐" },
            { id: "spacing" as Tab, label: "Spacing", icon: "🔤" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Audit tab controls */}
        {activeTab === "audit" && (
          <div className="flex items-center gap-2 px-4 py-2">
            <button
              onClick={runAudit}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 transition">
              {loading ? "Running…" : "Run Audit"}
            </button>

            <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoAudit}
                onChange={(e) => setAutoAudit(e.target.checked)}
                className="rounded"
              />
              Auto
            </label>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
      {activeTab === "reflow" && <ReflowPanel />}
      {activeTab === "spacing" && <TextSpacingPanel />}
      {activeTab === "audit" && <>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            {error}
          </div>
        )}

        {results && <SummaryBar results={results} />}

        {grouped &&
          IMPACT_ORDER.map((level) => {
            const issues = grouped[level]
            if (issues.length === 0) return null
            const isExpanded = expandedImpact.has(level)

            return (
              <div key={level}>
                <button
                  onClick={() => toggleImpact(level)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition">
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        level === "critical"
                          ? "bg-red-600"
                          : level === "serious"
                            ? "bg-orange-500"
                            : level === "moderate"
                              ? "bg-yellow-500"
                              : "bg-blue-400"
                      }`}
                    />
                    <span className="font-semibold capitalize">{level}</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    {issues.length} issue{issues.length !== 1 ? "s" : ""}{" "}
                    {isExpanded ? "▾" : "▸"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-2 pl-2">
                    {issues.map((issue) => (
                      <IssueCard key={issue.id} issue={issue} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

        {results && results.violations.length === 0 && (
          <div className="text-center py-8 text-green-600 font-medium">
            ✅ No WCAG 2.1 AA violations found!
          </div>
        )}

        {!results && !loading && !error && (
          <div className="text-center py-12 text-gray-400">
            Click <strong>Run Audit</strong> to check this page
          </div>
        )}
      </>}
      </div>
    </div>
  )
}

export default SidePanel
