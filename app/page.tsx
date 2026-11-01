"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Clipboard,
  FileDown,
  Loader2,
  Radar,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";

type LookbackDays = 7 | 14 | 30;

type FormState = {
  userName: string;
  userTitle: string;
  userFirm: string;
  sponsor: string;
  lookbackDays: LookbackDays;
  focusNotes: string;
  sectorFocus: string;
};

type ScanResponse = {
  markdown: string;
  queries: string[];
  mode: "gemini" | "fallback";
  model?: string;
};

const profileStorageKey = "sponsor-intel-profile";


const progressSteps = [
  "Analyzing profile and focus notes...",
  "Generating targeted search queries...",
  "Scanning recent open-web and portfolio news...",
  "Synthesizing MD-grade intelligence briefing...",
];

const initialForm: FormState = {
  userName: "",
  userTitle: "Managing Director",
  userFirm: "Example Advisory",
  sponsor: "",
  lookbackDays: 14,
  focusNotes: "",
  sectorFocus: "Healthcare / Life Sciences",
};

function MarkdownBlock({ markdown }: { markdown: string }) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);

  return <article className="brief-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineMarkdown(value: string) {
  return escapeHtml(value).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/_(.*?)_/g, "<em>$1</em>");
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("# ")) {
      closeList();
      html.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeList();
  return html.join("");
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [phase, setPhase] = useState<"input" | "loading" | "brief">("input");
  const [activeStep, setActiveStep] = useState(0);
  const [brief, setBrief] = useState<ScanResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(profileStorageKey);
    if (!saved) return;

    try {
      const profile = JSON.parse(saved) as Partial<FormState>;
      setForm((current) => ({
        ...current,
        userName: profile.userName ?? current.userName,
        userTitle: profile.userTitle ?? current.userTitle,
        userFirm: profile.userFirm ?? current.userFirm,
        sectorFocus: profile.sectorFocus ?? current.sectorFocus,
      }));
    } catch {
      window.localStorage.removeItem(profileStorageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      profileStorageKey,
      JSON.stringify({
        userName: form.userName,
        userTitle: form.userTitle,
        userFirm: form.userFirm,
        sectorFocus: form.sectorFocus,
      }),
    );
  }, [form.userFirm, form.userName, form.userTitle, form.sectorFocus]);

  useEffect(() => {
    if (phase !== "loading") return;
    const interval = window.setInterval(() => {
      setActiveStep((step) => Math.min(step + 1, progressSteps.length - 1));
    }, 1250);

    return () => window.clearInterval(interval);
  }, [phase]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const runScan = async () => {
    setError("");
    setCopied(false);

    if (!form.sponsor.trim()) {
      setError("Enter a target sponsor or private equity firm before running the scan.");
      return;
    }

    setPhase("loading");
    setActiveStep(0);
    setBrief(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Scan failed.");
      }

      setBrief(payload as ScanResponse);
      setPhase("brief");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Scan failed.");
      setPhase("input");
    }
  };

  const copyBrief = async () => {
    if (!brief?.markdown) return;
    await navigator.clipboard.writeText(brief.markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="min-h-screen px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="no-print border-b border-line pb-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 border border-line bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-pine">
              <Radar size={14} />
              Stateless Research Utility
            </div>
            <h1 className="font-serif text-4xl leading-none text-ink sm:text-5xl">Sponsor Intel</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-graphite sm:text-base">
              On-demand sponsor and portfolio intelligence translated into leveraged finance talking points.
            </p>
          </div>
        </header>

        {phase === "input" && (
          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="no-print border border-line bg-white/70 p-5 shadow-focus-panel">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center bg-pine text-white">
                  <UserRound size={21} />
                </div>
                <div>
                  <h2 className="font-serif text-2xl">User Profile</h2>
                  <p className="text-sm text-steel">Stored only in this browser.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <Field label="Name" icon={<UserRound size={16} />}>
                  <input
                    value={form.userName}
                    onChange={(event) => updateForm("userName", event.target.value)}
                    placeholder="e.g., Alex Morgan"
                    className="w-full border border-line bg-white px-3 py-2.5 outline-none ring-pine/20 transition focus:ring-4"
                  />
                </Field>
                <Field label="Title" icon={<BriefcaseBusiness size={16} />}>
                  <input
                    value={form.userTitle}
                    onChange={(event) => updateForm("userTitle", event.target.value)}
                    className="w-full border border-line bg-white px-3 py-2.5 outline-none ring-pine/20 transition focus:ring-4"
                  />
                </Field>
                <Field label="Firm" icon={<Building2 size={16} />}>
                  <input
                    value={form.userFirm}
                    onChange={(event) => updateForm("userFirm", event.target.value)}
                    className="w-full border border-line bg-white px-3 py-2.5 outline-none ring-pine/20 transition focus:ring-4"
                  />
                </Field>
              </div>
            </aside>

            <section className="border border-line bg-white p-5 shadow-focus-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl">Sponsor Inputs</h2>
                  <p className="mt-1 text-sm text-steel">Tell the scanner who matters and where to aim the diligence lens.</p>
                </div>
                <Search className="mt-1 text-copper" size={24} />
              </div>

              <div className="mt-6 grid gap-5">
                <Field label="Target Sponsor / PE Firm">
                  <input
                    value={form.sponsor}
                    onChange={(event) => updateForm("sponsor", event.target.value)}
                    placeholder="e.g., Welsh, Carson, Anderson & Stowe"
                    className="w-full border border-line bg-paper/60 px-4 py-3 text-lg outline-none ring-pine/20 transition focus:ring-4"
                  />
                </Field>

                <Field label="Lookback Window">
                  <div className="grid grid-cols-3 gap-2">
                    {([7, 14, 30] as LookbackDays[]).map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => updateForm("lookbackDays", days)}
                        className={clsx(
                          "border px-4 py-3 text-sm font-semibold transition",
                          form.lookbackDays === days
                            ? "border-pine bg-pine text-white"
                            : "border-line bg-white text-graphite hover:border-pine/60",
                        )}
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Sector Focus">
                  <select
                    value={form.sectorFocus}
                    onChange={(event) => updateForm("sectorFocus", event.target.value)}
                    className="w-full border border-line bg-paper/60 px-4 py-3 outline-none ring-pine/20 transition focus:ring-4"
                  >
                    <option value="Healthcare / Life Sciences">Healthcare / Life Sciences</option>
                    <option value="Software / Technology">Software / Technology</option>
                    <option value="Business Services">Business Services</option>
                    <option value="Industrials">Industrials</option>
                    <option value="Consumer / Retail">Consumer / Retail</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Infrastructure / Energy">Infrastructure / Energy</option>
                    <option value="Generalist / Cross-Sector">Generalist / Cross-Sector</option>
                  </select>
                </Field>

                <Field label="Sponsor Interaction Notes or Specific Focus Areas">
                  <textarea
                    value={form.focusNotes}
                    onChange={(event) => updateForm("focusNotes", event.target.value)}
                    rows={7}
                    placeholder="e.g., focusing on healthcare and life sciences portcos; prepare questions on reimbursement exposure, add-on financing, and maturity walls."
                    className="w-full resize-none border border-line bg-paper/60 px-4 py-3 leading-6 outline-none ring-pine/20 transition focus:ring-4"
                  />
                </Field>

                {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

                <button
                  type="button"
                  onClick={runScan}
                  className="inline-flex items-center justify-center gap-3 bg-ink px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-pine focus:outline-none focus:ring-4 focus:ring-pine/25"
                >
                  <Sparkles size={18} />
                  Run Sponsor Intel Scan
                </button>
              </div>
            </section>
          </section>
        )}

        {phase === "loading" && (
          <section className="mx-auto w-full max-w-3xl border border-line bg-white p-6 shadow-focus-panel sm:p-8">
            <div className="flex items-center gap-4 border-b border-line pb-6">
              <div className="flex size-12 items-center justify-center bg-ink text-white">
                <Loader2 className="animate-spin" size={24} />
              </div>
              <div>
                <h2 className="font-serif text-3xl">Running Sponsor Intel Scan</h2>
                <p className="mt-1 text-sm text-steel">{form.sponsor} | {form.lookbackDays}-day lookback</p>
              </div>
            </div>

            <div className="mt-7 grid gap-4">
              {progressSteps.map((step, index) => {
                const complete = index < activeStep;
                const active = index === activeStep;

                return (
                  <div
                    key={step}
                    className={clsx(
                      "flex items-center gap-4 border p-4 transition",
                      active || complete ? "border-pine/30 bg-ice/70" : "border-line bg-paper/50",
                    )}
                  >
                    <div
                      className={clsx(
                        "flex size-8 shrink-0 items-center justify-center",
                        complete ? "bg-pine text-white" : active ? "bg-copper text-white" : "bg-white text-steel",
                      )}
                    >
                      {complete ? <BadgeCheck size={17} /> : active ? <Loader2 className="animate-spin" size={17} /> : index + 1}
                    </div>
                    <div className={clsx("text-sm font-semibold", active || complete ? "text-ink" : "text-steel")}>{step}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {phase === "brief" && brief && (
          <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <aside className="no-print h-fit border border-line bg-white/80 p-4 shadow-focus-panel">
              <div className="font-serif text-xl">Brief Controls</div>
              <div className="mt-3 border border-line bg-paper/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-graphite">
                LLM Mode: {brief.mode === "gemini" ? brief.model ?? "Gemini" : "Fallback mock"}
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={copyBrief}
                  className="inline-flex items-center justify-center gap-2 border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-pine"
                >
                  <Clipboard size={16} />
                  {copied ? "Copied" : "Copy Markdown"}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine"
                >
                  <FileDown size={16} />
                  Print to PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("input")}
                  className="mt-2 px-4 py-3 text-sm font-semibold text-pine transition hover:bg-ice"
                >
                  Run another scan
                </button>
              </div>

              <div className="mt-6 border-t border-line pt-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-steel">Queries Generated</div>
                <ul className="mt-3 grid gap-2 text-xs leading-5 text-graphite">
                  {brief.queries.slice(0, 6).map((query) => (
                    <li key={query} className="border border-line bg-paper/60 p-2">{query}</li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="print-shell border border-line bg-white p-5 shadow-focus-panel sm:p-8">
              <MarkdownBlock markdown={brief.markdown} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-steel">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
