"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useUploadThing } from "@/lib/uploadthing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { startUpload } = useUploadThing("avatarUploader");
  const avatarUploader = async (file: File) => {
    const uploadRes = await startUpload([file]);
    if (!uploadRes?.[0]) throw new Error("Upload failed");
    return uploadRes[0].ufsUrl;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <AuthUIProvider
          authClient={authClient}
          navigate={router.push}
          replace={router.replace}
          apiKey={{
            prefix: "ngk_",
          }}
          onSessionChange={() => {
            router.refresh();
          }}
          settings={{
            basePath: "/dashboard",
          }}
          organization={{
            logo: {
              upload: avatarUploader,
            }
          }}
          social={{
            providers: ["github"],
          }}
          avatar={{
            upload: avatarUploader,
          }}
          Link={Link}
        >
          <NextTopLoader color="var(--primary)" showSpinner={false} />
          {children}
          <Toaster />
        </AuthUIProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
