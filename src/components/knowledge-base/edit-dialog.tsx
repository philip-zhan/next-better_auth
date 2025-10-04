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
import { updateResource } from "@/actions/resources";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RiEditLine } from "@remixicon/react";
import { toast } from "sonner";

interface EditDialogProps {
  resourceId: number;
  currentContent: string;
}

export function EditResourceDialog({ resourceId, currentContent }: EditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(currentContent);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setMessage("Please enter some content.");
      return;
    }

    if (content.trim() === currentContent) {
      setMessage("No changes detected.");
      return;
    }

    setIsUpdating(true);
    setMessage("");

    try {
      const result = await updateResource(resourceId, content.trim());
      
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setContent(currentContent); // Reset to original content
        router.refresh(); // Refresh to update the list
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage("An error occurred. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when dialog closes
      setContent(currentContent);
      setMessage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
        >
          <RiEditLine className="size-4" />
          <span className="sr-only">Edit resource</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
          <DialogDescription>
            Update the content of this knowledge base resource. The embeddings will be regenerated automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-content">Content</Label>
            <Textarea
              id="edit-content"
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
                  : message.includes("No changes")
                  ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900"
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
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating || !content.trim() || content.trim() === currentContent}
            >
              {isUpdating ? "Updating..." : "Update Resource"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
