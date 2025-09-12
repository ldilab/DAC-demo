import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Brain,
  FileText,
  Beaker,
  CheckCircle2,
  Copy as CopyIcon,
  Settings,
  Square as StopIcon,
  KeyRound,
  AlertCircle,
  Search,
  Ban,
} from "lucide-react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Editor from "@monaco-editor/react";

/***************************
 * Skeleton & small UI bits *
 ***************************/
function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-slate-200/80 rounded-md ${className}`} />;
}

function CodeSkeleton({ lines = 6 }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i % 5 === 0 ? "w-4/5" : i % 3 === 0 ? "w-3/4" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/***************************
 * Existing small UI bits   *
 ***************************/
function CardBox({ icon, title, right, children }) {
  return (
    <div className="rounded-2xl border bg-white/70 backdrop-blur shadow-sm p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-800">
          {icon}
          <h3 className="font-semibold tracking-tight">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function MonoBlock({ code, className }) {
  return (
    <pre className={`rounded-xl border bg-white text-neutral-800 overflow-auto p-4 text-sm leading-relaxed ${className ?? ""}`}>
      <SyntaxHighlighter
        language="python"
        style={docco}
        wrapLongLines={true}
        // customStyle로 pre 스타일 조정: 배경 투명, 패딩 제거
        customStyle={{ background: "transparent", padding: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        // 내부 코드 태그에도 줄바꿈 스타일 적용 (안정성)
        codeTagProps={{ style: { whiteSpace: "pre-wrap", wordBreak: "break-word" } }}
      >
        {String(code ?? "")}
      </SyntaxHighlighter>
    </pre>
  );
}

export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      } else {
        const t = document.createElement("textarea");
        t.value = text;
        t.style.position = "fixed";
        t.style.top = "-9999px";
        document.body.appendChild(t);
        t.select();
        document.execCommand("copy");
        document.body.removeChild(t);
        setCopied(true);
      }
    } catch (e) {
      console.error("copy failed", e);
    }
  }, []);
  return { copy, copied };
}

function CopyButton({ text }) {
  const { copy, copied } = useClipboard();
  return (
    <button
      onClick={() => copy(text)}
      className="inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-sm hover:bg-gray-50"
      aria-label="Copy to clipboard"
    >
      <CopyIcon className="h-4 w-4" /> {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/****************
 *  Utilities   *
 ****************/
function stripFences(s) {
  if (!s) return "";
  let t = String(s).trim();
  t = t.replace(/^```[a-zA-Z]*\s*/m, "");
  t = t.replace(/```$/m, "");
  return t.trim();
}

function looseParseArray(text) {
  if (!text) return [];
  const raw = stripFences(text);
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v;
  } catch (e) {}
  try {
    let t = raw
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bNone\b/g, "null");
    t = t.replace(/'([a-zA-Z0-9_\- ]+)'(?=\s*:)/g, '"$1"');
    t = t.replace(/'([^']*)'/g, function (_m, inner) {
      return '"' + inner.replace(/\\\"/g, "\\\"") + '"';
    });
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("return (" + raw + ");");
    const val = fn();
    return Array.isArray(val) ? val : [];
  } catch (e) {
    console.warn("looseParseArray failed to parse", e);
    return [];
  }
}

function maskKey(k) {
  if (!k) return "";
  const start = k.slice(0, 5);
  const end = k.slice(-4);
  return `${start}..${end}`;
}

function indexBy(arr = [], key = "function") {
  const map = new Map();
  (arr || []).forEach((o) => {
    if (o && o[key]) map.set(o[key], o);
  });
  return map;
}

/***********************
 * Main Component      *
 ***********************/
export default function CanvasCodeSynthesis() {
  const [problem, setProblem] = useState(
    "Given a string and an integer k, determine if the string can be rearranged into a palindrome after removing k characters."
  );

  const [bundle, setBundle] = useState({
    codePlan: [],
    pseudocodeObjs: [],
    retrievalIdentifications: [],
    retrievalQueries: [],
    retrievalQueriesTarget: [],
    retrievalResults: [],
    retrievalRaw: [],
    finalCode: "",
    stream: {},
  });

  const [llm, setLlm] = useState({
    platform: "openai",
    model_name: "gpt-4o-mini",
    strategy: "greedy",
    kwargs: { temperature: 0.8, top_p: 1.0, max_tokens: 2048 },
  });

  const [showLlm, setShowLlm] = useState(false);

  // API Key modal
  const [apiKey, setApiKey] = useState("");
  const [tmpApiKey, setTmpApiKey] = useState("");
  const [rememberKey, setRememberKey] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(false);

  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);
  const [logLines, setLogLines] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("archcode_api_key");
      if (saved) {
        setApiKey(saved);
        setTmpApiKey(saved);
      }
    } catch {}
  }, []);

  const keySet = !!(apiKey && apiKey.trim());

  function handleCloseApiKeyModal(cancel = false) {
    setShowApiKeyModal(false);
    if (cancel) setPendingGenerate(false);
  }

  function openApiKeyModal() {
    let latest = apiKey;
    try {
      if (!latest) latest = localStorage.getItem("archcode_api_key") || "";
    } catch {}
    setTmpApiKey(latest);
    setShowApiKeyModal(true);
  }

  function handleSaveApiKey() {
    const k = (tmpApiKey || "").trim();
    if (!k) return;
    setApiKey(k);
    try {
      if (rememberKey) localStorage.setItem("archcode_api_key", k);
      else localStorage.removeItem("archcode_api_key");
    } catch {}

    setShowApiKeyModal(false);

    if (pendingGenerate) {
      setPendingGenerate(false);
      setTimeout(() => {
        streamFromApi();
      }, 50);
    }
  }

  function handleClearApiKey() {
    setApiKey("");
    setTmpApiKey("");
    try {
      localStorage.removeItem("archcode_api_key");
    } catch {}
    handleCloseApiKeyModal(true);
  }

  const handleStreamMessage = (msg) => {
    if (msg.code_plan || msg.code_plan_raw) {
      const planArrTxt = Array.isArray(msg.code_plan) ? msg.code_plan[0] : msg.code_plan_raw?.[0] || "";
      const plan = looseParseArray(planArrTxt);
      setBundle((prev) => ({
        ...prev,
        codePlan: plan,
        stream: { ...(prev.stream || {}), code_plan_raw: msg.code_plan_raw || msg.code_plan || [] },
      }));
      return;
    }

    if (msg.pseudocodes || msg.pseudocodes_raw) {
      const pcsTxt = Array.isArray(msg.pseudocodes) ? msg.pseudocodes[0] : msg.pseudocodes_raw?.[0] || "";
      const pcs = looseParseArray(pcsTxt);
      setBundle((prev) => ({
        ...prev,
        pseudocodeObjs: pcs,
        stream: { ...(prev.stream || {}), pseudocodes_raw: msg.pseudocodes_raw || msg.pseudocodes || [] },
      }));
      return;
    }

    if (msg.retrieval_identifications || msg.retrieval_identifications_raw) {
      const srcTxt = Array.isArray(msg.retrieval_identifications)
        ? msg.retrieval_identifications[0]
        : msg.retrieval_identifications_raw?.[0] || "";
      const parsed = looseParseArray(srcTxt);
      setBundle((prev) => ({
        ...prev,
        retrievalIdentifications: parsed,
        stream: { ...(prev.stream || {}), retrieval_identifications_raw: msg.retrieval_identifications_raw || msg.retrieval_identifications || [] },
      }));
      return;
    }

    if (msg.retrieval_queries || msg.retrieval_queries_raw) {
      const srcTxt = Array.isArray(msg.retrieval_queries)
        ? msg.retrieval_queries[0]
        : msg.retrieval_queries_raw?.[0] || "";
      const parsed = looseParseArray(srcTxt);
      setBundle((prev) => ({
        ...prev,
        retrievalQueries: parsed,
        stream: { ...(prev.stream || {}), retrieval_queries_raw: msg.retrieval_queries_raw || msg.retrieval_queries || [] },
      }));
      return;
    }

    if (msg.retrieval_queries_target) {
      const tgt = Array.isArray(msg.retrieval_queries_target) ? msg.retrieval_queries_target : [];
      setBundle((prev) => ({ ...prev, retrievalQueriesTarget: tgt }));
      return;
    }

    if (msg.retrieved_codes_with_backticks || msg.retrieved_codes_without_backticks) {
      const raw = msg.retrieved_codes_with_backticks || msg.retrieved_codes_without_backticks || [];
      const arr = Array.isArray(raw) ? raw : [raw];
      setBundle((prev) => ({
        ...prev,
        retrievalResults: prev.retrievalResults || [],
        retrievalRaw: arr,
        stream: { ...(prev.stream || {}), retrieved_raw: raw },
      }));
      return;
    }

    if (msg.code || msg.code_raw) {
      const final =
        (Array.isArray(msg.code) && msg.code[0]) ||
        (Array.isArray(msg.code_raw) && stripFences(msg.code_raw[0])) ||
        "";
      setBundle((prev) => ({
        ...prev,
        finalCode: final,
        stream: { ...(prev.stream || {}), code_raw: msg.code_raw || msg.code || [] },
      }));
      return;
    }
  };

  const steps = useMemo(() => {
    const plan =
      (Array.isArray(bundle.codePlan) && bundle.codePlan.length ? bundle.codePlan : bundle.retrievalIdentifications) || [];
    const byPcs = indexBy(bundle.pseudocodeObjs || []);
    const byIdent = indexBy(bundle.retrievalIdentifications || []);
    const byQuery = indexBy(bundle.retrievalQueries || []);

    const merged = plan.map((item, idx) => {
      const f = item?.function || item?.name || `function-${idx + 1}`;
      const fromP = byPcs.get(f) || {};
      const fromI = byIdent.get(f) || {};
      const fromQ = byQuery.get(f) || {};

      return {
        index: idx,
        function: f,
        functionality: item?.functionality || fromI?.functionality || fromP?.functionality || "",
        pseudocode: fromP?.pseudocode || fromI?.pseudocode || "",
        do_retrieval: Boolean(fromI?.do_retrieval ?? fromQ?.do_retrieval ?? false),
        retrieval_query: fromQ?.retrieval_query || "",
        targeted_queries: Array.isArray(bundle.retrievalQueriesTarget?.[idx])
          ? bundle.retrievalQueriesTarget[idx]
          : Array.isArray(bundle.retrievalQueriesTarget?.[0])
          ? bundle.retrievalQueriesTarget[0]
          : [],
      };
    });

    return merged;
  }, [bundle]);

  async function streamFromApi() {
    if (streaming) return;
    setStreaming(true);
    setBundle({
      codePlan: [],
      pseudocodeObjs: [],
      retrievalIdentifications: [],
      retrievalQueries: [],
      retrievalQueriesTarget: [],
      retrievalResults: [],
      retrievalRaw: [],
      finalCode: "",
      stream: {},
    });
    setLogLines([]);

    const payload = {
      nl_query: problem.trim(),
      llm_kwargs: llm,
      candidate_num: 1,
      api_key: apiKey || undefined,
    };

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        mode: "cors",
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;

          setLogLines((prev) => {
            const next = [...prev, line];
            if (next.length > 200) next.shift();
            return next;
          });

          try {
            const msg = JSON.parse(line);
            handleStreamMessage(msg);
          } catch (e) {
            // ignore non-json lines
          }
        }
      }

      const tail = buffer.trim();
      if (tail) {
        try {
          const msg = JSON.parse(tail);
          handleStreamMessage(msg);
        } catch {}
      }
    } catch (e) {
      if (e.name === "AbortError") {
        // cancelled
      } else {
        console.error("streamFromApi error", e);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stopStreaming() {
    if (abortRef.current) abortRef.current.abort();
  }

  /****************
   *   Render     *
   ****************/
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-slate-800 font-bold tracking-tight flex items-center gap-2">
            <img src="/ldi-logo.svg" width={30} height={30} alt="logo" />
            DAC DEMO
          </span>
          <div className="flex items-center gap-2">
            {llm.platform === "openai" && (
              <button
                onClick={openApiKeyModal}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                  keySet
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-amber-700 bg-amber-50 border-amber-200"
                }`}
                title={keySet ? "Manage API key" : "Set your OpenAI API key"}
              >
                <KeyRound className="h-3.5 w-3.5" />
                {keySet ? (
                  <span className="inline-flex items-center gap-1">
                    Key set <span className="font-mono">{maskKey(apiKey)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> API key needed
                  </span>
                )}
              </button>
            )}

            {streaming ? (
              <span className="inline-flex items-center gap-2 text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded-full" role="status" aria-live="polite">
                <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                Streaming…
              </span>
            ) : (
              <span className="text-xs text-slate-500">Idle</span>
            )}

            {/* TEST: Inject sample stream data */}
            <button
              onClick={() => {
                const sample = {
                  retrieval_queries_target: [["Query A", "Query B"]],
                  retrieved_codes_without_backticks: [["**Doc 1**\n```python\nprint('A1')\n```", "**Doc 2**\n```python\nprint('A2')\n```"], ["**Doc 3**\n```python\nprint('B1')\n```"]],
                };
                handleStreamMessage(sample);
              }}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border hover:bg-gray-50"
              title="Run sample mapping test"
            >
              Test
            </button>
          </div>
        </div>
      </header>

      {/* API KEY MODAL */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => handleCloseApiKeyModal(true)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-[92vw] max-w-md rounded-2xl border bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="h-5 w-5 text-slate-700" />
              <h3 className="font-semibold tracking-tight">Set LLM API key</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              You’re using the <span className="font-mono">openai</span> platform. Provide your API key to call the model from this app.
            </p>

            <label className="block text-sm mb-1 text-slate-700">OpenAI API key</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 mb-3 bg-white"
              placeholder="sk-..."
              value={tmpApiKey}
              onChange={(e) => setTmpApiKey(e.target.value)}
              autoFocus
            />

            <label className="inline-flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" className="h-4 w-4" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} />
              <span>Remember on this device (localStorage)</span>
            </label>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {apiKey && (
                  <button onClick={handleClearApiKey} className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50" title="Clear saved key">
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleCloseApiKeyModal(true)} className="inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleSaveApiKey} className="inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm bg-slate-900 text-white hover:opacity-90" disabled={!tmpApiKey.trim()}>
                  Save & Close
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Key is stored only on this device if you choose to remember it. It’s sent to your backend with the request payload you already defined.
            </p>
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Problem */}
          <CardBox
            icon={<FileText className="h-5 w-5" />}
            title="1) Problem Description"
            right={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLlm((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm hover:bg-gray-50"
                  disabled={streaming}
                >
                  <Settings className="h-4 w-4" /> Params
                </button>
                {!streaming ? (
                  <button
                    onClick={() => {
                      if (keySet) {
                        streamFromApi();
                      } else {
                        setPendingGenerate(true);
                        openApiKeyModal();
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    <Brain className="h-4 w-4" /> Generate
                  </button>
                ) : (
                  <button
                    onClick={stopStreaming}
                    className="inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm bg-rose-50 border-rose-200 text-rose-700"
                  >
                    <StopIcon className="h-4 w-4" /> Stop
                  </button>
                )}
              </div>
            }
          >
            <div className="relative">
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Describe what the program must do..."
                className="w-full rounded-xl border px-3 py-2 bg-white focus:outline-none focus:ring-2 ring-violet-200"
                rows={5}
                disabled={streaming}
                aria-busy={streaming}
              />
              {streaming && (
                <div className="absolute inset-0 rounded-xl bg-white/60 pointer-events-none" />
              )}
            </div>

            {showLlm && (
              <div className="mt-3 rounded-2xl border bg-white p-3 space-y-3" aria-busy={streaming}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <label className="text-sm">
                    <span className="block text-slate-600 mb-1">Platform</span>
                    <select className="w-full border rounded-md px-2 py-1" value={llm.platform} onChange={(e) => setLlm((p) => ({ ...p, platform: e.target.value }))} disabled={streaming}>
                      <option value="openai">openai</option>
                      <option disabled value="azure">azure</option>
                      <option disabled value="anthropic">anthropic</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="block text-slate-600 mb-1">Model</span>
                    <input className="w-full border rounded-md px-2 py-1" value={llm.model_name} onChange={(e) => setLlm((p) => ({ ...p, model_name: e.target.value }))} disabled={streaming} />
                  </label>
                  <label className="text-sm">
                    <span className="block text-slate-600 mb-1">Decoding</span>
                    <select className="w-full border rounded-md px-2 py-1" value={llm.strategy} onChange={(e) => setLlm((p) => ({ ...p, strategy: e.target.value }))} disabled={streaming}>
                      <option value="greedy">greedy</option>
                      <option value="nucleus">nucleus</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <label className="text-xs">
                    <span className="block mb-1">Temp</span>
                    <input type="number" step="0.01" min="0" max="2" className="w-full border rounded-md px-2 py-1" value={llm.kwargs.temperature} onChange={(e) => setLlm((p) => ({ ...p, kwargs: { ...p.kwargs, temperature: parseFloat(e.target.value) } }))} disabled={streaming} />
                  </label>
                  <label className="text-xs">
                    <span className="block mb-1">Top_p</span>
                    <input type="number" step="0.01" min="0" max="1" className="w-full border rounded-md px-2 py-1" value={llm.kwargs.top_p} onChange={(e) => setLlm((p) => ({ ...p, kwargs: { ...p.kwargs, top_p: parseFloat(e.target.value) } }))} disabled={streaming} />
                  </label>
                  <label className="text-xs">
                    <span className="block mb-1">Max tok</span>
                    <input type="number" step="1" min="1" className="w-full border rounded-md px-2 py-1" value={llm.kwargs.max_tokens} onChange={(e) => setLlm((p) => ({ ...p, kwargs: { ...p.kwargs, max_tokens: parseInt(e.target.value) } }))} disabled={streaming} />
                  </label>
                </div>
              </div>
            )}
            {logLines.length > 0 && (
              <details className="mt-3">
                <summary className="text-sm text-slate-600 cursor-pointer">Stream log (last {logLines.length} lines)</summary>
                <pre className="mt-2 text-xs bg-slate-50 border rounded-lg p-2 max-h-40 overflow-auto">{logLines.join("\n")}</pre>
              </details>
            )}
          </CardBox>

          {/* 2–6) Retrieval Pipeline */}
          <CardBox icon={<Beaker className="h-5 w-5" />} title="2–6) Retrieval Pipeline">
            {steps.length ? (
              steps.map((st, i) => (
                <div key={i} className="mb-6 rounded-2xl border p-4 bg-white">
                  <div>
                    {st.do_retrieval ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                        <Search className="h-3.5 w-3.5" /> Search
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                        <Ban className="h-3.5 w-3.5" /> No Search
                      </span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-lg">{st.function}</div>
                      <div className="text-sm text-slate-600">{st.functionality}</div>
                    </div>
                  </div>

                  {st.pseudocode && (
                    <div className="mt-3">
                      <div className="text-xs uppercase text-slate-500 mb-1">Pseudocode</div>
                      <MonoBlock code={st.pseudocode} />
                    </div>
                  )}

                  {st.retrieval_query && (
                    <div className="mt-3">
                      <div className="text-xs uppercase text-slate-500 mb-1">Retrieval Query</div>
                      <MonoBlock code={st.retrieval_query} />
                    </div>
                  )}
                </div>
              ))
            ) : streaming ? (
              // Skeleton for steps while streaming
              <div className="space-y-4" aria-live="polite">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="mb-2 rounded-2xl border p-4 bg-white">
                    <div className="mb-2">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                        <Spinner className="h-3 w-3" /> Preparing…
                      </span>
                    </div>
                    <Skeleton className="h-5 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="mt-3">
                      <div className="text-xs uppercase text-slate-500 mb-1">Pseudocode</div>
                      <CodeSkeleton lines={5} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic">No retrieval info yet.</div>
            )}

            {!steps.length && bundle.stream?.retrieval_identifications_raw?.[0] && (
              <details className="mt-3">
                <summary className="text-xs text-slate-500 cursor-pointer">Raw identifications (debug)</summary>
                <MonoBlock code={stripFences(bundle.stream?.retrieval_identifications_raw?.[0])} />
              </details>
            )}
          </CardBox>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Search Results */}
          <CardBox icon={<Search className="h-5 w-5" />} title="Search Results">
            {bundle.retrievalRaw && bundle.retrievalRaw.length ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-lg">Retrieved Codes</div>
                  <CopyButton text={Array.isArray(bundle.retrievalRaw) ? JSON.stringify(bundle.retrievalRaw, null, 2) : String(bundle.retrievalRaw)} />
                </div>

                <div className="space-y-2">
                  {bundle.retrievalRaw.flatMap((row, rowIdx) =>
                    Array.isArray(row)
                      ? row.map((item, i) => (
                          <div key={`r-${rowIdx}-${i}`}>
                            <MonoBlock code={item} />
                          </div>
                        ))
                      : [
                          <div key={`r-${rowIdx}`}>
                            <MonoBlock code={row} />
                          </div>,
                        ]
                  )}
                </div>
              </div>
            ) : streaming ? (
              <div className="space-y-3" role="status" aria-live="polite">
                <div className="flex items-center gap-2 text-slate-600">
                  <Spinner /> <span>Fetching code snippets…</span>
                </div>
                {Array.from({ length: 2 }).map((_, i) => (
                  <CodeSkeleton key={i} lines={7} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic">No retrieved code yet.</div>
            )}
          </CardBox>

          {/* Final Code */}
          <CardBox icon={<CheckCircle2 className="h-5 w-5" />} title="Final Code">
            {bundle.finalCode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-lg">Generated Code</div>
                  <CopyButton text={bundle.finalCode} />
                </div>
                <div className="rounded-2xl border overflow-hidden">
                  <Editor
                    height="70vh"
                    defaultLanguage="python"
                    language="python"
                    value={bundle.finalCode}
                    onChange={() => {}}
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      padding: { top: 12, bottom: 12 },
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>
            ) : streaming ? (
              <div className="space-y-3" role="status" aria-live="polite">
                <div className="flex items-center gap-2 text-slate-600">
                  <Spinner /> <span>Waiting for generated code…</span>
                </div>
                <div className="rounded-2xl border overflow-hidden">
                  <div className="h-[70vh] bg-white p-4">
                    <CodeSkeleton lines={18} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic">No code generated yet.</div>
            )}
          </CardBox>
        </div>
      </div>
    </div>
  );
}
