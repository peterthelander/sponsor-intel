import { GoogleGenAI, Type } from "@google/genai";

export type ScanInput = {
  userName: string;
  userTitle: string;
  userFirm: string;
  sponsor: string;
  lookbackDays: 7 | 14 | 30;
  focusNotes: string;
  sectorFocus: string;
};

export type SearchItem = {
  query: string;
  source: string;
  title: string;
  date: string;
  snippet: string;
  signal: "portfolio" | "credit" | "regulatory" | "competitor" | "deal";
};

export type ScanMode = "gemini" | "fallback";

const querySchema = {
  type: Type.OBJECT,
  properties: {
    searchQueries: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    inferredSectors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    diligenceAngles: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["searchQueries", "inferredSectors", "diligenceAngles"],
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const baseQueries = (input: ScanInput) => [
  "\"" + input.sponsor + "\" \"" + input.sectorFocus + "\" portfolio company news last " + input.lookbackDays + " days",
  `"${input.sponsor}" portfolio company refinancing last ${input.lookbackDays} days`,
  `"${input.sponsor}" add-on acquisition debt financing`,
  `"${input.sponsor}" credit rating outlook covenant liquidity`,
  `"${input.sponsor}" healthcare FDA Medicare antitrust portfolio company`,
  `"${input.sponsor}" private equity exits fundraising continuation vehicle`,
];

function normalizeJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1] ?? text;
}

async function maybeGenerateQueries(input: ScanInput) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      searchQueries: baseQueries(input),
      inferredSectors: inferSectors([input.sectorFocus, input.focusNotes].join(" ")),
      diligenceAngles: [
        "recent refinancing or amend-and-extend activity",
        "rating agency outlook changes and covenant headroom",
        "regulatory changes affecting EBITDA durability",
        "sponsor-backed add-on acquisition financing opportunities",
      ],
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Create targeted open-web search queries for a leveraged finance MD preparing for a financial sponsor meeting.

Input:
Sponsor: ${input.sponsor}
Lookback: ${input.lookbackDays} days
Sector focus: ${input.sectorFocus}
User: ${input.userName}, ${input.userTitle}, ${input.userFirm}
Focus notes: ${input.focusNotes || "No specific notes provided."}

Return 6 to 8 concise queries. Bias toward portfolio companies, refinancing, credit ratings, covenant pressure, M&A, sector regulation, exits, and competitor lender activity.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: querySchema,
    },
  });

  const parsed = JSON.parse(normalizeJson(response.text ?? "{}"));
  return {
    searchQueries: Array.isArray(parsed.searchQueries) && parsed.searchQueries.length
      ? parsed.searchQueries.slice(0, 8)
      : baseQueries(input),
    inferredSectors: Array.isArray(parsed.inferredSectors) ? parsed.inferredSectors : inferSectors([input.sectorFocus, input.focusNotes].join(" ")),
    diligenceAngles: Array.isArray(parsed.diligenceAngles) ? parsed.diligenceAngles : [],
  };
}

function inferSectors(notes: string) {
  const lowered = notes.toLowerCase();
  const sectors = [
    lowered.includes("health") || lowered.includes("life sciences") ? "healthcare and life sciences" : "",
    lowered.includes("software") || lowered.includes("technology") ? "software and technology" : "",
    lowered.includes("industrial") || lowered.includes("manufacturing") ? "industrials" : "",
    lowered.includes("consumer") || lowered.includes("retail") ? "consumer and retail" : "",
    lowered.includes("services") ? "business services" : "",
  ].filter(Boolean);

  return sectors.length ? sectors : ["business services", "healthcare", "software", "industrials"];
}

function mockSearchLoop(queries: string[], input: ScanInput, sectors: string[]): SearchItem[] {
  const date = todayIso();
  const sponsor = input.sponsor;
  const primarySector = sectors[0] ?? "business services";

  const library: Omit<SearchItem, "query">[] = [
    {
      source: "Rating agency press release",
      title: `${sponsor} portfolio issuer placed on negative outlook after margin compression`,
      date,
      signal: "credit",
      snippet:
        `Recent commentary flagged weaker free cash flow conversion, elevated first-lien leverage, and limited covenant cushion at a ${primarySector} platform. The key financing read-through is a likely amend-and-extend discussion rather than a clean refinancing unless EBITDA stabilizes.`,
    },
    {
      source: "Industry trade publication",
      title: `${sponsor}-backed platform evaluates tuck-in targets amid fragmented end markets`,
      date,
      signal: "deal",
      snippet:
        `Management is reportedly screening smaller add-on assets where purchase multiples remain below the original platform valuation. That points to a possible incremental term loan or delayed-draw facility opportunity if synergies are lender-underwritable.`,
    },
    {
      source: "Regulatory docket and policy coverage",
      title: `Sector policy updates create reimbursement and approval timing risk`,
      date,
      signal: "regulatory",
      snippet:
        `Recent FDA, Medicare, and antitrust developments could pressure launch timing, reimbursement assumptions, and sponsor exit optionality for exposed healthcare and life sciences assets. Lenders should haircut aggressive pro forma EBITDA until policy impact is clearer.`,
    },
    {
      source: "Deal press coverage",
      title: `Competing lenders pursue private credit mandate for sponsor-owned asset`,
      date,
      signal: "competitor",
      snippet:
        `Private credit funds appear active around sponsor-backed refinancing processes, with unitranche structures marketed for speed and execution certainty. Bank positioning should emphasize revolver depth, relationship lending, and disciplined add-on capacity.`,
    },
    {
      source: "Company update",
      title: `Portfolio company announces operational restructuring and liquidity actions`,
      date,
      signal: "portfolio",
      snippet:
        `A sponsor-backed company announced cost actions and working-capital initiatives after softer demand. This is a useful meeting prompt around liquidity runway, covenant reporting cadence, and whether sponsor support is defensive or growth-oriented.`,
    },
  ];

  return queries.flatMap((query, index) => {
    const first = library[index % library.length];
    const second = library[(index + 2) % library.length];
    return [
      { ...first, query },
      { ...second, query },
    ];
  });
}

function fallbackBrief(input: ScanInput, searchItems: SearchItem[], sectors: string[]) {
  const sponsor = input.sponsor;
  const userLine = [input.userName, input.userTitle, input.userFirm].filter(Boolean).join(" | ");
  const citations = searchItems.slice(0, 5).map((item) => `${item.source}: ${item.title}`);

  return `# Sponsor Intel Scan: ${sponsor}

${userLine ? `Prepared for ${userLine}. ` : ""}Lookback window: last  days. Sector focus: . Focus: ${input.focusNotes || "general sponsor and portfolio company update scan"}.

## Executive Portfolio Delta

- **Credit posture:** Recent open-web signals point to a mixed portfolio backdrop: margin pressure and tighter free cash flow conversion in selected assets, offset by continued sponsor appetite for add-on M&A where entry multiples are rational.
- **Financing implication:** The highest-probability near-term opportunities are amend-and-extend discussions, incremental term loan capacity for accretive tuck-ins, and revolver-led relationship positioning where private credit is competing on execution speed.
- **Meeting prompt:** Ask where ${sponsor} sees EBITDA durability versus one-time cost actions, and whether liquidity needs are offensive growth capital or defensive runway extension.

## Regulatory & Sector Headwinds

- **Primary sectors flagged:** ${sectors.join(", ")}.
- **Healthcare and life sciences lens:** FDA timing, Medicare reimbursement changes, and antitrust scrutiny should be translated directly into leverage capacity, covenant cushion, and exit timing sensitivity rather than accepted as generic market risk.
- **Underwriting watch item:** Push for sponsor views on policy-driven EBITDA adjustments, especially where pro forma synergies are doing too much work in the debt case.

## Competitor Movements

- **Private credit pressure:** Direct lenders are likely to lead with certainty, unitranche simplicity, and speed. Bank differentiation should center on relationship continuity, revolver utility, treasury wallet, and flexibility for follow-on acquisitions.
- **Pitch angle:** Position First Citizens as a disciplined financing partner that can support platform growth without stretching documentation beyond credit fundamentals.

## Strategic Pitch/Deal Ideas

- **Add-on acquisition line:** Offer a pre-cleared framework for small tuck-ins, with leverage guardrails tied to realized synergy capture and liquidity reporting.
- **Refinancing readiness:** Propose a covenant and maturity diagnostic across exposed portcos to identify assets suited for amend-and-extend versus full refinancing.
- **Sector-specific outreach:** For ${sectors[0] ?? "priority"} assets, prepare a short regulatory sensitivity memo that converts policy changes into debt capacity and pricing implications.

## Source Notes Reviewed

${citations.map((citation) => `- ${citation}`).join("\n")}

_Note: This workspace is running without GOOGLE_API_KEY, so the brief uses the built-in mock search evidence path. Add GOOGLE_API_KEY to enable Gemini query planning and synthesis._`;
}

export async function runSponsorScan(input: ScanInput) {
  const plan = await maybeGenerateQueries(input);
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    const fallbackItems = mockSearchLoop(plan.searchQueries, input, plan.inferredSectors);

    return {
      markdown: fallbackBrief(input, fallbackItems, plan.inferredSectors),
      queries: plan.searchQueries,
      searchItems: fallbackItems,
      mode: "fallback" as ScanMode,
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: `You are a senior leveraged finance banker preparing an MD-grade sponsor briefing. Use Google Search grounding for current evidence, strip out PR tone, and write concise institutional analysis.

Required sections:
1. Executive Portfolio Delta
2. Regulatory & Sector Headwinds
3. Competitor Movements
4. Strategic Pitch/Deal Ideas
5. Source Notes Reviewed

Format rules: Start with # Sponsor Intel: ${input.sponsor}. Do not write To, From, Date, Subject, memo headers, email framing, salutations, or sign-offs.

Audience:
${input.userName || "Managing Director"}${input.userTitle ? `, ${input.userTitle}` : ""}${input.userFirm ? ` at ${input.userFirm}` : ""}

Sponsor: ${input.sponsor}
Lookback: last ${input.lookbackDays} days
Sector focus: ${input.sectorFocus}
Focus notes: ${input.focusNotes || "No specific focus notes."}
Diligence angles: ${plan.diligenceAngles.join("; ")}

Search plan:
${plan.searchQueries.join("\n")}

Use Google Search grounding to research the sponsor and relevant portfolio-company or sector updates from the last ${input.lookbackDays} days. If no high-confidence recent item is found, say that directly. Do not use placeholders such as [Company X], [Sponsor], or generic bracketed entities. Do not invent portcos, transactions, pricing, ratings, or regulatory facts.

Write in markdown. Be direct, analytical, and useful for a live sponsor meeting. Do not invent facts beyond evidence; clearly frame implications and banker questions.`,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.35,
    },
  });

  return {
    markdown: response.text ?? fallbackBrief(input, [], plan.inferredSectors),
    queries: plan.searchQueries,
    searchItems: [],
    mode: "gemini" as ScanMode,
    model: "gemini-2.5-pro",
  };
}
