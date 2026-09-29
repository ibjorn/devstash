"use client";

import { File as FileIcon, Loader2, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  acceptAttribute,
  formatBytes,
  UPLOAD_RULES,
  type UploadKind,
  validateUpload,
} from "@/lib/uploads";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  key: string;
  name: string;
  size: number;
}

interface FileUploadProps {
  itemTypeId: string;
  kind: UploadKind;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  onUploadingChange: (uploading: boolean) => void;
  error?: string;
}

interface UploadGrant {
  key: string;
  uploadUrl: string;
  contentType: string;
}

async function requestGrant(
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
function putWithProgress(
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

/**
 * Drag-and-drop (or click-to-browse) upload for File and Image items. The file
 * goes straight from the browser to R2 on a presigned URL; the parent only
 * ever holds the resulting object key, which the create action verifies.
 */
export function FileUpload({
  itemTypeId,
  kind,
  value,
  onChange,
  onUploadingChange,
  error,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Set on unmount. abort() alone isn't enough: between the grant request and
  // the PUT there is no open XHR to abort, so each await re-checks this.
  const unmountedRef = useRef(false);

  // Abandon an in-flight upload if the dialog closes under it
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      xhrRef.current?.abort();
    };
  }, []);

  // Object URLs pin the file in memory until revoked
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function upload(file: File) {
    setLocalError(null);
    const invalid = validateUpload(kind, {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
    if (invalid) {
      setLocalError(invalid);
      return;
    }

    onChange(null);
    setPreviewUrl(null);
    setUploadingName(file.name);
    setProgress(0);
    onUploadingChange(true);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    try {
      const grant = await requestGrant(itemTypeId, file);
      if (unmountedRef.current) return;
      await putWithProgress(xhr, grant, file, setProgress);
      if (unmountedRef.current) return;
      onChange({ key: grant.key, name: file.name, size: file.size });
      if (kind === "image") setPreviewUrl(URL.createObjectURL(file));
    } catch (uploadError) {
      if (
        uploadError instanceof DOMException &&
        uploadError.name === "AbortError"
      ) {
        return;
      }
      setLocalError(
        uploadError instanceof Error
          ? uploadError.message
          : "The upload failed.",
      );
    } finally {
      xhrRef.current = null;
      // The parent outlives this component, so it always hears the upload end
      onUploadingChange(false);
      if (!unmountedRef.current) {
        setProgress(null);
        setUploadingName(null);
      }
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    // Cleared so choosing the same file again after a failure still fires
    if (inputRef.current) inputRef.current.value = "";
    if (file) void upload(file);
  }

  function clear() {
    onChange(null);
    setPreviewUrl(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const message = localError ?? error;
  const rule = UPLOAD_RULES[kind];
  const extensions = Object.keys(rule.extensions).join(", ");

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          {previewUrl ? (
            // A local object URL; next/image can't optimise a blob: source
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="size-14 rounded-md border object-cover"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-md border bg-background">
              <FileIcon className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{value.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatBytes(value.size)} · uploaded
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clear}
            aria-label={`Remove ${value.name}`}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : uploadingName !== null ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{uploadingName}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {progress ?? 0}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`Uploading ${uploadingName}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ?? 0}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-muted/40",
            dragging && "border-primary bg-muted/40",
            message && "border-destructive",
          )}
        >
          <Upload className="size-6 text-muted-foreground" />
          <span className="text-sm">
            Drop {kind === "image" ? "an image" : "a file"} here, or{" "}
            <span className="font-medium underline underline-offset-4">
              browse
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            {extensions} · up to {formatBytes(rule.maxBytes)}
          </span>
        </label>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={acceptAttribute(kind)}
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
        aria-invalid={Boolean(message)}
        aria-describedby={message ? "file-error" : undefined}
      />

      {message && (
        <p id="file-error" className="text-xs text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
