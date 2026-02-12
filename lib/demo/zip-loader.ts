import JSZip from "jszip";
import { getPublicBasePath } from "@/lib/utils";
import type { DemoFile } from "@/components/demo-editor/store";

/** Extensions that should be treated as editable text files. */
const TEXT_EXTENSIONS = new Set([
    ".tex",
    ".bib",
    ".sty",
    ".cls",
    ".bst",
    ".cfg",
    ".def",
    ".dtx",
    ".ins",
    ".ltx",
    ".fd",
    ".clo",
    ".txt",
    ".md",
    ".log",
    ".aux",
    ".toc",
    ".lof",
    ".lot",
    ".bbl",
    ".blg",
    ".idx",
    ".ind",
    ".ilg",
    ".ist",
    ".gls",
    ".glo",
    ".acn",
]);

function isTextExtension(name: string): boolean {
    const dot = name.lastIndexOf(".");
    if (dot === -1) return true; // no extension → treat as text
    return TEXT_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

/**
 * Fetch a zip file from the public examples path and extract its contents
 * into a Record<string, DemoFile> suitable for the demo editor store.
 *
 * @param onProgress  Optional callback receiving a value between 0 and 1
 *                    representing the download progress.
 */
export async function loadZipProject(
    zipPath: string,
    onProgress?: (progress: number) => void,
): Promise<Record<string, DemoFile>> {
    const resp = await fetch(getPublicBasePath(zipPath));
    if (!resp.ok)
        throw new Error(`Failed to fetch ${zipPath}: ${resp.status}`);

    const contentLength = resp.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    let buf: ArrayBuffer;

    if (total && resp.body) {
        // Stream the response to track download progress
        const reader = resp.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

         
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            onProgress?.(Math.min(received / total, 1));
        }

        const merged = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
        }
        buf = merged.buffer;
    } else {
        // Fallback: no Content-Length available
        buf = await resp.arrayBuffer();
        onProgress?.(1);
    }

    return loadZipFromArrayBuffer(buf);
}

/**
 * Load a zip from a raw ArrayBuffer (used for user-uploaded zips).
 */
export async function loadZipFromArrayBuffer(
    buf: ArrayBuffer,
): Promise<Record<string, DemoFile>> {
    const zip = await JSZip.loadAsync(buf);

    const files: Record<string, DemoFile> = {};

    const entries: [string, JSZip.JSZipObject][] = [];
    zip.forEach((relPath, zipEntry) => {
        if (!zipEntry.dir) {
            entries.push([relPath, zipEntry]);
        }
    });

    await Promise.all(
        entries.map(async ([relPath, zipEntry]) => {
            // Strip leading folder if all entries share a common root folder
            const path = stripCommonRoot(relPath, entries.map(([p]) => p));

            if (isTextExtension(relPath)) {
                const content = await zipEntry.async("string");
                files[path] = { kind: "text", content };
            } else {
                const data = await zipEntry.async("arraybuffer");
                files[path] = { kind: "asset", data };
            }
        }),
    );

    return files;
}

/**
 * If every path starts with the same folder prefix, strip it so the tree
 * doesn't have a useless top-level wrapper node.
 */
function stripCommonRoot(path: string, allPaths: string[]): string {
    if (allPaths.length === 0) return path;
    const first = allPaths[0].split("/")[0];
    const allShareRoot = allPaths.every(
        (p) => p.startsWith(first + "/") || p === first,
    );
    if (allShareRoot && first) {
        const prefix = first + "/";
        return path.startsWith(prefix) ? path.slice(prefix.length) : path;
    }
    return path;
}

/**
 * Infer the main .tex file from a set of file paths.
 * Prefers "main.tex", then any root-level .tex file.
 */
export function inferMainTexFile(paths: string[]): string {
    if (paths.includes("main.tex")) return "main.tex";
    const rootTex = paths.filter(
        (p) => p.endsWith(".tex") && !p.includes("/"),
    );
    return rootTex[0] ?? paths.find((p) => p.endsWith(".tex")) ?? "main.tex";
}

/**
 * Detect the engine type by scanning text file contents for XeTeX hints.
 * Returns "xetex" if any text file contains `\usepackage{fontspec}` or
 * Chinese characters (U+4E00–U+9FFF), otherwise "pdftex".
 *
 * Mirrors Hawking's `detectCompileConfig` / `checkForXeTexHint` logic.
 */
export function detectEngineType(
    files: Record<string, DemoFile>,
): "pdftex" | "xetex" {
    const xetexHint = /\\usepackage\{fontspec\}|[\u4E00-\u9FFF]/;
    for (const file of Object.values(files)) {
        if (file.kind === "text" && xetexHint.test(file.content)) {
            return "xetex";
        }
    }
    return "pdftex";
}
