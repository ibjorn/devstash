"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface CollectionFormValues {
  name: string;
  description: string;
}

interface CollectionFormFieldsProps {
  values: CollectionFormValues;
  onChange: (values: CollectionFormValues) => void;
  fieldErrors: Record<string, string>;
}

/** Name and description, shared by the create and edit dialogs. */
export function CollectionFormFields({
  values,
  onChange,
  fieldErrors,
}: CollectionFormFieldsProps) {
  // Every card renders its own edit dialog, so ids must be unique per form
  const prefix = useId();
  const fieldId = (field: string) => `${prefix}-${field}`;
  const errorId = (field: string) => `${prefix}-${field}-error`;

  // Ties an input to its error text for screen readers
  function errorProps(field: string) {
    return {
      "aria-invalid": Boolean(fieldErrors[field]),
      "aria-describedby": fieldErrors[field] ? errorId(field) : undefined,
    };
  }

  function fieldError(field: string) {
    const message = fieldErrors[field];
    if (!message) return null;
    return (
      <p id={errorId(field)} className="text-xs text-destructive">
        {message}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId("name")}>Name</Label>
        <Input
          id={fieldId("name")}
          name="name"
          value={values.name}
          onChange={(event) =>
            onChange({ ...values, name: event.target.value })
          }
          {...errorProps("name")}
          autoFocus
        />
        {fieldError("name")}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId("description")}>Description</Label>
        <Textarea
          id={fieldId("description")}
          name="description"
          value={values.description}
          onChange={(event) =>
            onChange({ ...values, description: event.target.value })
          }
          {...errorProps("description")}
          rows={3}
        />
        {fieldError("description")}
      </div>
    </>
  );
}
