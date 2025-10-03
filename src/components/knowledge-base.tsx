"use client";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createResource } from "@/actions/resources";
import { useState } from "react";

export function KnowledgeBase() {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setMessage("Please enter some content.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const result = await createResource({ content: content.trim() });
      setMessage(result);
      if (result.includes("successfully")) {
        setContent("");
      }
    } catch {
      setMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Add your knowledge base content here. It will be automatically embedded for search."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add Knowledge Base Content</CardTitle>
          <CardDescription>
            Enter text content that you want to add to your knowledge base. This
            content will be processed and embedded for semantic search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter your knowledge base content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="min-h-[200px]"
              />
            </div>

            {message && (
              <div
                className={`text-sm p-3 rounded-md ${
                  message.includes("successfully")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="w-full"
            >
              {isSubmitting
                ? "Adding to Knowledge Base..."
                : "Add to Knowledge Base"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
