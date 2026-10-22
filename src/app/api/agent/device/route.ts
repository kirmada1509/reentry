import { withRoute } from "@/lib/http/route";
import { deviceOptions, devicePost } from "@/features/observation/http";
export const runtime = "nodejs";
export const OPTIONS = withRoute("agent.preflight", deviceOptions);
export const POST = withRoute("agent.device", devicePost);
