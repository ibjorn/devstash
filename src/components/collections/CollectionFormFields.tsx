"use client";

import { useId } from "react";

import { fieldErrorProps, FormField } from "@/components/forms/FormField";
import { Input } from "@/components/ui/input";
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
  const nameId = `${prefix}-name`;
  const descriptionId = `${prefix}-description`;

  return (
    <>
      <FormField id={nameId} label="Name" error={fieldErrors.name}>
        <Input
          id={nameId}
          name="name"
          value={values.name}
          onChange={(event) =>
            onChange({ ...values, name: event.target.value })
          }
          {...fieldErrorProps(nameId, fieldErrors.name)}
          autoFocus
        />
      </FormField>

      <FormField
        id={descriptionId}
        label="Description"
        error={fieldErrors.description}
      >
        <Textarea
          id={descriptionId}
          name="description"
          value={values.description}
          onChange={(event) =>
            onChange({ ...values, description: event.target.value })
          }
          {...fieldErrorProps(descriptionId, fieldErrors.description)}
          rows={3}
        />
      </FormField>
    </>
  );
}
