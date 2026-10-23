"use server";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { uuid } from "@/lib/validation";
export async function approveAssetAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser(["super_admin"]);
  try {
    const id = uuid.parse(f.get("id"));
    const kind = String(f.get("kind"));
    if (kind !== "tour") throw new Error("Photos no longer require approval.");
    const { error } = await supabase.rpc("approve_asset", {
      kind,
      asset: id,
      cover: f.get("cover") === "on",
    });
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return { success: "Asset approved." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Approval failed." };
  }
}
