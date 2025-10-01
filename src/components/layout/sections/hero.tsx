"use client";
import { ArrowRight, Lock } from "lucide-react";
import { RiGithubFill } from "@remixicon/react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";

export const HeroSection = () => {
    const { theme } = useTheme();
    return (
        <section className="container mx-auto flex w-full justify-center px-4">
            <div className="grid place-items-center gap-8 py-20">
                <div className="space-y-8 text-center">
                    <Badge
                        variant="outline"
                        className="rounded-2xl py-2 text-sm"
                    >
                        <span className="mr-2 text-primary">
                            <Badge>New</Badge>
                        </span>
                        <span> Launch your SaaS now! </span>
                    </Badge>

                    <div className="mx-auto max-w-screen-md text-center font-bold text-4xl md:text-6xl">
                        <h1>
                            Experience the
                            <span className="bg-gradient-to-r from-[#da5319] to-primary bg-clip-text px-2 text-transparent">
                                Indie SaaS
                            </span>
                            Boilerplate
                        </h1>
                    </div>

                    <p className="mx-auto max-w-screen-sm text-muted-foreground text-xl">
                        {`A complete SaaS starter with authentication, beautiful UI components, 
            and everything you need to launch your platform quickly and efficiently.`}
                    </p>

                    <div className="flex flex-col items-center space-y-4 md:flex-row md:justify-center md:space-x-4 md:space-y-0">
                        <Button
                            asChild
                            size="lg"
                            className="group/arrow rounded-full"
                        >
                            <Link href="/auth/sign-up">
                                Get Started
                                <ArrowRight className="ml-2 size-5 transition-transform group-hover/arrow:translate-x-1" />
                            </Link>
                        </Button>

                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="rounded-full"
                        >
                            <Link
                                href={site.links.github}
                                target="_blank"
                                className="flex items-center gap-2"
                            >
                                <RiGithubFill className="size-5 fill-foreground" />
                                GitHub repository
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="group relative mt-14">
                    <div className="lg:-top-8 -translate-x-1/2 absolute top-2 left-1/2 mx-auto h-24 w-[90%] transform rounded-full bg-primary/50 blur-3xl lg:h-80" />

                    {/* Browser Navigation Bar */}
                    <div className="relative mx-auto w-full max-w-5xl">
                        <div className="flex h-10 items-center rounded-t-lg bg-sidebar px-4">
                            {/* Traffic Light Buttons */}
                            <div className="flex space-x-2">
                                <div className="h-3 w-3 rounded-full bg-red-500" />
                                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                                <div className="h-3 w-3 rounded-full bg-green-500" />
                            </div>
                            {/* URL Bar */}
                            <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 w-1/3">
                                <div className="flex h-6 items-center justify-center rounded-md bg-secondary/50 px-3">
                                    <Lock className="mr-1.5 size-3 text-muted-foreground" />
                                    <div className="text-muted-foreground text-xs">
                                        {site.url}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Image
                        width={1200}
                        height={1200}
                        className="relative mx-auto max-w-5xl flex w-full items-center rounded-b-lg "
                        src={
                            theme === "light" ? "/dash-light.png" : "/dash.png"
                        }
                        alt="dashboard"
                    />

                    <div className="absolute bottom-0 left-0 h-20 w-full rounded-lg bg-gradient-to-b from-background/0 via-background/50 to-background md:h-28" />
                </div>
            </div>
        </section>
    );
};
