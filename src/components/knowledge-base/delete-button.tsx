"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteResource } from "@/actions/resources";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RiDeleteBinLine } from "@remixicon/react";
import { toast } from "sonner";

interface DeleteButtonProps {
  resourceId: number;
}

export function DeleteResourceButton({ resourceId }: DeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteResource(resourceId);
      
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.refresh(); // Refresh to update the list
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <RiDeleteBinLine className="size-4" />
          <span className="sr-only">Delete resource</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Resource</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this resource? This action cannot be
            undone and will remove all associated embeddings.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

