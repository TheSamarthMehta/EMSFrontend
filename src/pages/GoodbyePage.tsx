import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GoodbyePage() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Account deleted</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Your data has been removed from this workspace. Thank you for using the app.
      </p>
      <Link to="/auth" className={cn(buttonVariants())}>
        Return to sign in
      </Link>
    </div>
  );
}
