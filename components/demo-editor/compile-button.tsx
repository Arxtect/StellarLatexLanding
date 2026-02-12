"use client";

import { Button } from "@/components/ui/button";
import { StopCircle, ChevronDownIcon, CheckIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompileButtonProps {
    compiling: boolean;
    engineType: string;
    onCompile: () => void;
    onStopCompile: () => void;
    onEngineChange: (engineType: "pdftex" | "xetex") => void;
}

export default function CompileButton({
    compiling,
    engineType,
    onCompile,
    onStopCompile,
    onEngineChange,
}: CompileButtonProps) {
    return (
        <div className="flex items-stretch group">
            <Button
                onClick={compiling ? onStopCompile : onCompile}
                size="sm"
                className={cn(
                    "bg-primary text-primary-foreground font-medium rounded-r-none h-8 w-26",
                    compiling
                        ? "opacity-50 group-hover:bg-destructive group-hover:text-destructive-foreground group-hover:opacity-100"
                        : "hover:bg-primary/90",
                )}
            >
                {compiling ? (
                    <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin group-hover:hidden" />
                        <StopCircle className="h-4 w-4 hidden group-hover:inline" />
                        <span className="group-hover:hidden">Compiling</span>
                        <span className="hidden group-hover:inline">Stop</span>
                    </span>
                ) : (
                    "Compile"
                )}
            </Button>

            {/* Engine selector dropdown (simple) */}
            <div className="relative">
                <Button
                    size="sm"
                    className={cn(
                        "h-8 px-2 rounded-l-none bg-primary text-primary-foreground",
                        compiling
                            ? "group-hover:bg-destructive group-hover:text-destructive-foreground"
                            : "hover:bg-primary/90",
                    )}
                    disabled={compiling}
                    onClick={(e) => {
                        const menu = (
                            e.currentTarget.nextElementSibling as HTMLElement
                        );
                        if (menu) menu.classList.toggle("hidden");
                    }}
                >
                    <ChevronDownIcon className="h-4 w-4" />
                </Button>
                <div className="hidden absolute right-0 top-full mt-1 bg-popover border rounded-md shadow-md z-50 min-w-[120px]">
                    {(["pdftex", "xetex"] as const).map((eng) => (
                        <button
                            key={eng}
                            className="flex items-center justify-between w-full px-3 py-1.5 text-sm hover:bg-accent"
                            onClick={() => {
                                onEngineChange(eng);
                                // close menu
                                const menus =
                                    document.querySelectorAll(
                                        "[data-engine-menu]",
                                    );
                                menus.forEach((m) =>
                                    m.classList.add("hidden"),
                                );
                            }}
                        >
                            <span>
                                {eng === "pdftex" ? "PDFTeX" : "XeTeX"}
                            </span>
                            {engineType === eng && (
                                <CheckIcon className="h-4 w-4 ml-2" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
