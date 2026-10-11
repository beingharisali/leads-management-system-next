"use client";

import { useParams } from "next/navigation";
import TaskDetailView from "@/components/tasks/TaskDetailView";

export default function StaffTaskPage() {
    const { id } = useParams<{ id: string }>();
    return <TaskDetailView taskId={id} mode="member" backHref="/staff/tasks" />;
}
