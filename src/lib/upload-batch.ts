export type UploadResult = {
  ok: boolean;
  message: string;
  retryable?: boolean;
  nextPath?: string;
};

// Sequential requests keep the existing per-file size and authorization checks.
export async function uploadBatch<T>(
  files: T[],
  send: (file: T, finish: boolean) => Promise<UploadResult>,
  report: (index: number, result: UploadResult) => void,
) {
  const results: UploadResult[] = [];
  for (let index = 0; index < files.length; index++) {
    let result: UploadResult;
    try {
      result = await send(
        files[index],
        index === files.length - 1 && results.every((item) => item.ok),
      );
    } catch {
      result = {
        ok: false,
        retryable: false,
        message:
          "Connection interrupted. Check the gallery before uploading this file again; it may have been received.",
      };
    }
    results.push(result);
    report(index, result);
  }
  return results;
}
