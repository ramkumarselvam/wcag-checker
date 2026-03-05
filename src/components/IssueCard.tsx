import { useState } from "react"

import type { AuditIssue } from "~types/audit"

export function IssueCard({ issue }: { issue: AuditIssue }) {
  const [expanded, setExpanded] = useState(false)

  const highlight = (selector: string) => {
    chrome.runtime.sendMessage({ type: "HIGHLIGHT_ELEMENT", selector })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 hover:bg-gray-50 transition">
        <div className="font-medium text-xs leading-snug">{issue.help}</div>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {issue.wcagCriteria.map((c) => (
            <span
              key={c}
              className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-mono">
              {c}
            </span>
          ))}
          <span className="text-[10px] text-gray-400 ml-auto">
            {issue.nodes.length} element{issue.nodes.length !== 1 ? "s" : ""}{" "}
            {expanded ? "▾" : "▸"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-3 py-2 space-y-2">
          <p className="text-xs text-gray-600">{issue.description}</p>
          <a
            href={issue.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline inline-block">
            Learn more ↗
          </a>

          {issue.nodes.map((node, i) => (
            <div key={i} className="bg-gray-50 rounded p-2 space-y-1">
              <div className="flex items-center justify-between">
                <code className="text-[10px] text-gray-700 break-all leading-tight">
                  {node.target.join(" > ")}
                </code>
                <button
                  onClick={() => highlight(node.target[0])}
                  className="shrink-0 ml-2 text-[10px] px-2 py-0.5 rounded bg-yellow-100 hover:bg-yellow-200 text-yellow-800 transition">
                  Highlight
                </button>
              </div>
              <pre className="text-[10px] text-gray-500 whitespace-pre-wrap break-all leading-tight max-h-16 overflow-auto">
                {node.html}
              </pre>
              {node.failureSummary && (
                <p className="text-[10px] text-red-600 leading-tight">{node.failureSummary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
