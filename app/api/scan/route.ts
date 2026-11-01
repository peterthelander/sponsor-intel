import { NextResponse } from "next/server";
import { runSponsorScan, type ScanInput } from "@/lib/sponsorScan";

const lookbackValues = new Set([7, 14, 30]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ScanInput>;
    const sponsor = String(body.sponsor ?? "").trim();

    if (!sponsor) {
      return NextResponse.json({ error: "Target Sponsor/PE Firm is required." }, { status: 400 });
    }

    const lookbackDays = Number(body.lookbackDays);

    if (!lookbackValues.has(lookbackDays)) {
      return NextResponse.json({ error: "Lookback window must be 7, 14, or 30 days." }, { status: 400 });
    }

    const result = await runSponsorScan({
      userName: String(body.userName ?? "").trim(),
      userTitle: String(body.userTitle ?? "").trim(),
      userFirm: String(body.userFirm ?? "").trim(),
      sponsor,
      lookbackDays: lookbackDays as 7 | 14 | 30,
      focusNotes: String(body.focusNotes ?? "").trim(),
      sectorFocus: String(body.sectorFocus ?? "Healthcare / Life Sciences").trim(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "The scan could not be completed. Check the server logs and retry." },
      { status: 500 },
    );
  }
}
