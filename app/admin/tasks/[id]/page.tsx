"use client";

import { useParams } from "next/navigation";
import TaskDetailView from "@/components/tasks/TaskDetailView";

export default function AdminTaskPage() {
    const { id } = useParams<{ id: string }>();
    return <TaskDetailView taskId={id} mode="admin" backHref="/admin/tasks/list" />;
}
