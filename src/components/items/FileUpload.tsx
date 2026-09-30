"use client";

import { useEffect, useId, useRef, useState } from "react";

import { DropZone } from "@/components/items/DropZone";
import { UploadedFilePreview } from "@/components/items/UploadedFilePreview";
import { UploadProgress } from "@/components/items/UploadProgress";
import { putWithProgress, requestGrant } from "@/lib/upload-client";
import {
  acceptAttribute,
  type UploadKind,
  validateUpload,
} from "@/lib/uploads";

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

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <UploadedFilePreview
          name={value.name}
          size={value.size}
          previewUrl={previewUrl}
          onRemove={clear}
        />
      ) : uploadingName !== null ? (
        <UploadProgress fileName={uploadingName} percent={progress ?? 0} />
      ) : (
        <DropZone
          inputId={inputId}
          kind={kind}
          invalid={Boolean(message)}
          onFiles={handleFiles}
        />
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
