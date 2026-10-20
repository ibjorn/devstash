import { signInWithGitHub } from "@/actions/auth";
import { GitHubIcon } from "@/components/auth/GitHubIcon";
import { Button } from "@/components/ui/button";

interface GitHubButtonProps {
  callbackUrl: string;
  label: string;
}

/** GitHub OAuth handoff, shared by the sign-in and register forms. */
export function GitHubButton({ callbackUrl, label }: GitHubButtonProps) {
  return (
    // Separate form — the OAuth handoff is its own server action
    <form action={signInWithGitHub}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Button type="submit" variant="outline" className="w-full">
        <GitHubIcon className="size-4" />
        {label}
      </Button>
    </form>
  );
}
