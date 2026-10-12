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
    if (kind === "media") {
      const { data: m, error } = await supabase
        .from("college_media")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error("Image not found.");
      const { data: file, error: downloadError } = await supabase.storage
        .from("institution-private-documents")
        .download(m.storage_path);
      if (downloadError) throw new Error("Source image could not be loaded.");
      const { error: uploadError } = await supabase.storage
        .from("institution-public-media")
        .upload(m.storage_path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError && uploadError.message !== "The resource already exists")
        throw new Error("Image could not be published.");
    }
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
