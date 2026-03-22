import { useState } from "react"
import type { ReflowResults } from "~types/audit"

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      className="text-[10px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition shrink-0">
      {copied ? "✓ Copied" : label}
    </button>
  )
}

export function ReflowPanel() {
  const [results, setResults] = useState<ReflowResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runCheck = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "CHECK_REFLOW" }, (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(resp)
          }
        })
      })
      if (!response) {
        setError("No response from background script. Try reloading the extension.")
      } else if (response.error) {
        setError(response.error)
      } else if (!response.data) {
        setError("Empty data returned. Check the browser console for errors.")
      } else {
        console.log("[WCAG ReflowPanel] raw data:", JSON.stringify(response.data, null, 2))
        setResults(response.data)
      }
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    chrome.runtime.sendMessage({ type: "RESET_REFLOW" })
    setResults(null)
  }

  const highlight = (selector: string) => {
    chrome.runtime.sendMessage({ type: "HIGHLIGHT_ELEMENT", selector })
  }

  return (
    <div className="space-y-3">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
        <h3 className="font-semibold text-indigo-800 text-xs mb-1">WCAG 1.4.10 — Reflow</h3>
        <p className="text-[11px] text-indigo-600 leading-snug">
          Content must reflow at 320px width (equivalent to 400% zoom at 1280px) without horizontal scrolling or loss of content.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={runCheck}
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-lg bg-violet-600 text-white font-medium text-xs hover:bg-violet-700 disabled:opacity-60 transition">
          {loading ? "Testing…" : "🔍 Test Reflow (320px)"}
        </button>
        {results && (
          <button
            onClick={reset}
            className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-xs hover:bg-gray-300 transition">
            Reset
          </button>
        )}
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{error}</div>
      )}

      {results && (
        <>
          <div className={`p-3 rounded-lg border text-center font-medium text-sm ${
            results.passed
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {results.passed ? "✅ Reflow check passed!" : `❌ ${results.issues.length} reflow issue${results.issues.length !== 1 ? "s" : ""} found`}
          </div>

          {results.issues.map((issue, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <code className="text-[10px] text-gray-600 break-all">{issue.selector}</code>
                  <button
                    onClick={() => highlight(issue.selector)}
                    className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-yellow-100 hover:bg-yellow-200 text-yellow-800">
                    Highlight
                  </button>
                </div>
                <div className="text-xs text-red-600 mt-1">⚠️ {issue.problem}</div>
                <div className="text-xs text-gray-600 mt-1">💡 {issue.fix}</div>
              </div>

              {/* Original HTML */}
              <div className="px-3 py-2 bg-red-50 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-red-700">❌ Current HTML</span>
                  <CopyButton text={issue.html} label="📋 Copy" />
                </div>
                <pre className="text-[10px] text-red-800 bg-red-100 rounded p-2 whitespace-pre-wrap break-all max-h-24 overflow-auto font-mono leading-relaxed">{issue.html}</pre>
              </div>

              {/* Fixed HTML removed */}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
