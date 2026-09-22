"use client";

import { useState, lazy, Suspense } from "react";
import http from "@/services/http";
import type { Lead } from "@/services/lead.api";
import ColumnFilterDropdown, { FilterOption } from "@/components/filters/ColumnFilterDropdown";

// Lazy-load modal for production optimization
const ConvertLeadModal = lazy(() => import("./ConvertLeadModel"));

// Props for LeadList
interface LeadListProps {
  leads: Lead[];
  refreshLeads: () => void;
  role: "csr" | "admin"; // determines which actions are shown

  // Column header filters (all optional - headers render as plain text
  // when a filter's options/handler aren't supplied).
  monthOptions?: FilterOption[];
  cityOptions?: FilterOption[];
  sourceOptions?: FilterOption[];
  statusOptions?: string[];
  selectedMonths?: string[];
  selectedCities?: string[];
  selectedSources?: string[];
  selectedStatuses?: string[];
  onMonthsChange?: (v: string[]) => void;
  onCitiesChange?: (v: string[]) => void;
  onSourcesChange?: (v: string[]) => void;
  onStatusesChange?: (v: string[]) => void;
}

// Matches the status vocabulary used across the rest of the app (CsrLeadPanel):
// "paid"/"sale" are the current terms, "converted" is kept for legacy records.
const isSold = (status?: string) =>
  ["paid", "sale", "sold", "converted"].includes((status || "").toLowerCase());

export default function LeadList({
  leads, refreshLeads, role,
  monthOptions, cityOptions, sourceOptions, statusOptions,
  selectedMonths, selectedCities, selectedSources, selectedStatuses,
  onMonthsChange, onCitiesChange, onSourcesChange, onStatusesChange,
}: LeadListProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Delete lead (admin only)
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    try {
      await http.delete(`/lead/${id}`);
      refreshLeads();
    } catch (err: any) {
      console.error("Delete lead error:", err);
      alert(err?.response?.data?.message || "Failed to delete lead");
    }
  };

  if (!leads || leads.length === 0) {
    return <p className="text-gray-600 mt-4">No leads found.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow rounded">
      <table className="min-w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 border text-left">Name</th>
            <th className="p-3 border text-left">Phone</th>
            <th className="p-3 border text-left">Course</th>
            <th className="p-3 border text-left">
              City
              {cityOptions && onCitiesChange && (
                <ColumnFilterDropdown label="City" options={cityOptions} selected={selectedCities || []} onChange={onCitiesChange} />
              )}
            </th>
            <th className="p-3 border text-left">
              Source
              {sourceOptions && onSourcesChange && (
                <ColumnFilterDropdown label="Source" options={sourceOptions} selected={selectedSources || []} onChange={onSourcesChange} />
              )}
            </th>
            <th className="p-3 border text-center">
              Status
              {statusOptions && onStatusesChange && (
                <ColumnFilterDropdown label="Status" options={statusOptions.map(s => ({ value: s, label: s.toUpperCase() }))} selected={selectedStatuses || []} onChange={onStatusesChange} />
              )}
            </th>
            <th className="p-3 border text-center">
              Created
              {monthOptions && onMonthsChange && (
                <ColumnFilterDropdown label="Month" options={monthOptions} selected={selectedMonths || []} onChange={onMonthsChange} />
              )}
            </th>
            <th className="p-3 border text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => (
            <tr key={lead._id} className="hover:bg-gray-50 text-center">
              <td className="p-3 border text-left">{lead.name}</td>
              <td className="p-3 border text-left">{lead.phone}</td>
              <td className="p-3 border text-left">{lead.course}</td>
              <td className="p-3 border text-left">{lead.city || "-"}</td>
              <td className="p-3 border text-left">{lead.source || "-"}</td>

              <td className="p-3 border">
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    isSold(lead.status)
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {lead.status}
                </span>
              </td>

              <td className="p-3 border">
                {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "-"}
              </td>

              <td className="p-3 border text-center flex justify-center gap-2">
                {/* Admin Actions */}
                {role === "admin" && (
                  <>
                    <button
                      onClick={() => alert("Edit lead feature")}
                      className="text-yellow-600 hover:underline font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(lead._id)}
                      className="text-red-600 hover:underline font-medium"
                    >
                      Delete
                    </button>
                  </>
                )}

                {/* Convert to sale button */}
                {!isSold(lead.status) && (
                  <button
                    onClick={() => setSelectedLead(lead)}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Convert to Sale
                  </button>
                )}

                {/* CSR view for converted leads */}
                {isSold(lead.status) && role !== "admin" && (
                  <span className="text-green-600 font-semibold">
                    Converted
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal for converting lead */}
      {selectedLead && (
        <Suspense fallback={<p>Loading modal...</p>}>
          <ConvertLeadModal
            leadId={selectedLead._id}
            onClose={() => setSelectedLead(null)}
            onSuccess={() => {
              refreshLeads();
              setSelectedLead(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
