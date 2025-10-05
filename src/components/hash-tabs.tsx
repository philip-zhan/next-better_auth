"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HashTabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  className?: string;
}

export function HashTabs({
  children,
  defaultValue = "account",
  className,
}: HashTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  useEffect(() => {
    // Get initial tab from hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      setActiveTab(hash);
    }

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash) {
        setActiveTab(newHash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL hash without causing a page reload
    window.history.replaceState(null, "", `#${value}`);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={className}
    >
      {children}
    </Tabs>
  );
}

interface HashTabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function HashTabsList({ children, className }: HashTabsListProps) {
  return <TabsList className={className}>{children}</TabsList>;
}

interface HashTabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function HashTabsTrigger({
  value,
  children,
  className,
}: HashTabsTriggerProps) {
  return (
    <TabsTrigger value={value} className={className}>
      {children}
    </TabsTrigger>
  );
}

interface HashTabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function HashTabsContent({
  value,
  children,
  className,
}: HashTabsContentProps) {
  return (
    <TabsContent value={value} className={className}>
      {children}
    </TabsContent>
  );
}
