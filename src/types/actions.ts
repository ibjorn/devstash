/**
 * `{ success, data, error, fieldErrors }` per the project's error handling
 * standard, shared by every server action. `fieldErrors` is keyed by input
 * name so a form can put a message beside the field that caused it; `error`
 * covers anything with no field to blame and is toasted instead. `upgrade`
 * marks a refusal the plan caused, so the toast can offer the way out.
 */
export interface ActionResult<T = never> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
  upgrade?: true;
}
