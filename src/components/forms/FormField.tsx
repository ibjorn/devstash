import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** The id an input's error text is rendered under. */
export function errorIdFor(inputId: string) {
  return `${inputId}-error`;
}

/** Ties an input to its error text for screen readers. */
export function fieldErrorProps(inputId: string, error?: string) {
  return {
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorIdFor(inputId) : undefined,
  };
}

interface FieldErrorProps {
  inputId: string;
  message?: string;
}

export function FieldError({ inputId, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={errorIdFor(inputId)} className="text-sm text-destructive">
      {message}
    </p>
  );
}

interface FormFieldProps {
  /** The input's id: the label targets it and the error text is keyed off it. */
  id: string;
  label: React.ReactNode;
  error?: string;
  /** Sits right of the label, e.g. a "Forgot password?" link or an AI button. */
  labelAddon?: React.ReactNode;
  /**
   * For an input that isn't a labellable element (Monaco): the label is
   * rendered as plain text rather than pointing at `id`.
   */
  visualLabel?: boolean;
  className?: string;
  /** The input itself — spread `fieldErrorProps(id, error)` onto it. */
  children: React.ReactNode;
}

/** A label, its input and the input's error text, stacked. */
export function FormField({
  id,
  label,
  error,
  labelAddon,
  visualLabel = false,
  className,
  children,
}: FormFieldProps) {
  const labelElement = visualLabel ? (
    <Label asChild>
      <span>{label}</span>
    </Label>
  ) : (
    <Label htmlFor={id}>{label}</Label>
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {labelAddon ? (
        <div className="flex min-h-7 items-center justify-between gap-2">
          {labelElement}
          {labelAddon}
        </div>
      ) : (
        labelElement
      )}
      {children}
      <FieldError inputId={id} message={error} />
    </div>
  );
}
