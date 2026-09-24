"use client";

import { useParams, useSearchParams } from "next/navigation";
import ClosedLeadsView from "@/components/ClosedLeadsView";

// Admin view of a single agent's closed leads, reached from that agent's
// dashboard (/admin/agent/[id]).
export default function AdminAgentClosedLeads() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const agentName = searchParams.get("name") || "Agent";

    return (
        <ClosedLeadsView
            role="admin"
            csrId={params.id}
            backHref={`/admin/agent/${params.id}?name=${encodeURIComponent(agentName)}`}
            backLabel={`Back to ${agentName}'s Dashboard`}
            title={`${agentName}'s Closed Leads`}
        />
    );
}
