import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { uuid } from "@/lib/validation";
import { config } from "@/lib/config";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(config.url).origin)
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const s = await session();
  if (!s)
    return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
  try {
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024)
      throw new Error("File is too large.");
    const form = await request.formData();
    const institution = uuid.parse(form.get("institution_id"));
    const kind = String(form.get("kind"));
    const label = String(form.get("label") || "");
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      !["document", "media"].includes(kind) ||
      label.length < 3 ||
      label.length > 500
    )
      throw new Error("Check the file and description.");
    if (file.size > (kind === "media" ? 5 : 10) * 1024 * 1024 || file.size < 12)
      throw new Error("File size is not supported.");
    const { data: allowed, error: authError } = await s.supabase.rpc(
      "can_manage",
      { i: institution, permission: kind === "media" ? "media" : "documents" },
    );
    if (authError || !allowed)
      return NextResponse.json(
        { error: "You do not have document upload permission." },
        { status: 403 },
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    const types: Record<string, { ext: string; valid: boolean }> = {
      "image/jpeg": {
        ext: "jpg",
        valid: bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
      },
      "image/png": {
        ext: "png",
        valid: bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      },
      "image/webp": {
        ext: "webp",
        valid:
          bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP",
      },
      "application/pdf": {
        ext: "pdf",
        valid: bytes.toString("ascii", 0, 5) === "%PDF-",
      },
    };
    const type = types[file.type];
    if (
      !type?.valid ||
      (kind === "media" && type.ext === "pdf") ||
      !new RegExp(
        `\\.(${type.ext === "jpg" ? "jpg|jpeg" : type.ext})$`,
        "i",
      ).test(file.name)
    )
      throw new Error("The file content, extension, and type must match.");
    const { count, error: quotaError } = await s.supabase
      .from(
        kind === "document"
          ? "institution_verification_documents"
          : "college_media",
      )
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institution);
    if (quotaError) throw new Error("Upload quota could not be checked.");
    if ((count || 0) >= 50)
      throw new Error(
        "This institution has reached its upload quota. Contact the platform team.",
      );
    const path = `${institution}/${kind}/${crypto.randomUUID()}.${type.ext}`;
    const { error } = await s.supabase.storage
      .from("institution-private-documents")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw new Error("File upload failed. Please try again.");
    const { error: recordError } = await s.supabase.rpc("record_upload", {
      institution,
      path,
      kind,
      label,
    });
    if (recordError)
      throw new Error(
        "The file was received but could not be registered. Contact the platform team before retrying.",
      );
    return NextResponse.json({
      message: "Uploaded securely. This file is awaiting review.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed." },
      { status: 400 },
    );
  }
}
