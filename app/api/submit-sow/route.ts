import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SOWFormData, AIValidationResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { formData, validationResult }: { formData: SOWFormData; validationResult: AIValidationResult } =
      await request.json();

    if (!validationResult?.approved) {
      return NextResponse.json(
        { error: "SOW must pass AI validation before submission." },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("sow_submissions")
      .insert([
        {
          sow_title: formData.sowTitle,
          sow_number: formData.sowNumber,
          buyer_name: formData.buyerName,
          buyer_email: formData.buyerEmail,
          buyer_department: formData.buyerDepartment,
          vendor_name: formData.vendorName,
          vendor_contact_name: formData.vendorContactName,
          vendor_contact_email: formData.vendorContactEmail,
          scope_of_work: formData.scopeOfWork,
          deliverables: formData.deliverables,
          out_of_scope: formData.outOfScope,
          start_date: formData.startDate,
          end_date: formData.endDate,
          milestones: formData.milestones,
          contract_value: parseFloat(formData.contractValue),
          currency: formData.currency,
          payment_terms: formData.paymentTerms,
          payment_milestones: formData.paymentMilestones,
          kpis: formData.kpis,
          penalty_clauses: formData.penaltyClauses,
          special_requirements: formData.specialRequirements,
          ai_validation_score: validationResult.overallScore,
          ai_validation_summary: validationResult.summary,
          status: "pending_review",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to save SOW. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id, sowNumber: data.sow_number });
  } catch (error) {
    console.error("Submit SOW error:", error);
    return NextResponse.json(
      { error: "Submission failed. Please try again." },
      { status: 500 }
    );
  }
}
