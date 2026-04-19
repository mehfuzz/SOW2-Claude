"use client";

import { AIValidationResult, SubmissionStatus } from "@/lib/types";

interface Props {
  status: SubmissionStatus;
  result: AIValidationResult | null;
}

export default function ValidationPanel({ status, result }: Props) {
  if (status === "idle") {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          AI Validation
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          Fill in the form fields and click{" "}
          <strong className="text-gray-700">Run AI Validation</strong> to have Claude check your SOW
          for completeness and coherence before submission.
        </p>
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-600 mb-1">AI checks:</p>
          <p>• All required fields are filled</p>
          <p>• Dates are logically consistent</p>
          <p>• Scope and deliverables align</p>
          <p>• KPIs are measurable</p>
          <p>• Commercial terms make sense</p>
        </div>
      </div>
    );
  }

  if (status === "validating") {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col items-center justify-center py-6 gap-4">
          <div className="relative w-12 h-12">
            <svg className="animate-spin w-12 h-12 text-red-200" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            </svg>
            <svg className="animate-spin w-12 h-12 text-red-600 absolute inset-0" fill="none" viewBox="0 0 24 24">
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Claude AI is reviewing...</p>
            <p className="text-xs text-gray-400 mt-1">Checking completeness & coherence</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const scoreColor =
    result.overallScore >= 80
      ? "text-green-600"
      : result.overallScore >= 60
      ? "text-yellow-600"
      : "text-red-600";

  const scoreBg =
    result.overallScore >= 80
      ? "bg-green-50 border-green-200"
      : result.overallScore >= 60
      ? "bg-yellow-50 border-yellow-200"
      : "bg-red-50 border-red-200";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        {result.approved ? (
          <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        ) : (
          <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
        AI Validation Result
      </h3>

      {/* Score */}
      <div className={`rounded-lg border p-3 ${scoreBg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Completeness Score</span>
          <span className={`text-xl font-bold ${scoreColor}`}>{result.overallScore}/100</span>
        </div>
        <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-200">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              result.overallScore >= 80
                ? "bg-green-500"
                : result.overallScore >= 60
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${result.overallScore}%` }}
          />
        </div>
        <p className={`text-xs font-semibold mt-2 ${result.approved ? "text-green-700" : "text-red-700"}`}>
          {result.approved ? "Approved for submission" : "Not approved — fix issues below"}
        </p>
      </div>

      {/* Summary */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1">Summary</p>
        <p className="text-xs text-gray-600 leading-relaxed">{result.summary}</p>
      </div>

      {/* Blockers */}
      {result.blockers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd" />
            </svg>
            Blockers ({result.blockers.length})
          </p>
          <ul className="space-y-1">
            {result.blockers.map((b, i) => (
              <li key={i} className="text-xs text-red-700 bg-red-50 rounded px-2 py-1.5 border border-red-100">
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-yellow-700 mb-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd" />
            </svg>
            Warnings ({result.warnings.length})
          </p>
          <ul className="space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-xs text-yellow-800 bg-yellow-50 rounded px-2 py-1.5 border border-yellow-100">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Field-level feedback */}
      {result.fieldFeedback.filter((f) => f.status !== "ok").length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Field Issues</p>
          <ul className="space-y-1">
            {result.fieldFeedback
              .filter((f) => f.status !== "ok")
              .map((f, i) => (
                <li key={i} className={`text-xs rounded px-2 py-1.5 border ${
                  f.status === "error"
                    ? "text-red-700 bg-red-50 border-red-100"
                    : "text-yellow-800 bg-yellow-50 border-yellow-100"
                }`}>
                  <span className="font-semibold capitalize">{f.field}: </span>
                  {f.message}
                </li>
              ))}
          </ul>
        </div>
      )}

      {result.approved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
          Your SOW passed validation. Click <strong>Submit SOW</strong> to finalize.
        </div>
      )}
    </div>
  );
}
