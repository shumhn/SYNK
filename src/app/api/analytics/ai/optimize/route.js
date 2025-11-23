import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";

const MODEL = "gemini-1.5-flash-latest";

/**
 * POST /api/analytics/ai/optimize
 * Generates optimization recommendations based on anomalies
 * Body: { anomalies: [], stats: {}, scope: string }
 */
export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: true, message: "AI service unavailable" }, { status: 503 });

  try {
    const body = await req.json();
    const { anomalies, stats, scope } = body;

    if (!anomalies || anomalies.length === 0) {
      return NextResponse.json({ 
        error: false, 
        data: { recommendations: ["No significant anomalies detected. Operations appear stable."] } 
      });
    }

    // Construct Prompt
    const prompt = `
      You are an expert Operations Manager AI. Analyze the following performance anomalies for a ${scope} context and suggest 3 specific, actionable optimization strategies.
      
      Context:
      - Average Daily Output: ${stats.mean} tasks
      - Standard Deviation: ${stats.stdDev}
      - Recent Anomalies: ${JSON.stringify(anomalies.slice(0, 5))}
      
      Format your response as a JSON array of strings, where each string is a recommendation.
      Example: ["Investigate resource bottleneck on [Date]", "Redistribute workload to avoid burnout during spikes"]
      
      Keep recommendations concise (under 15 words each).
      Return ONLY the JSON array.
    `;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
        }),
      }
    );

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || "AI request failed");

    let text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
    
    // Clean up markdown code blocks if present
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let recommendations;
    try {
      recommendations = JSON.parse(text);
    } catch (e) {
      // Fallback if JSON parsing fails
      recommendations = [
        "Review resource allocation during peak periods.",
        "Investigate root causes of recent performance drops.",
        "Consider adjusting timelines for high-variance projects."
      ];
    }

    return NextResponse.json({ error: false, data: { recommendations } });

  } catch (e) {
    console.error("Error generating recommendations:", e);
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
