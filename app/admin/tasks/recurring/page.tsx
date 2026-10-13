import { redirect } from "next/navigation";

// Repeating tasks are managed on All Tasks now; keeps old links working.
export default function RecurringTasksPage() {
    redirect("/admin/tasks/list?scope=repeating");
}
