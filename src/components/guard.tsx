import { Lock } from "lucide-react";
import { Card, LinkButton } from "./ui";

export function Forbidden({ what = "this page" }: { what?: string }) {
  return (
    <Card className="mx-auto mt-10 max-w-md p-8 text-center">
      <Lock className="mx-auto size-6 text-ink-3" />
      <h2 className="mt-3 font-display text-xl font-medium">Not permitted</h2>
      <p className="mt-1 text-sm text-ink-2">Your role doesn’t have access to {what}. Switch persona in the prototype controls to explore other roles.</p>
      <LinkButton href="/dashboard" className="mt-5">
        Back to overview
      </LinkButton>
    </Card>
  );
}
