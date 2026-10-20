/** Shown under a password-link button once a link has gone out. */
export function ResetLinkSentNote() {
  return (
    <p className="text-sm text-muted-foreground">
      The link expires in an hour. If it doesn&apos;t arrive, check your spam
      folder before requesting another.
    </p>
  );
}
