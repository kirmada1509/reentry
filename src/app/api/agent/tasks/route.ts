import { withRoute } from "@/lib/http/route";
import { taskGet, taskPost } from "@/features/observation/http";
export const runtime = "nodejs";
export const GET = withRoute("agent.tasks", taskGet);
export const POST = withRoute("agent.task_change", (request, { requestId }) =>
  taskPost(request, requestId),
);
