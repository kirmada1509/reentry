import { redirect } from "next/navigation";
import { idSchema } from "@/features/capture/protocol";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ capture?: string | string[] }>;
}) {
  const capture = idSchema.safeParse((await searchParams).capture);
  // Keep old capture bookmarks usable without making manual capture the home.
  redirect(
    capture.success ? `/checkpoints?capture=${capture.data}` : "/observe",
  );
}
