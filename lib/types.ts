export interface SOWFormData {
  // Identification
  sowTitle: string;
  sowNumber: string;
  buyerName: string;
  buyerEmail: string;
  buyerDepartment: string;

  // Vendor
  vendorName: string;
  vendorContactName: string;
  vendorContactEmail: string;

  // Work Details
  scopeOfWork: string;
  deliverables: string;
  outOfScope: string;

  // Timeline
  startDate: string;
  endDate: string;
  milestones: string;

  // Commercial
  contractValue: string;
  currency: string;
  paymentTerms: string;
  paymentMilestones: string;

  // Performance
  kpis: string;
  penaltyClauses: string;
  specialRequirements: string;
}

export interface AIValidationResult {
  approved: boolean;
  overallScore: number;
  summary: string;
  fieldFeedback: FieldFeedback[];
  blockers: string[];
  warnings: string[];
}

export interface FieldFeedback {
  field: string;
  status: "ok" | "warning" | "error";
  message: string;
}

export type SubmissionStatus = "idle" | "validating" | "validated" | "submitting" | "submitted" | "error";
