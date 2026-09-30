// Browser side of the presigned upload: ask the server for a grant, then PUT
// the file straight to R2. Client-only (XMLHttpRequest, fetch to our own API).

export interface UploadGrant {
  key: string;
  uploadUrl: string;
  contentType: string;
}

export async function requestGrant(
  itemTypeId: string,
  file: File,
): Promise<UploadGrant> {
  const response = await fetch("/api/items/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemTypeId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? "Could not start the upload.");
  }
  return body.data;
}

// XHR rather than fetch: fetch still has no upload progress events
export function putWithProgress(
  xhr: XMLHttpRequest,
  grant: UploadGrant,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    xhr.open("PUT", grant.uploadUrl);
    // Signed into the URL, so it has to be exactly what the server chose
    xhr.setRequestHeader("Content-Type", grant.contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("The upload was rejected by storage."));
    xhr.onerror = () =>
      reject(new Error("The upload failed — check your connection."));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    xhr.send(file);
  });
}
