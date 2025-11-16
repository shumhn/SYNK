import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";

const MODEL = "gemini-1.5-flash-latest";

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: true, message: "GEMINI_API_KEY not set" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { label, range, metrics, comparison, deltas, filters } = body || {};
    if (!metrics || !comparison || !deltas) {
      return NextResponse.json(
        { error: true, message: "Invalid payload" },
        { status: 400 }
      );
    }

    const period = (label || "this period").toLowerCase();
    const prompt = `You are an analytics assistant. Summarize changes ${period} vs the previous comparable window. Be precise, objective, and concise (1–2 sentences). Avoid fluff.\n\nData:\n- Range: ${JSON.stringify(
      range || {}
    )}\n- Metrics: ${JSON.stringify(metrics)}\n- Comparison: ${JSON.stringify(
      comparison
    )}\n- Deltas: ${JSON.stringify(deltas)}\n- Filters: ${JSON.stringify(
      filters || {}
    )}\n\nWrite only the summary sentence(s).`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
        }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: true, message: json?.error?.message || "LLM request failed" },
        { status: 502 }
      );
    }

    const text =
      json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      json?.candidates?.[0]?.output_text?.trim() ||
      "";

    return NextResponse.json({ error: false, data: { summary: text } });
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
