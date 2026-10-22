import { withRoute } from "@/lib/http/route";
import { webGet, webPost } from "@/features/observation/http";
export const runtime = "nodejs";
export const GET = withRoute("agent.dashboard", webGet);
export const POST = withRoute("agent.controls", webPost);
