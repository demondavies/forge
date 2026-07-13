// Chrome Automation Target — the first real implementation behind the
// Browser Automation Framework's frozen TypeScript contract
// (src/hooks/browserAutomation.ts, unchanged by this sprint). Everything
// Chrome- or Edge-specific lives in this one file, mirroring how
// sunoServiceAdapter.ts is the only file allowed to know Suno exists:
// no other Rust module, and no TypeScript file above
// providers/chromeAutomationTarget.ts, ever needs to know CDP's wire
// format, its JSON shapes, or which ports it defaults to.
//
// Service Boundary, applied literally: this module assumes a browser the
// creator already launched (with --remote-debugging-port enabled) is
// sitting there, reachable over plain local HTTP/WebSocket. It never
// starts, stops, or configures a browser process itself — Human-Visible
// Automation means Forge only ever acts on a session a person can see
// and already made available on purpose.
//
// Most functions below ask a browser what it has open (discover, list),
// or do what a human could with the keyboard (front a tab, navigate).
// automate_suno_generate goes one step further: it evaluates a small,
// scoped JS script inside a Suno Generate tab to deliver the prompt and
// click Generate. Human-Visible Automation — the creator watches it
// happen in a tab they already have open.
use serde::{Deserialize, Serialize};
use std::time::Duration;

// The conventional remote-debugging ports most guides and tools default
// to for Chrome and Edge (both Chromium, both speak identical CDP — this
// file treats them as the same kind of target, not two separate ones).
// A creator must launch their browser with
// --remote-debugging-port=9222 (or 9223) for Forge to find it; this is a
// small, honest set of common defaults, not an exhaustive port scan.
const CANDIDATE_PORTS: [u16; 2] = [9222, 9223];

// The smallest honest fact about one open tab — mirrors BrowserTab
// (the TypeScript framework's own shape) field for field, plus the one
// extra piece of wiring (`websocket_debugger_url`) this file needs
// internally to send Page.navigate later. That field is stripped back
// out before crossing into the framework's own AutomationProgress.tabs —
// see list_chrome_tabs below.
#[derive(Serialize, Deserialize, Debug, Clone)]
struct RawChromeTarget {
    id: String,
    title: String,
    url: String,
    #[serde(rename = "type")]
    target_type: String,
    #[serde(rename = "webSocketDebuggerUrl")]
    websocket_debugger_url: Option<String>,
}

// The shape handed back across `invoke()` to the TypeScript side — field
// names matching BrowserTab (src/hooks/browserAutomation.ts) exactly, so
// the frontend can use whatever it receives with zero translation.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChromeTab {
    pub id: String,
    pub title: String,
    pub url: String,
}

// Mirrors AutomationProgress (src/hooks/browserAutomation.ts) field for
// field — `status` uses the exact same four strings
// ("Idle"/"InProgress"/"Completed"/"Failed") so the TypeScript wrapper
// can pass this straight through without reinterpreting it.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AutomationProgress {
    pub status: String,
    pub detail: String,
    pub tabs: Option<Vec<ChromeTab>>,
}

fn completed(detail: String, tabs: Option<Vec<ChromeTab>>) -> AutomationProgress {
    AutomationProgress {
        status: "Completed".to_string(),
        detail,
        tabs,
    }
}

fn failed(detail: String) -> AutomationProgress {
    AutomationProgress {
        status: "Failed".to_string(),
        detail,
        tabs: None,
    }
}

fn version_info(port: u16) -> Result<serde_json::Value, String> {
    let url = format!("http://127.0.0.1:{port}/json/version");
    ureq::get(&url)
        .timeout(Duration::from_millis(800))
        .call()
        .map_err(|e| e.to_string())?
        .into_json::<serde_json::Value>()
        .map_err(|e| e.to_string())
}

fn list_raw_targets(port: u16) -> Result<Vec<RawChromeTarget>, String> {
    let url = format!("http://127.0.0.1:{port}/json/list");
    let targets: Vec<RawChromeTarget> = ureq::get(&url)
        .timeout(Duration::from_millis(800))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;

    // Only real, navigable tabs — CDP's own list also includes service
    // workers, extension background pages, and other target types Forge
    // has no honest business locating or activating.
    Ok(targets.into_iter().filter(|t| t.target_type == "page").collect())
}

// "Discover Chrome/Edge instances running with remote debugging
// enabled" — tries each candidate port's cheap /json/version endpoint
// and stops at the first one that answers. Never launches a browser,
// never changes anything: a truthful "found" or "not found," nothing
// guessed in between.
#[tauri::command]
pub fn discover_chrome_targets() -> AutomationProgress {
    for port in CANDIDATE_PORTS {
        if let Ok(info) = version_info(port) {
            let browser = info
                .get("Browser")
                .and_then(|v| v.as_str())
                .unwrap_or("An unknown Chromium-based browser")
                .to_string();
            return completed(
                format!("Found {browser} on port {port} with remote debugging enabled."),
                None,
            );
        }
    }
    failed(format!(
        "No Chrome or Edge instance found on port(s) {CANDIDATE_PORTS:?} with remote debugging enabled."
    ))
}

// "Locate open tabs" — the same port probe as discovery, followed by the
// real tab list. Reports which port answered so a creator can see this
// wasn't guessed.
#[tauri::command]
pub fn list_chrome_tabs() -> AutomationProgress {
    for port in CANDIDATE_PORTS {
        if let Ok(targets) = list_raw_targets(port) {
            let tab_count = targets.len();
            let tabs: Vec<ChromeTab> = targets
                .into_iter()
                .map(|t| ChromeTab {
                    id: t.id,
                    title: t.title,
                    url: t.url,
                })
                .collect();
            return completed(format!("Found {tab_count} tab(s) on port {port}."), Some(tabs));
        }
    }
    failed("No Chrome or Edge instance is reachable with remote debugging enabled.".to_string())
}

// "Activate an existing tab" — confirms the tab id actually belongs to a
// reachable browser before asking it to come to the front (never guesses
// which port owns a given id), then calls CDP's own plain HTTP
// /json/activate/{id} endpoint — the same action a human clicking that
// tab in their own tab strip would trigger.
#[tauri::command]
pub fn activate_chrome_tab(tab_id: String) -> AutomationProgress {
    for port in CANDIDATE_PORTS {
        let Ok(targets) = list_raw_targets(port) else {
            continue;
        };
        if !targets.iter().any(|t| t.id == tab_id) {
            continue;
        }

        let url = format!("http://127.0.0.1:{port}/json/activate/{tab_id}");
        return match ureq::get(&url).timeout(Duration::from_millis(800)).call() {
            Ok(_) => completed(format!("Activated tab {tab_id} on port {port}."), None),
            Err(e) => failed(format!("Could not activate tab {tab_id}: {e}")),
        };
    }
    failed(format!(
        "No open tab with id \"{tab_id}\" was found on a reachable browser."
    ))
}

// "Navigate a tab to a supplied URL" — the one operation CDP's plain
// HTTP surface has no endpoint for; only its WebSocket debugger
// connection can ask an existing tab to navigate (Page.navigate). Still
// not page interaction: this is the exact command a human's own
// address-bar Enter key sends, nothing about the page's own content is
// ever read or touched.
#[tauri::command]
pub fn navigate_chrome_tab(tab_id: String, url: String) -> AutomationProgress {
    for port in CANDIDATE_PORTS {
        let Ok(targets) = list_raw_targets(port) else {
            continue;
        };
        let Some(target) = targets.into_iter().find(|t| t.id == tab_id) else {
            continue;
        };

        let Some(ws_url) = target.websocket_debugger_url else {
            return failed(format!("Tab {tab_id} has no debugger connection available."));
        };

        return match navigate_via_cdp(&ws_url, &url) {
            Ok(()) => completed(format!("Navigated tab {tab_id} to {url}."), None),
            Err(e) => failed(format!("Could not navigate tab {tab_id}: {e}")),
        };
    }
    failed(format!(
        "No open tab with id \"{tab_id}\" was found on a reachable browser."
    ))
}

// The one place this file speaks raw CDP wire protocol — a single
// request/response exchange over the tab's own WebSocket debugger
// connection, asking it to navigate, and nothing else. No DOM read, no
// script evaluation, no simulated input.
fn navigate_via_cdp(ws_url: &str, target_url: &str) -> Result<(), String> {
    use tungstenite::connect;
    use tungstenite::Message;

    let (mut socket, _) = connect(ws_url).map_err(|e| e.to_string())?;

    let command = serde_json::json!({
        "id": 1,
        "method": "Page.navigate",
        "params": { "url": target_url }
    });

    socket
        .send(Message::Text(command.to_string()))
        .map_err(|e| e.to_string())?;

    // CDP may interleave unrelated event notifications on the same
    // socket before replying to our own request — read until we see the
    // response matching our request id, bounded so a misbehaving
    // connection can never hang this command forever.
    for _ in 0..20 {
        let message = socket.read().map_err(|e| e.to_string())?;
        let Message::Text(text) = message else {
            continue;
        };
        let parsed: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
        if parsed.get("id").and_then(|v| v.as_i64()) == Some(1) {
            if let Some(error) = parsed.get("error") {
                return Err(error.to_string());
            }
            return Ok(());
        }
    }

    Err("Timed out waiting for a response to Page.navigate.".to_string())
}

// Same wire-protocol pattern as navigate_via_cdp, but sends
// Runtime.evaluate instead of Page.navigate and returns the JS result
// value as a String. max_messages is higher than the navigate equivalent
// because a live Suno page emits many events between our send and our
// response.
fn evaluate_via_cdp(ws_url: &str, expression: &str) -> Result<String, String> {
    use tungstenite::connect;
    use tungstenite::Message;

    let (mut socket, _) = connect(ws_url).map_err(|e| e.to_string())?;

    let command = serde_json::json!({
        "id": 1,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expression,
            "returnByValue": true
        }
    });

    socket
        .send(Message::Text(command.to_string()))
        .map_err(|e| e.to_string())?;

    for _ in 0..100 {
        let message = socket.read().map_err(|e| e.to_string())?;
        let Message::Text(text) = message else {
            continue;
        };
        let parsed: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| e.to_string())?;
        if parsed.get("id").and_then(|v| v.as_i64()) != Some(1) {
            continue;
        }
        if let Some(error) = parsed.get("error") {
            return Err(error.to_string());
        }
        if let Some(exc) = parsed.pointer("/result/exceptionDetails/text") {
            return Err(format!("JS exception: {}", exc.as_str().unwrap_or("unknown")));
        }
        if let Some(value) = parsed.pointer("/result/result/value") {
            return Ok(value.as_str().unwrap_or("").to_string());
        }
        return Err("Runtime.evaluate returned no value.".to_string());
    }

    Err("Timed out waiting for a response to Runtime.evaluate.".to_string())
}

// The JS result shape returned by SUNO_AUTOMATE_SCRIPT below.
#[derive(Deserialize)]
struct JsAutomationResult {
    ok: bool,
    message: String,
}

// "Deliver prompt and trigger generation on a Suno Generate tab" — the
// first Forge command that touches a page's own content. Scoped strictly
// to Suno Generate: locates the prompt textarea and the Create button by
// a cascade of resilient selectors, fills the textarea using the React
// synthetic-event pattern (so the framework sees the change), clicks the
// button, and reports back. Stops immediately and reports failure if
// either the input or the button cannot be found.
#[tauri::command]
pub fn automate_suno_generate(tab_id: String, prompt_text: String) -> AutomationProgress {
    for port in CANDIDATE_PORTS {
        let Ok(targets) = list_raw_targets(port) else {
            continue;
        };
        let Some(target) = targets.into_iter().find(|t| t.id == tab_id) else {
            continue;
        };

        let Some(ws_url) = target.websocket_debugger_url else {
            return failed(format!("Tab {tab_id} has no debugger connection available."));
        };

        // JSON-encode the prompt so it embeds as a safe JS string literal.
        let prompt_json = serde_json::to_string(&prompt_text).unwrap_or_else(|_| "\"\"".to_string());
        let script = SUNO_AUTOMATE_SCRIPT.replace("PROMPT_JSON", &prompt_json);

        return match evaluate_via_cdp(&ws_url, &script) {
            Ok(result_str) => match serde_json::from_str::<JsAutomationResult>(&result_str) {
                Ok(r) if r.ok => completed(r.message, None),
                Ok(r) => failed(r.message),
                Err(_) => failed(format!("Unexpected automation result: {result_str}")),
            },
            Err(e) => failed(format!("CDP evaluate failed: {e}")),
        };
    }

    failed(format!(
        "No open tab with id \"{tab_id}\" was found on a reachable browser."
    ))
}

// Injected into the Suno Generate tab via Runtime.evaluate. Uses a
// selector cascade so Suno UI changes don't immediately break it: more
// specific placeholders first, plain "textarea" as the final fallback.
// Fills with the React native-setter pattern so the framework sees the
// value change. Returns JSON so the Rust caller can report each step
// through the Production Console without parsing free-form strings.
const SUNO_AUTOMATE_SCRIPT: &str = r###"(() => {
  const selectors = [
    'textarea[placeholder*="Describe"]',
    'textarea[placeholder*="describe"]',
    'textarea[placeholder*="Enter"]',
    'textarea[placeholder*="style"]',
    'textarea[placeholder*="music"]',
    'textarea[placeholder*="prompt"]',
    'textarea[class*="prompt"]',
    'textarea',
  ];

  let input = null;
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) { input = el; break; }
  }

  if (!input) {
    return JSON.stringify({ ok: false, message: "Unable to locate prompt input on Suno page." });
  }

  try {
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(input, PROMPT_JSON);
    } else {
      input.value = PROMPT_JSON;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (e) {
    return JSON.stringify({ ok: false, message: "Failed to fill prompt input: " + String(e) });
  }

  const genBtn = Array.from(document.querySelectorAll('button')).find(b => {
    const t = (b.textContent || '').trim().toLowerCase();
    return (t === 'create' || t.includes('generate')) && !b.disabled;
  });

  if (!genBtn) {
    return JSON.stringify({ ok: false, message: "Unable to locate Generate button on Suno page." });
  }

  genBtn.click();
  return JSON.stringify({ ok: true, message: "Generate triggered." });
})()
"###;
