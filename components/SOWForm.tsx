"use client";

import { useState, useCallback } from "react";
import { SOWFormData, AIValidationResult, SubmissionStatus, FieldFeedback } from "@/lib/types";
import ValidationPanel from "./ValidationPanel";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];

const DEPARTMENTS = [
  "Supply Chain Management",
  "Network Infrastructure",
  "IT & Technology",
  "Enterprise Solutions",
  "Finance & Procurement",
  "Operations",
  "Human Resources",
  "Legal & Compliance",
  "Marketing",
  "Other",
];

const PAYMENT_TERMS_OPTIONS = [
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
  "Milestone-based",
  "Advance Payment",
  "50% advance, 50% on delivery",
  "Monthly installments",
  "Custom",
];

const emptyForm: SOWFormData = {
  sowTitle: "",
  sowNumber: "",
  buyerName: "",
  buyerEmail: "",
  buyerDepartment: "",
  vendorName: "",
  vendorContactName: "",
  vendorContactEmail: "",
  scopeOfWork: "",
  deliverables: "",
  outOfScope: "",
  startDate: "",
  endDate: "",
  milestones: "",
  contractValue: "",
  currency: "INR",
  paymentTerms: "",
  paymentMilestones: "",
  kpis: "",
  penaltyClauses: "",
  specialRequirements: "",
};

function generateSOWNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `AIRTEL-SOW-${year}${month}-${rand}`;
}

export default function SOWForm() {
  const [formData, setFormData] = useState<SOWFormData>({
    ...emptyForm,
    sowNumber: generateSOWNumber(),
  });
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [validationResult, setValidationResult] = useState<AIValidationResult | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fieldFeedbackMap = useCallback((): Record<string, FieldFeedback> => {
    if (!validationResult) return {};
    return validationResult.fieldFeedback.reduce(
      (acc, fb) => ({ ...acc, [fb.field]: fb }),
      {}
    );
  }, [validationResult]);

  const getFieldStatus = (fieldName: string) => {
    const map = fieldFeedbackMap();
    return map[fieldName] ?? null;
  };

  const fieldClass = (fieldName: string, base: string) => {
    const fb = getFieldStatus(fieldName);
    if (!fb) return base;
    if (fb.status === "error") return `${base} border-red-500 focus:ring-red-500 focus:border-red-500`;
    if (fb.status === "warning") return `${base} border-yellow-400 focus:ring-yellow-400 focus:border-yellow-400`;
    return `${base} border-green-500 focus:ring-green-500 focus:border-green-500`;
  };

  const update = (field: keyof SOWFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (validationResult) setValidationResult(null);
  };

  const handleValidate = async () => {
    setStatus("validating");
    setValidationResult(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/validate-sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation request failed");
      setValidationResult(data as AIValidationResult);
      setStatus("validated");
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : "AI validation failed. Please try again.");
      setStatus("error");
    }
  };

  const handleSubmit = async () => {
    if (!validationResult?.approved) return;
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/submit-sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, validationResult }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmittedId(data.id);
      setStatus("submitted");
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : "Submission failed. Please try again.");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setFormData({ ...emptyForm, sowNumber: generateSOWNumber() });
    setStatus("idle");
    setValidationResult(null);
    setSubmittedId(null);
    setErrorMessage(null);
  };

  const isDisabled = status === "validating" || status === "submitting" || status === "submitted";

  if (status === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">SOW Submitted</h2>
          <p className="text-gray-500 mb-1 text-sm">Reference ID</p>
          <p className="text-lg font-mono font-semibold text-airtel-red mb-1">{formData.sowNumber}</p>
          {submittedId && <p className="text-xs text-gray-400 mb-6">{submittedId}</p>}
          <p className="text-sm text-gray-600 mb-8">
            Your Statement of Work has been successfully submitted and is pending review by the Airtel SCM team.
          </p>
          <button onClick={handleReset} className="btn-primary w-full">
            Submit Another SOW
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Airtel SCM — Statement of Work</h1>
          <p className="text-sm text-gray-500">
            Complete all required fields. AI will validate your submission before it can be sent.
          </p>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <p className="text-xs text-gray-400">Reference</p>
          <p className="text-sm font-mono font-semibold text-gray-700">{formData.sowNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section: Identification */}
          <Section title="SOW Identification">
            <Field label="SOW Title *" hint="Descriptive title for this engagement">
              <input
                type="text"
                value={formData.sowTitle}
                onChange={update("sowTitle")}
                disabled={isDisabled}
                placeholder="e.g., Network Equipment Supply & Installation – Bangalore Region"
                className={fieldClass("sowTitle", "field-input")}
              />
              <FieldNote feedback={getFieldStatus("sowTitle")} />
            </Field>
            <Field label="SOW Reference Number">
              <input
                type="text"
                value={formData.sowNumber}
                onChange={update("sowNumber")}
                disabled={isDisabled}
                className={fieldClass("sowNumber", "field-input")}
              />
            </Field>
          </Section>

          {/* Section: Buyer Details */}
          <Section title="Buyer Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Buyer Name *">
                <input
                  type="text"
                  value={formData.buyerName}
                  onChange={update("buyerName")}
                  disabled={isDisabled}
                  placeholder="Full name"
                  className={fieldClass("buyerName", "field-input")}
                />
                <FieldNote feedback={getFieldStatus("buyerName")} />
              </Field>
              <Field label="Buyer Email *">
                <input
                  type="email"
                  value={formData.buyerEmail}
                  onChange={update("buyerEmail")}
                  disabled={isDisabled}
                  placeholder="buyer@airtel.com"
                  className={fieldClass("buyerEmail", "field-input")}
                />
                <FieldNote feedback={getFieldStatus("buyerEmail")} />
              </Field>
            </div>
            <Field label="Department *">
              <select
                value={formData.buyerDepartment}
                onChange={update("buyerDepartment")}
                disabled={isDisabled}
                className={fieldClass("buyerDepartment", "field-input")}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <FieldNote feedback={getFieldStatus("buyerDepartment")} />
            </Field>
          </Section>

          {/* Section: Vendor Details */}
          <Section title="Vendor / Supplier Details">
            <Field label="Vendor / Company Name *">
              <input
                type="text"
                value={formData.vendorName}
                onChange={update("vendorName")}
                disabled={isDisabled}
                placeholder="Supplier company name"
                className={fieldClass("vendorName", "field-input")}
              />
              <FieldNote feedback={getFieldStatus("vendorName")} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Vendor Contact Name">
                <input
                  type="text"
                  value={formData.vendorContactName}
                  onChange={update("vendorContactName")}
                  disabled={isDisabled}
                  placeholder="Contact person"
                  className={fieldClass("vendorContactName", "field-input")}
                />
                <FieldNote feedback={getFieldStatus("vendorContactName")} />
              </Field>
              <Field label="Vendor Contact Email">
                <input
                  type="email"
                  value={formData.vendorContactEmail}
                  onChange={update("vendorContactEmail")}
                  disabled={isDisabled}
                  placeholder="contact@vendor.com"
                  className={fieldClass("vendorContactEmail", "field-input")}
                />
                <FieldNote feedback={getFieldStatus("vendorContactEmail")} />
              </Field>
            </div>
          </Section>

          {/* Section: Scope */}
          <Section title="Scope of Work">
            <Field label="Scope of Work *" hint="Describe what work will be performed in detail">
              <textarea
                value={formData.scopeOfWork}
                onChange={update("scopeOfWork")}
                disabled={isDisabled}
                rows={5}
                placeholder="Provide a detailed description of the work to be performed, including objectives, activities, and methods..."
                className={fieldClass("scopeOfWork", "field-textarea")}
              />
              <FieldNote feedback={getFieldStatus("scopeOfWork")} />
            </Field>
            <Field label="Deliverables *" hint="List specific outputs, reports, or items to be delivered">
              <textarea
                value={formData.deliverables}
                onChange={update("deliverables")}
                disabled={isDisabled}
                rows={4}
                placeholder="1. Delivery of 500 units of router model XYZ&#10;2. Installation and configuration at 10 sites&#10;3. Post-installation test reports"
                className={fieldClass("deliverables", "field-textarea")}
              />
              <FieldNote feedback={getFieldStatus("deliverables")} />
            </Field>
            <Field label="Out of Scope" hint="Explicitly state what is NOT included">
              <textarea
                value={formData.outOfScope}
                onChange={update("outOfScope")}
                disabled={isDisabled}
                rows={2}
                placeholder="e.g., Civil works, ongoing maintenance after warranty period"
                className={fieldClass("outOfScope", "field-textarea")}
              />
              <FieldNote feedback={getFieldStatus("outOfScope")} />
            </Field>
          </Section>

          {/* Section: Timeline */}
          <Section title="Timeline">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Start Date *">
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={update("startDate")}
                  disabled={isDisabled}
                  className={fieldClass("startDate", "field-input")}
                />
                <FieldNote feedback={getFieldStatus("startDate")} />
              </Field>
              <Field label="End Date *">
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={update("endDate")}
                  disabled={isDisabled}
                  className={fieldClass("endDate", "field-input")}
                />
                <FieldNote feedback={getFieldStatus("endDate")} />
              </Field>
            </div>
            <Field label="Key Milestones" hint="List major checkpoints with expected dates">
              <textarea
                value={formData.milestones}
                onChange={update("milestones")}
                disabled={isDisabled}
                rows={3}
                placeholder="Week 2: Design finalization&#10;Week 6: 50% delivery&#10;Week 10: Full deployment"
                className={fieldClass("milestones", "field-textarea")}
              />
              <FieldNote feedback={getFieldStatus("milestones")} />
            </Field>
          </Section>

          {/* Section: Commercial */}
          <Section title="Commercial Terms">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Contract Value *" className="sm:col-span-2">
                <input
                  type="number"
                  value={formData.contractValue}
                  onChange={update("contractValue")}
                  disabled={isDisabled}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={fieldClass("contractValue", "field-input")}
                />
                <FieldNote feedback={getFieldStatus("contractValue")} />
              </Field>
              <Field label="Currency">
                <select
                  value={formData.currency}
                  onChange={update("currency")}
                  disabled={isDisabled}
                  className={fieldClass("currency", "field-input")}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Payment Terms *">
              <select
                value={formData.paymentTerms}
                onChange={update("paymentTerms")}
                disabled={isDisabled}
                className={fieldClass("paymentTerms", "field-input")}
              >
                <option value="">Select payment terms</option>
                {PAYMENT_TERMS_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <FieldNote feedback={getFieldStatus("paymentTerms")} />
            </Field>
            <Field label="Payment Milestone Breakdown" hint="Describe when and how payments will be made">
              <textarea
                value={formData.paymentMilestones}
                onChange={update("paymentMilestones")}
                disabled={isDisabled}
                rows={2}
                placeholder="e.g., 30% on PO issuance, 50% on delivery, 20% on acceptance"
                className={fieldClass("paymentMilestones", "field-textarea")}
              />
              <FieldNote feedback={getFieldStatus("paymentMilestones")} />
            </Field>
          </Section>

          {/* Section: Performance */}
          <Section title="Performance & Compliance">
            <Field label="KPIs / Performance Metrics *" hint="Measurable success criteria">
              <textarea
                value={formData.kpis}
                onChange={update("kpis")}
                disabled={isDisabled}
                rows={3}
                placeholder="1. 99.9% uptime SLA&#10;2. Delivery within agreed timeline (±5 days)&#10;3. Zero critical defects post-installation"
                className={fieldClass("kpis", "field-textarea")}
              />
              <FieldNote feedback={getFieldStatus("kpis")} />
            </Field>
            <Field label="Penalty / Liquidated Damages Clauses">
              <textarea
                value={formData.penaltyClauses}
                onChange={update("penaltyClauses")}
                disabled={isDisabled}
                rows={2}
                placeholder="e.g., 0.5% of contract value per week of delay, capped at 10%"
                className={fieldClass("penaltyClauses", "field-textarea")}
              />
              <FieldNote feedback={getFieldStatus("penaltyClauses")} />
            </Field>
            <Field label="Special Requirements / Notes">
              <textarea
                value={formData.specialRequirements}
                onChange={update("specialRequirements")}
                disabled={isDisabled}
                rows={2}
                placeholder="Any additional requirements, certifications needed, security clearances, etc."
                className={fieldClass("specialRequirements", "field-textarea")}
              />
            </Field>
          </Section>

          {/* Action Buttons */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleValidate}
              disabled={isDisabled}
              className="btn-primary flex items-center gap-2"
            >
              {status === "validating" ? (
                <>
                  <Spinner />
                  AI Validating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run AI Validation
                </>
              )}
            </button>

            {validationResult?.approved && (
              <button
                onClick={handleSubmit}
                disabled={status === "submitting"}
                className="px-6 py-2.5 bg-green-600 text-white rounded-md font-semibold text-sm
                           hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {status === "submitting" ? (
                  <>
                    <Spinner />
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Submit SOW
                  </>
                )}
              </button>
            )}

            <button onClick={handleReset} disabled={isDisabled} className="btn-secondary">
              Reset Form
            </button>
          </div>
        </div>

        {/* Validation Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <ValidationPanel status={status} result={validationResult} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label">
        {label}
        {hint && <span className="font-normal text-gray-400 ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function FieldNote({ feedback }: { feedback: FieldFeedback | null }) {
  if (!feedback || feedback.status === "ok") return null;
  return (
    <p className={`text-xs mt-1 ${feedback.status === "error" ? "text-red-600" : "text-yellow-600"}`}>
      {feedback.message}
    </p>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
