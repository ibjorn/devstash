"use client";

import { FileUpload, type FileUploadProps } from "@/components/items/FileUpload";
import { Label } from "@/components/ui/label";

/** The New Item form's File or Image field: the label and the uploader. */
export function ItemUploadField(props: FileUploadProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label asChild>
        <span>{props.kind === "image" ? "Image" : "File"}</span>
      </Label>
      <FileUpload {...props} />
    </div>
  );
}
