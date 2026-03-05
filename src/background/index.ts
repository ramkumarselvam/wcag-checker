export {}

// Open side panel when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RUN_AUDIT") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) { sendResponse({ error: "No active tab" }); return }
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: runAxeAudit,
          world: "MAIN"
        })
        sendResponse({ data: results[0]?.result })
      } catch (err: any) {
        sendResponse({ error: err.message })
      }
    })
    return true
  }

  if (message.type === "HIGHLIGHT_ELEMENT") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: highlightElement,
        args: [message.selector],
        world: "MAIN"
      })
    })
    return false
  }

  if (message.type === "CHECK_REFLOW") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id) { sendResponse({ error: "No active tab" }); return }
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: checkReflow,
          world: "MAIN"
        })
        const data = results[0]?.result
        console.log("[WCAG] Reflow result:", data)
        sendResponse({ data })
      } catch (err: any) {
        console.error("[WCAG] Reflow error:", err)
        sendResponse({ error: err.message || String(err) })
      }
    })()
    return true
  }

  if (message.type === "RESET_REFLOW") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: resetReflow,
        world: "MAIN"
      })
    })
    return false
  }

  if (message.type === "CHECK_TEXT_SPACING") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id) { sendResponse({ error: "No active tab" }); return }
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: checkTextSpacing,
          world: "MAIN"
        })
        sendResponse({ data: results[0]?.result })
      } catch (err: any) {
        sendResponse({ error: err.message || String(err) })
      }
    })()
    return true
  }

  if (message.type === "RESET_TEXT_SPACING") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: resetTextSpacing,
        world: "MAIN"
      })
    })
    return false
  }

  if (message.type === "CLEAR_HIGHLIGHTS") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: clearHighlights,
        world: "MAIN"
      })
    })
    return false
  }
})

// ============================================================
// INJECTED FUNCTIONS
// Each function below is serialized and injected into the page.
// They CANNOT reference any other function outside themselves.
// All helpers must be defined INSIDE the function body.
// ============================================================

function runAxeAudit() {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).axe === "undefined") {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js"
      script.onload = () => {
        ;(window as any).axe
          .run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }
          })
          .then(resolve)
          .catch(reject)
      }
      script.onerror = () => reject(new Error("Failed to load axe-core"))
      document.head.appendChild(script)
    } else {
      ;(window as any).axe
        .run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }
        })
        .then(resolve)
        .catch(reject)
    }
  })
}

function highlightElement(selector: string) {
  // Clear existing highlights
  document.querySelectorAll("[data-wcag-highlight]").forEach((el) => {
    ;(el as HTMLElement).style.outline = ""
    ;(el as HTMLElement).style.outlineOffset = ""
    delete (el as HTMLElement).dataset.wcagHighlight
  })
  try {
    const el = document.querySelector(selector)
    if (el) {
      ;(el as HTMLElement).style.outline = "3px solid #ef4444"
      ;(el as HTMLElement).style.outlineOffset = "2px"
      ;(el as HTMLElement).dataset.wcagHighlight = "true"
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  } catch {}
}

function clearHighlights() {
  document.querySelectorAll("[data-wcag-highlight]").forEach((el) => {
    ;(el as HTMLElement).style.outline = ""
    ;(el as HTMLElement).style.outlineOffset = ""
    delete (el as HTMLElement).dataset.wcagHighlight
  })
}

// --- WCAG 1.4.10 Reflow Check ---
// Everything is self-contained — no external references allowed
function checkReflow() {
  try {
    var REFLOW_WIDTH = 320
    var issues: {selector: string, html: string, fixedHtml: string, problem: string, fix: string}[] = []
    var bodyEl = document.body
    if (!bodyEl) return { passed: true, issues: [] }

    // Helper: get selector for an element
    function getSel(el: Element): string {
      try {
        if ((el as HTMLElement).id) return "#" + (el as HTMLElement).id
        var tag = el.tagName.toLowerCase()
        var parent = el.parentElement
        if (!parent) return tag
        var siblings = parent.querySelectorAll(":scope > " + tag)
        if (siblings.length > 1) {
          for (var i = 0; i < siblings.length; i++) {
            if (siblings[i] === el) return getSel(parent) + " > " + tag + ":nth-of-type(" + (i + 1) + ")"
          }
        }
        return getSel(parent) + " > " + tag
      } catch (e) {
        return el.tagName.toLowerCase()
      }
    }

    // Helper: get the opening tag only (not children/closing)
    function getOpenTag(el: HTMLElement): string {
      var clone = el.cloneNode(false) as HTMLElement
      var s = clone.outerHTML
      // For void elements, return as-is
      var voidTags: Record<string,boolean> = {img:true,br:true,hr:true,input:true,meta:true,link:true,source:true,track:true,col:true,embed:true,area:true,base:true,wbr:true}
      if (voidTags[el.tagName.toLowerCase()]) return s
      // For other elements, extract just the opening tag
      var closeTag = "</" + el.tagName.toLowerCase() + ">"
      if (s.endsWith(closeTag)) return s.slice(0, s.length - closeTag.length)
      return s
    }

    // Helper: generate fixed HTML based on issue type
    function getFixedHtml(el: HTMLElement, tag: string, issueType: string): string {
      var openTag = getOpenTag(el)
      var cs: CSSStyleDeclaration | null = null
      try { cs = window.getComputedStyle(el) } catch(e) {}

      if (tag === "table") {
        // Wrap table in scrollable div
        return '<div style="overflow-x: auto; max-width: 100%;">\n  ' + openTag + '...<!-- table content --></' + tag + '>\n</div>'
      }

      if (tag === "img") {
        // Add responsive styles to img
        var imgClone = el.cloneNode(false) as HTMLElement
        imgClone.style.maxWidth = "100%"
        imgClone.style.height = "auto"
        // Remove fixed width if present
        if (imgClone.getAttribute("width")) imgClone.removeAttribute("width")
        return imgClone.outerHTML
      }

      if (tag === "video" || tag === "iframe") {
        var mediaClone = el.cloneNode(false) as HTMLElement
        mediaClone.style.maxWidth = "100%"
        mediaClone.style.height = "auto"
        if (mediaClone.getAttribute("width")) mediaClone.removeAttribute("width")
        return mediaClone.outerHTML.replace("></" + tag + ">", ">...<!-- content --></" + tag + ">")
      }

      if (tag === "pre" || tag === "code") {
        var preClone = el.cloneNode(false) as HTMLElement
        preClone.style.overflowX = "auto"
        preClone.style.whiteSpace = "pre-wrap"
        preClone.style.wordBreak = "break-word"
        preClone.style.maxWidth = "100%"
        return getOpenTag(preClone) + "...<!-- content --></" + tag + ">"
      }

      if (cs && cs.display === "flex") {
        var flexClone = el.cloneNode(false) as HTMLElement
        flexClone.style.flexWrap = "wrap"
        // Show children with min-width fix
        var childHints = ""
        for (var i = 0; i < Math.min(el.children.length, 3); i++) {
          var childClone = el.children[i].cloneNode(false) as HTMLElement
          childClone.style.minWidth = "0"
          childHints += "\n  " + getOpenTag(childClone) + "...</" + el.children[i].tagName.toLowerCase() + ">"
        }
        if (el.children.length > 3) childHints += "\n  <!-- ... more children -->"
        return getOpenTag(flexClone) + childHints + "\n</" + tag + ">"
      }

      if (cs && (cs.display === "grid" || cs.display === "inline-grid")) {
        var gridClone = el.cloneNode(false) as HTMLElement
        gridClone.style.gridTemplateColumns = "repeat(auto-fit, minmax(min(100%, 280px), 1fr))"
        return getOpenTag(gridClone) + "...<!-- content --></" + tag + ">"
      }

      if (issueType === "inline-width" || issueType === "overflow") {
        var clone = el.cloneNode(false) as HTMLElement
        clone.style.width = "100%"
        clone.style.maxWidth = "100%"
        clone.style.boxSizing = "border-box"
        return getOpenTag(clone) + "...<!-- content --></" + tag + ">"
      }

      if (issueType === "min-width") {
        var mwClone = el.cloneNode(false) as HTMLElement
        mwClone.style.minWidth = "0"
        return getOpenTag(mwClone) + "...<!-- content --></" + tag + ">"
      }

      // Generic fix
      var genClone = el.cloneNode(false) as HTMLElement
      genClone.style.maxWidth = "100%"
      genClone.style.boxSizing = "border-box"
      return getOpenTag(genClone) + "...<!-- content --></" + tag + ">"
    }

    // Helper: suggest fix text based on element type
    function getFix(el: HTMLElement, tag: string): string {
      if (tag === "table") return 'Wrap table in <div style="overflow-x:auto"> for scrollable tables.'
      if (tag === "img" || tag === "video" || tag === "iframe") return "Add max-width:100%; height:auto; to make it responsive."
      if (tag === "pre" || tag === "code") return "Add overflow-x:auto; white-space:pre-wrap; word-break:break-word;"
      try {
        var cs = window.getComputedStyle(el)
        if (cs.display === "flex") return "Add flex-wrap:wrap to the flex container. Set min-width:0 on children."
        if (cs.display === "grid") return "Use grid-template-columns: repeat(auto-fit, minmax(min(100%,280px),1fr));"
        if (cs.position === "fixed" || cs.position === "absolute") return "Element uses position:" + cs.position + ". Use responsive positioning or media queries."
      } catch (e) {}
      return "Use max-width:100%; box-sizing:border-box; instead of fixed pixel widths."
    }

    // Inject constraint style
    var styleEl = document.createElement("style")
    styleEl.setAttribute("data-wcag-reflow-test", "1")
    styleEl.textContent = "html{overflow-x:hidden!important}body{width:320px!important;max-width:320px!important;min-width:0!important;overflow-x:visible!important;box-sizing:border-box!important}"
    document.head.appendChild(styleEl)

    // Force layout
    bodyEl.offsetHeight

    var skipTags: Record<string, boolean> = { script: true, style: true, meta: true, link: true, noscript: true, br: true, hr: true }
    var elements = bodyEl.querySelectorAll("*")
    var bodyRect = bodyEl.getBoundingClientRect()

    for (var idx = 0; idx < elements.length; idx++) {
      var node = elements[idx] as HTMLElement
      var tag = node.tagName.toLowerCase()
      if (skipTags[tag]) continue

      try {
        var cs = window.getComputedStyle(node)
        if (cs.display === "none" || cs.visibility === "hidden") continue
      } catch (e) { continue }

      var rect = node.getBoundingClientRect()
      if (rect.width < 5 && rect.height < 5) continue

      var rightEdge = rect.right - bodyRect.left

      // 1. Overflows past 320px
      if (rightEdge > REFLOW_WIDTH + 5) {
        issues.push({
          selector: getSel(node),
          html: node.outerHTML.substring(0, 300),
          fixedHtml: getFixedHtml(node, tag, "overflow"),
          problem: "Overflows by " + Math.round(rightEdge - REFLOW_WIDTH) + "px at 320px (element width: " + Math.round(rect.width) + "px)",
          fix: getFix(node, tag)
        })
      }

      // 2. Inline fixed width > 320
      if (node.style.width && node.style.width.indexOf("px") > -1 && parseFloat(node.style.width) > REFLOW_WIDTH) {
        issues.push({
          selector: getSel(node),
          html: node.outerHTML.substring(0, 300),
          fixedHtml: getFixedHtml(node, tag, "inline-width"),
          problem: "Inline width " + node.style.width + " exceeds 320px",
          fix: "Remove fixed width. Use max-width:100% instead."
        })
      }

      // 3. min-width > 320
      try {
        var minW = cs!.minWidth
        if (minW && minW !== "0px" && minW !== "auto" && parseFloat(minW) > REFLOW_WIDTH) {
          issues.push({
            selector: getSel(node),
            html: node.outerHTML.substring(0, 300),
            fixedHtml: getFixedHtml(node, tag, "min-width"),
            problem: "min-width:" + minW + " prevents shrinking below 320px",
            fix: "Remove or reduce min-width. Use @media(max-width:320px){min-width:0}"
          })
        }
      } catch (e) {}

      // 4. Flex nowrap overflow
      try {
        if (cs!.display === "flex" && cs!.flexWrap === "nowrap" && node.children.length > 0) {
          var childW = 0
          for (var ci = 0; ci < node.children.length; ci++) {
            childW += (node.children[ci] as HTMLElement).getBoundingClientRect().width
          }
          if (childW > REFLOW_WIDTH + 5) {
            issues.push({
              selector: getSel(node),
              html: node.outerHTML.substring(0, 300),
              fixedHtml: getFixedHtml(node, tag, "flex"),
              problem: "Flex nowrap children total " + Math.round(childW) + "px, exceeding 320px",
              fix: "Add flex-wrap:wrap. Set min-width:0 on children."
            })
          }
        }
      } catch (e) {}

      // 5. Table too wide
      if (tag === "table" && rect.width > REFLOW_WIDTH + 5) {
        issues.push({
          selector: getSel(node),
          html: node.outerHTML.substring(0, 300),
          fixedHtml: getFixedHtml(node, tag, "table"),
          problem: "Table is " + Math.round(rect.width) + "px wide",
          fix: 'Wrap in <div style="overflow-x:auto"> or use responsive table pattern.'
        })
      }

      // 6. Media without max-width
      if ((tag === "img" || tag === "video" || tag === "iframe") && rect.width > REFLOW_WIDTH + 5) {
        issues.push({
          selector: getSel(node),
          html: node.outerHTML.substring(0, 300),
          fixedHtml: getFixedHtml(node, tag, "media"),
          problem: tag + " is " + Math.round(rect.width) + "px wide",
          fix: "Add max-width:100%; height:auto;"
        })
      }
    }

    // Overall body scroll check
    if (bodyEl.scrollWidth > REFLOW_WIDTH + 5) {
      issues.unshift({
        selector: "body",
        html: "<body>",
        fixedHtml: '<body style="max-width: 100%; overflow-x: hidden; box-sizing: border-box;">',
        problem: "Page scrollWidth (" + bodyEl.scrollWidth + "px) exceeds 320px — requires horizontal scrolling",
        fix: "Page fails reflow at 320px. Ensure all containers use max-width:100% and no fixed widths exceed 320px."
      })
    }

    // Cleanup
    styleEl.remove()

    // Dedupe by selector
    var seen: Record<string, boolean> = {}
    var unique = issues.filter(function(item) {
      if (seen[item.selector]) return false
      seen[item.selector] = true
      return true
    })

    return { passed: unique.length === 0, issues: unique.slice(0, 50) }
  } catch (err) {
    return { passed: false, issues: [{ selector: "error", html: "", fixedHtml: "", problem: "Reflow check error: " + String(err), fix: "Please report this bug." }] }
  }
}

function resetReflow() {
  const style = document.querySelector("style[data-wcag-reflow-test]")
  if (style) style.remove()
}

// --- WCAG 1.4.12 Text Spacing Check ---
function checkTextSpacing() {
  try {
    function getSel(el: Element): string {
      try {
        if ((el as HTMLElement).id) return "#" + (el as HTMLElement).id
        var tag = el.tagName.toLowerCase()
        var parent = el.parentElement
        if (!parent) return tag
        var siblings = parent.querySelectorAll(":scope > " + tag)
        if (siblings.length > 1) {
          for (var i = 0; i < siblings.length; i++) {
            if (siblings[i] === el) return getSel(parent) + " > " + tag + ":nth-of-type(" + (i + 1) + ")"
          }
        }
        return getSel(parent) + " > " + tag
      } catch (e) { return el.tagName.toLowerCase() }
    }

    var issues: {selector: string, html: string, fixedHtml: string, problem: string, fix: string, property: string}[] = []

    function getOpenTag(el: HTMLElement): string {
      var clone = el.cloneNode(false) as HTMLElement
      var s = clone.outerHTML
      var voidTags: Record<string,boolean> = {img:true,br:true,hr:true,input:true,meta:true,link:true,source:true,track:true,col:true,embed:true,area:true,base:true,wbr:true}
      if (voidTags[el.tagName.toLowerCase()]) return s
      var closeTag = "</" + el.tagName.toLowerCase() + ">"
      if (s.endsWith(closeTag)) return s.slice(0, s.length - closeTag.length)
      return s
    }

    function getSpacingFixedHtml(el: HTMLElement, tag: string, issueType: string, cs: CSSStyleDeclaration): string {
      var clone = el.cloneNode(false) as HTMLElement

      if (issueType === "overflow") {
        // overflow:hidden clipping — switch to overflow:auto or visible, use min-height
        if (cs.overflow === "hidden") clone.style.overflow = "auto"
        if (cs.overflowX === "hidden") clone.style.overflowX = "auto"
        if (cs.overflowY === "hidden") clone.style.overflowY = "auto"
        if (cs.height && cs.height !== "auto") {
          clone.style.minHeight = cs.height
          clone.style.height = "auto"
        }
        return getOpenTag(clone) + "...<!-- content --></" + tag + ">"
      }

      if (issueType === "height") {
        // Fixed height — convert to min-height
        clone.style.minHeight = cs.height
        clone.style.height = "auto"
        if (cs.overflow === "hidden") clone.style.overflow = "visible"
        return getOpenTag(clone) + "...<!-- content --></" + tag + ">"
      }

      if (issueType === "text-overflow") {
        // Ellipsis truncation — remove nowrap and ellipsis
        clone.style.whiteSpace = "normal"
        clone.style.textOverflow = "clip"
        clone.style.overflow = "visible"
        return getOpenTag(clone) + "...<!-- content --></" + tag + ">"
      }

      if (issueType === "white-space") {
        // nowrap — switch to normal
        clone.style.whiteSpace = "normal"
        return getOpenTag(clone) + "...<!-- content --></" + tag + ">"
      }

      // Generic
      clone.style.overflow = "visible"
      clone.style.height = "auto"
      return getOpenTag(clone) + "...<!-- content --></" + tag + ">"
    }

    var styleEl = document.createElement("style")
    styleEl.setAttribute("data-wcag-text-spacing-test", "1")
    styleEl.textContent = "*{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important}p{margin-bottom:2em!important}"
    document.head.appendChild(styleEl)

    document.documentElement.offsetHeight

    var els = document.querySelectorAll("p,span,div,li,td,th,label,a,h1,h2,h3,h4,h5,h6,button,input,textarea,select,blockquote")

    for (var idx = 0; idx < els.length; idx++) {
      var node = els[idx] as HTMLElement
      try {
        var cs = window.getComputedStyle(node)
        if (!node.offsetParent && cs.position !== "fixed") continue
        if (!node.textContent || !node.textContent.trim()) continue
      } catch (e) { continue }

      var sel = getSel(node)

      // Clipping from overflow:hidden
      if ((cs.overflow === "hidden" || cs.overflowY === "hidden" || cs.overflowX === "hidden") &&
          (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1)) {
        var axis = node.scrollHeight > node.clientHeight + 1 ? "vertical" : "horizontal"
        issues.push({
          selector: sel, html: node.outerHTML.substring(0, 200),
          fixedHtml: getSpacingFixedHtml(node, node.tagName.toLowerCase(), "overflow", cs),
          problem: "Text clipped " + axis + "ly (overflow:hidden)",
          fix: "Remove overflow:hidden or use overflow:auto. Use min-height instead of fixed height.",
          property: "overflow"
        })
      }

      // Fixed height causing overflow
      if (cs.height && cs.height !== "auto" && cs.overflow !== "visible" && cs.overflow !== "auto" && node.scrollHeight > node.clientHeight + 2) {
        issues.push({
          selector: sel, html: node.outerHTML.substring(0, 200),
          fixedHtml: getSpacingFixedHtml(node, node.tagName.toLowerCase(), "height", cs),
          problem: "Fixed height (" + cs.height + ") clips text when spacing increases",
          fix: "Replace height:" + cs.height + " with min-height:" + cs.height,
          property: "height"
        })
      }

      // Ellipsis truncation
      if (cs.textOverflow === "ellipsis" && node.scrollWidth > node.clientWidth + 1) {
        issues.push({
          selector: sel, html: node.outerHTML.substring(0, 200),
          fixedHtml: getSpacingFixedHtml(node, node.tagName.toLowerCase(), "text-overflow", cs),
          problem: "Text truncated with ellipsis when spacing applied",
          fix: "Remove white-space:nowrap and text-overflow:ellipsis. Use white-space:normal.",
          property: "text-overflow"
        })
      }

      // Nowrap
      if (cs.whiteSpace === "nowrap" && node.scrollWidth > node.clientWidth + 2) {
        issues.push({
          selector: sel, html: node.outerHTML.substring(0, 200),
          fixedHtml: getSpacingFixedHtml(node, node.tagName.toLowerCase(), "white-space", cs),
          problem: "white-space:nowrap prevents wrapping when spacing increases",
          fix: "Use white-space:normal instead.",
          property: "white-space"
        })
      }
    }

    // Keep the style applied so user can visually inspect the spacing effect.
    // It gets removed when they click "Reset" (RESET_TEXT_SPACING).

    var seen: Record<string, boolean> = {}
    var unique = issues.filter(function(item) {
      var key = item.selector + item.property
      if (seen[key]) return false
      seen[key] = true
      return true
    })

    return { passed: unique.length === 0, issues: unique.slice(0, 50) }
  } catch (err) {
    return { passed: false, issues: [{ selector: "error", html: "", fixedHtml: "", problem: "Text spacing check error: " + String(err), fix: "Please report this bug.", property: "error" }] }
  }
}

function resetTextSpacing() {
  const style = document.querySelector("style[data-wcag-text-spacing-test]")
  if (style) style.remove()
}
