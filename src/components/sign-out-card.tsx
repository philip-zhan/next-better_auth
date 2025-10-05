"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RiLogoutCircleLine } from "@remixicon/react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SignOutCardProps {
  className?: string;
}

export function SignOutCard({ className }: SignOutCardProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const handleSignOut = async () => {
    try {
      setIsPending(true);
      const loadingToast = toast.loading("Signing out...");

      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.dismiss(loadingToast);
            toast.success("Signed out successfully");
          },
          onError: () => {
            toast.dismiss(loadingToast);
            toast.error("Failed to sign out");
          },
        },
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    } finally {
      setIsPending(false);
      router.push("/");
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiLogoutCircleLine className="h-5 w-5" />
          Sign Out
        </CardTitle>
        <CardDescription>
          Sign out of your account. You'll need to sign in again to access your
          dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? "Signing out..." : "Sign Out"}
        </Button>
      </CardContent>
    </Card>
  );
}
