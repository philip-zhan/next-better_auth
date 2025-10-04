"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createResource } from "@/actions/resources";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { RiAddLine } from "@remixicon/react";

export function KnowledgeBaseCreateForm() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setMessage("You are not logged in.");
      return;
    }

    if (!session.session.activeOrganizationId) {
      setMessage("You are not part of an organization.");
      return;
    }

    if (!content.trim()) {
      setMessage("Please enter some content.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const result = await createResource({
        content: content.trim(),
        organizationId: session.session.activeOrganizationId,
        userId: session.session.userId,
      });
      setMessage(result);
      if (result.includes("successfully")) {
        setContent("");
        router.refresh(); // Refresh the page to show the new resource
        // Close dialog after a short delay to show success message
        setTimeout(() => {
          setOpen(false);
          setMessage("");
        }, 1500);
      }
    } catch {
      setMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <RiAddLine className="size-4 mr-2" />
          Add Content
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Knowledge Base Content</DialogTitle>
          <DialogDescription>
            Enter text content that you want to add to your knowledge base. This
            content will be processed and embedded for semantic search.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Enter your knowledge base content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="min-h-[250px]"
            />
          </div>

          {message && (
            <div
              className={`text-sm p-3 rounded-md ${
                message.includes("successfully")
                  ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900"
                  : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting
                ? "Adding..."
                : "Add to Knowledge Base"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
