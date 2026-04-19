import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SOWFormData, AIValidationResult } from "@/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const formData: SOWFormData = await request.json();

    const prompt = buildValidationPrompt(formData);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const result = parseAIResponse(responseText);
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI validation error:", error);
    return NextResponse.json(
      { error: "Validation service unavailable. Please try again." },
      { status: 500 }
    );
  }
}

function buildValidationPrompt(data: SOWFormData): string {
  return `You are an expert procurement reviewer for Airtel's Supply Chain Management (SCM) division. Validate the following Statement of Work (SOW) form submission for completeness, coherence, and business sense.

Evaluate each field and return a structured JSON response. Be strict but fair — the goal is to ensure high-quality SOW submissions.

SOW DATA:
- SOW Title: ${data.sowTitle || "(empty)"}
- SOW Reference Number: ${data.sowNumber || "(empty)"}
- Buyer Name: ${data.buyerName || "(empty)"}
- Buyer Email: ${data.buyerEmail || "(empty)"}
- Buyer Department: ${data.buyerDepartment || "(empty)"}
- Vendor Name: ${data.vendorName || "(empty)"}
- Vendor Contact Name: ${data.vendorContactName || "(empty)"}
- Vendor Contact Email: ${data.vendorContactEmail || "(empty)"}
- Scope of Work: ${data.scopeOfWork || "(empty)"}
- Deliverables: ${data.deliverables || "(empty)"}
- Out of Scope: ${data.outOfScope || "(empty)"}
- Start Date: ${data.startDate || "(empty)"}
- End Date: ${data.endDate || "(empty)"}
- Milestones: ${data.milestones || "(empty)"}
- Contract Value: ${data.contractValue || "(empty)"} ${data.currency || "INR"}
- Payment Terms: ${data.paymentTerms || "(empty)"}
- Payment Milestones: ${data.paymentMilestones || "(empty)"}
- KPIs / Performance Metrics: ${data.kpis || "(empty)"}
- Penalty Clauses: ${data.penaltyClauses || "(empty)"}
- Special Requirements: ${data.specialRequirements || "(empty)"}

VALIDATION RULES:
1. All required fields (sowTitle, buyerName, buyerEmail, buyerDepartment, vendorName, scopeOfWork, deliverables, startDate, endDate, contractValue, paymentTerms, kpis) must be filled and meaningful.
2. Email fields must look like valid email addresses.
3. End date must be after start date.
4. Contract value must be a positive number.
5. Scope of Work must be descriptive (at least 20 words) and specific to a business activity.
6. Deliverables must clearly list what will be delivered.
7. KPIs must be measurable and specific.
8. The scope, deliverables, and KPIs must be internally consistent (they should relate to the same project).
9. Payment terms must make business sense.
10. SOW title should reflect the scope of work.

Return ONLY valid JSON in this exact format, no markdown, no explanation outside JSON:
{
  "approved": true/false,
  "overallScore": 0-100,
  "summary": "one paragraph summary of the validation result",
  "fieldFeedback": [
    { "field": "fieldName", "status": "ok|warning|error", "message": "specific feedback" }
  ],
  "blockers": ["list of critical issues that prevent submission"],
  "warnings": ["list of non-blocking issues to be aware of"]
}

Only set "approved" to true if overallScore >= 70 and there are zero blockers.`;
}

function parseAIResponse(text: string): AIValidationResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]) as AIValidationResult;
  } catch {
    return {
      approved: false,
      overallScore: 0,
      summary: "Unable to parse AI validation response. Please try again.",
      fieldFeedback: [],
      blockers: ["Validation service returned an unexpected response."],
      warnings: [],
    };
  }
}
