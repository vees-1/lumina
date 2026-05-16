"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { DashboardNav } from "@/components/nav";
import { RoleGuard } from "@/components/lumina/role-guard";
import { getPatientSubmissionsRemote, requestMoreSubmissionData } from "@/lib/api";
import { useApiActor } from "@/lib/use-api-actor";
import type { PatientSubmission } from "@/types/lumina";
import { cn } from "@/lib/utils";
import { Inbox, MessageSquare, RefreshCw } from "lucide-react";

function statusLabel(status: string) {
  if (status === "released_to_patient") return "Released to patient";
  if (status === "doctor_completed") return "Doctor completed";
  if (status === "scorecard_ready") return "Legacy scorecard ready";
  if (status === "needs_more_data") return "More data requested";
  if (status === "in_review") return "In review";
  if (status === "doctor_review_pending") return "Pending";
  return "Submitted";
}

export default function PatientQueuePage() {
  const locale = useLocale();
  const actor = useApiActor();
  const [submissions, setSubmissions] = useState<PatientSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageFor, setMessageFor] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!actor || actor.role !== "doctor") return;
    setLoading(true);
    try {
      setSubmissions(await getPatientSubmissionsRemote(actor));
    } catch {
      toast.error("Could not load patient queue");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!actor || actor.role !== "doctor") return;
    let cancelled = false;
    getPatientSubmissionsRemote(actor)
      .then((items) => {
        if (!cancelled) setSubmissions(items);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load patient queue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actor]);

  async function requestMoreData(id: string) {
    if (!actor || !message.trim()) return;
    try {
      await requestMoreSubmissionData(id, message.trim(), actor);
      setMessage("");
      setMessageFor(null);
      await load();
      toast.success("Request sent to patient");
    } catch {
      toast.error("Could not send request");
    }
  }

  return (
    <RoleGuard allowed={["doctor"]} redirectTo="/patient">
      <div className="min-h-screen bg-[#F7F8FA] text-[#0D1B2A]">
        <DashboardNav />
        <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-28">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-label mb-2">Patient review queue</p>
              <h1 className="text-[36px] font-normal tracking-[-0.03em]">Review submitted evidence</h1>
              <p className="mt-1.5 max-w-2xl text-[14px] leading-6 text-[#4A5568]">
                Open patient submissions, run the existing HPO workflow, or request more data from the patient.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex h-10 items-center gap-2 rounded border border-[#DDE3ED] bg-white px-5 text-[13px] font-normal text-[#0D1B2A] hover:border-[#0AAFCE]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="overflow-hidden rounded border border-[#DDE3ED] bg-white">
            {loading ? (
              <div className="p-10 text-center text-[14px] text-[#4A5568]">Loading queue...</div>
            ) : submissions.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead className="border-b border-[#DDE3ED] bg-[#F7F8FA]">
                    <tr>
                      {["Submission", "Patient", "Evidence", "Status", "Updated", "Action"].map((header) => (
                        <th key={header} className="px-5 py-3 text-[11px] font-normal uppercase tracking-[0.08em] text-[#8A94A6]">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F2F5]">
                    {submissions.map((item) => (
                      <tr key={item.id} className={cn("align-top transition-colors hover:bg-[#F7F8FA]")}>
                        <td className="px-5 py-4 font-mono text-[13px] text-[#0AAFCE]">{item.id.slice(0, 8)}</td>
                        <td className="px-5 py-4 text-[13.5px] text-[#0D1B2A]">
                          {item.patientName ?? "Unnamed patient"}
                          <p className="mt-1 text-[12px] text-[#8A94A6]">{[item.age, item.sex].filter(Boolean).join(" · ") || "No demographics"}</p>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-[#4A5568]">
                          {[item.notes && "notes", item.photoFileName && "photo", item.labFileName && "lab", item.geneticEvidence && "genetic"].filter(Boolean).join(", ") || "-"}
                          {item.doctorMessage && <p className="mt-1 text-[12px] text-[#D4860A]">{item.doctorMessage}</p>}
                        </td>
                        <td className="px-5 py-4"><span className="badge badge-amber">{statusLabel(item.status)}</span></td>
                        <td className="px-5 py-4 text-[12.5px] text-[#8A94A6]">
                          {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.updatedAt ?? item.timestamp))}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/${locale}/new-case?submission=${item.id}`}
                              className="rounded bg-[#0D1B2A] px-3 py-1.5 text-[12px] font-normal text-white hover:bg-[#1C3352]"
                            >
                              Review
                            </Link>
                            <button
                              type="button"
                              onClick={() => setMessageFor(messageFor === item.id ? null : item.id)}
                              className="inline-flex items-center gap-1 rounded border border-[#DDE3ED] px-3 py-1.5 text-[12px] font-normal text-[#4A5568] hover:border-[#0AAFCE]"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              More data
                            </button>
                          </div>
                          {messageFor === item.id && (
                            <div className="mt-3 w-[280px] space-y-2">
                              <textarea
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                rows={3}
                                placeholder="Tell the patient what else to upload..."
                                className="w-full rounded border border-[#DDE3ED] px-3 py-2 text-[13px] outline-none focus:border-[#0AAFCE]"
                              />
                              <button
                                type="button"
                                onClick={() => requestMoreData(item.id)}
                                className="rounded bg-[#0AAFCE] px-3 py-1.5 text-[12px] font-normal text-white"
                              >
                                Send request
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#F0F2F5]">
                  <Inbox className="h-6 w-6 text-[#8A94A6]" />
                </div>
                <h2 className="mt-4 text-[20px] font-normal">No patient submissions yet</h2>
                <p className="mt-1.5 text-[14px] text-[#4A5568]">New patient evidence will appear here for doctor review.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
