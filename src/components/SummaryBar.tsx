import type { AuditResults } from "~types/audit"

export function SummaryBar({ results }: { results: AuditResults }) {
  const totalViolations = results.violations.reduce((sum, v) => sum + v.nodes.length, 0)

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
        <div className="text-2xl font-bold text-green-600">{results.passes}</div>
        <div className="text-xs text-gray-500">Passed</div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
        <div className="text-2xl font-bold text-red-600">{totalViolations}</div>
        <div className="text-xs text-gray-500">Issues</div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
        <div
          className={`text-2xl font-bold ${
            results.score >= 90
              ? "text-green-600"
              : results.score >= 70
                ? "text-yellow-600"
                : "text-red-600"
          }`}>
          {results.score}%
        </div>
        <div className="text-xs text-gray-500">Score</div>
      </div>
    </div>
  )
}
