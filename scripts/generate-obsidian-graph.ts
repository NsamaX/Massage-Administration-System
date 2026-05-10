import { promises as fs } from "node:fs";
import path from "node:path";

type ImportHit = {
  rawPath: string;
  resolvedNoteId: string;
  isDeepImport: boolean;
};

type ViolationType =
  | "deep-import"
  | "circular-dep"
  | "schema-impure"
  | "app-deep-import"
  | "client-server-leak";

// coupling/high   → inDegree + outDegree ≥ HIGH_THRESHOLD
// coupling/medium → inDegree + outDegree ≥ MEDIUM_THRESHOLD
type CouplingBucket = "high" | "medium";

type FileAnalysis = {
  rel: string;
  noteId: string;
  hits: ImportHit[];
  violations: ViolationType[];
  tags: string[];
  uniqueLinks: string[];
};

const SOURCE_DIR = path.resolve(process.cwd(), "src");
const OUTPUT_DIR = path.resolve(process.cwd(), ".obsidian-graph");
const OBSIDIAN_CONFIG_DIR = path.join(OUTPUT_DIR, ".obsidian");

const FILTER_MODULES: string[] | null = null;

const TRACKED_IMPORT_PREFIXES = ["@/modules/", "@/lib/", "@/app/"] as const;

const RESOLVE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
] as const;

const COUPLING_HIGH_THRESHOLD = 10;
const COUPLING_MEDIUM_THRESHOLD = 5;

const GRAPH_COLOR_GROUPS = [
  {
    query: "tag:#violation/circular-dep",
    color: { a: 1, rgb: hexToRgbInt("#EF4444") },
  },
  {
    query: "tag:#violation/client-server-leak",
    color: { a: 1, rgb: hexToRgbInt("#F97316") },
  },
  {
    query: "tag:#violation/deep-import",
    color: { a: 1, rgb: hexToRgbInt("#FB923C") },
  },
  {
    query: "tag:#violation/app-deep-import",
    color: { a: 1, rgb: hexToRgbInt("#FBBF24") },
  },
  {
    query: "tag:#violation/schema-impure",
    color: { a: 1, rgb: hexToRgbInt("#FDE047") },
  },
  { query: "tag:#entry/proxy", color: { a: 1, rgb: hexToRgbInt("#F628D7") } },
  { query: "tag:#entry/schema", color: { a: 1, rgb: hexToRgbInt("#8B5CF6") } },
  { query: "tag:#core/shared", color: { a: 1, rgb: hexToRgbInt("#A855F7") } },
  { query: "tag:#entry/view", color: { a: 1, rgb: hexToRgbInt("#3B82F6") } },
  { query: "tag:#entry/page", color: { a: 1, rgb: hexToRgbInt("#60A5FA") } },
  { query: "tag:#entry/api", color: { a: 1, rgb: hexToRgbInt("#06B6D4") } },
  { query: "tag:#entry/module", color: { a: 1, rgb: hexToRgbInt("#14B8A6") } },
] as const;

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const srcExists = await pathExists(SOURCE_DIR);
  if (!srcExists) throw new Error(`src directory not found: ${SOURCE_DIR}`);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(OBSIDIAN_CONFIG_DIR, { recursive: true });
  await writeGraphConfig();
  await cleanOutputDir();

  const allFiles = await listFilesRecursively(SOURCE_DIR);
  const files = FILTER_MODULES
    ? allFiles.filter((f) =>
        isFileInFilteredModules(toPosixPath(path.relative(process.cwd(), f))),
      )
    : allFiles;

  if (FILTER_MODULES) {
    process.stdout.write(
      `Filtering to modules: [${FILTER_MODULES.join(", ")}] — ${files.length} of ${allFiles.length} files\n`,
    );
  }

  // Pass 1: Analyze each file
  const analyses: FileAnalysis[] = [];

  await Promise.all(
    files.map(async (filePath) => {
      const rel = toPosixPath(path.relative(process.cwd(), filePath));
      const noteId = toNoteId(rel);
      const content = await fs.readFile(filePath, "utf8");
      const strippedContent = stripCommentsAndStrings(content);

      const specifiers = extractRelevantSpecifiers(strippedContent, {
        includeRelative: shouldIncludeRelativeEdges(rel, mode),
      });

      const importerModule = getModuleNameFromFileRel(rel);
      const hits: ImportHit[] = [];

      for (const rawPath of specifiers) {
        const resolvedNoteId = rawPath.startsWith("@/")
          ? await resolveImportToNoteId(rawPath)
          : await resolveRelativeSpecifierToNoteId(rawPath, rel);
        const targetModule = rawPath.startsWith("@/")
          ? getModuleNameFromImport(rawPath)
          : getModuleNameFromFileRel(resolvedNoteId);
        const isCrossModule =
          importerModule !== null &&
          targetModule !== null &&
          importerModule !== targetModule;
        const isAllowedModuleEntry = rawPath.startsWith("@/")
          ? isAllowedCrossModuleEntryImport(rawPath)
          : false;

        hits.push({
          rawPath,
          resolvedNoteId,
          isDeepImport: isCrossModule && !isAllowedModuleEntry,
        });
      }

      const violations = detectViolations(rel, hits);
      const tags = buildFrontmatterTags(rel, violations);
      const uniqueLinks = uniq(hits.map((h) => `[[${h.resolvedNoteId}]]`)).sort(
        (a, b) => a.localeCompare(b),
      );

      analyses.push({ rel, noteId, hits, violations, tags, uniqueLinks });
    }),
  );

  // Pass 2: Detect circular dependencies with full graph traversal
  const noteIdToAnalysis = new Map(analyses.map((a) => [a.noteId, a]));

  for (const startAnalysis of analyses) {
    if (findCycle(startAnalysis.noteId, noteIdToAnalysis)) {
      if (!startAnalysis.violations.includes("circular-dep")) {
        startAnalysis.violations.push("circular-dep");
        startAnalysis.tags.push("violation/circular-dep");
      }
    }
  }

  // Pass 3: Calculate coupling score and tag
  const inDegreeMap = new Map<string, number>();
  for (const a of analyses) {
    for (const hit of a.hits) {
      inDegreeMap.set(
        hit.resolvedNoteId,
        (inDegreeMap.get(hit.resolvedNoteId) ?? 0) + 1,
      );
    }
  }

  for (const a of analyses) {
    const outDegree = a.uniqueLinks.length;
    const inDegree = inDegreeMap.get(a.noteId) ?? 0;
    const score = inDegree + outDegree;
    const bucket = getCouplingBucket(score);
    if (bucket !== null) {
      a.tags.push(`coupling/${bucket}`);
    }
  }

  // Pass 4: Write .md notes
  const writeResults = await Promise.allSettled(
    analyses.map(async (analysis) => {
      const outPath = toNoteOutputPath(analysis.rel);
      await fs.mkdir(path.dirname(outPath), { recursive: true });

      const deepImportPaths = uniq(
        analysis.hits.filter((h) => h.isDeepImport).map((h) => h.rawPath),
      ).sort((a, b) => a.localeCompare(b));

      const lines: string[] = [];
      lines.push("---");
      lines.push("tags:");
      for (const tag of analysis.tags) lines.push(`  - ${tag}`);
      lines.push("---");
      lines.push("");
      lines.push(`# ${path.basename(analysis.rel)}`);
      lines.push("");
      lines.push(`\`${analysis.rel}\``);
      lines.push("");

      if (analysis.uniqueLinks.length > 0) {
        lines.push("## Imports");
        for (const link of analysis.uniqueLinks) lines.push(`- ${link}`);
        lines.push("");
      }

      if (analysis.violations.length > 0) {
        lines.push("## ⚠️ Violations");
        for (const v of analysis.violations) lines.push(`- ${violationLabel(v)}`);
        lines.push("");
      }

      if (deepImportPaths.length > 0) {
        lines.push("## Deep Import Paths");
        lines.push(
          "> Import ข้าม module boundary โดยไม่ผ่าน client.ts / server.ts / schema.ts",
        );
        lines.push("");
        for (const p of deepImportPaths) lines.push(`- \`${p}\``);
        lines.push("");
      }

      await fs.writeFile(outPath, lines.join("\n"), "utf8");
    }),
  );

  const ok = writeResults.filter((r) => r.status === "fulfilled").length;
  const failed = writeResults.filter((r) => r.status === "rejected").length;

  if (failed > 0) {
    const firstError = writeResults.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    throw new Error(
      `Generated ${ok} notes, ${failed} failed. First error: ${String(firstError?.reason)}`,
    );
  }

  await writeViolationReport(analyses);
  await writeGraphContext(analyses);

  process.stdout.write(`Generated ${ok} notes into ${OUTPUT_DIR}${path.sep}\n`);
}

function findCycle(
  startId: string,
  noteIdToAnalysis: Map<string, FileAnalysis>,
): boolean {
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(currentId: string): boolean {
    if (stack.has(currentId)) return true;
    if (visited.has(currentId)) return false;

    visited.add(currentId);
    stack.add(currentId);

    const analysis = noteIdToAnalysis.get(currentId);
    if (analysis) {
      for (const hit of analysis.hits) {
        if (dfs(hit.resolvedNoteId)) return true;
      }
    }

    stack.delete(currentId);
    return false;
  }

  return dfs(startId);
}

function detectViolations(rel: string, hits: ImportHit[]): ViolationType[] {
  const violations: ViolationType[] = [];

  if (hits.some((h) => h.isDeepImport)) {
    violations.push("deep-import");
  }

  if (isSchemaFile(rel)) {
    const forbidden = hits.filter((h) => {
      const p = h.rawPath;
      if (isSchemaPath(p)) return false;
      if (p === "@/lib/db" || p.startsWith("@/lib/db/")) return false;
      if (p.startsWith("./") || p.startsWith("../")) {
        const resolvedId = h.resolvedNoteId.replaceAll("---", "/");
        return !isSchemaFile(resolvedId);
      }
      return true;
    });
    if (forbidden.length > 0) violations.push("schema-impure");
  }

  if (rel.startsWith("src/app/")) {
    const deepAppImports = hits.filter((h) => {
      if (!h.rawPath.startsWith("@/modules/")) return false;
      return !isAllowedCrossModuleEntryImport(h.rawPath);
    });
    if (deepAppImports.length > 0) violations.push("app-deep-import");
  }

  if (rel.match(/\/client\.ts$/)) {
    const serverLeaks = hits.filter((h) => {
      const p = h.rawPath;
      const segments = p.split("/");
      if (isModuleSchemaEntryPoint(p)) return false;
      return (
        segments.includes("api") ||
        segments.includes("server") ||
        p.endsWith(".service.ts") ||
        p === "@/lib/db" ||
        p.startsWith("@/lib/db/")
      );
    });
    if (serverLeaks.length > 0) violations.push("client-server-leak");
  }

  return violations;
}

function violationLabel(v: ViolationType): string {
  switch (v) {
    case "circular-dep":
      return "🔴 Circular Dependency — cycle detected in dependency graph";
    case "client-server-leak":
      return "🔴 Client-Server Leak — client code importing server-only code";
    case "deep-import":
      return "🔴 Deep Import — cross-module boundary violation";
    case "app-deep-import":
      return "🟠 App Deep Import — app layer bypassing module entry point";
    case "schema-impure":
      return "🟡 Schema Impure — non-pure definition in schema file";
  }
}

function violationDescription(t: ViolationType): string {
  switch (t) {
    case "circular-dep":
      return "> These files are part of a dependency cycle (direct A↔B or indirect A→B→C→A).";
    case "client-server-leak":
      return "> client.ts is importing server-side code, which leaks server logic into the client bundle.";
    case "deep-import":
      return "> Cross-module import bypassing the defined entry points (client.ts / server.ts / schema.ts).";
    case "app-deep-import":
      return "> The app layer (routing) is accessing internal module files directly instead of using entry points.";
    case "schema-impure":
      return "> Schema files should only contain pure data definitions.";
  }
}

async function writeViolationReport(analyses: FileAnalysis[]) {
  const violated = analyses.filter((a) => a.violations.length > 0);

  const allTypes: ViolationType[] = [
    "circular-dep",
    "client-server-leak",
    "deep-import",
    "app-deep-import",
    "schema-impure",
  ];

  const byType = new Map<ViolationType, FileAnalysis[]>();
  for (const t of allTypes) byType.set(t, []);
  for (const a of violated) {
    for (const v of a.violations) byType.get(v)?.push(a);
  }

  const lines: string[] = [];

  lines.push("# Architecture Violation Report");
  lines.push("");
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Total unique files with violations: **${violated.length}**`);
  lines.push("");

  lines.push("## Summary by Violation Type");
  lines.push("");
  lines.push("| Severity | Violation Type | Affected Files |");
  lines.push("|---|---|---|");
  lines.push(`| 🔴 Critical | Circular Dependency   | ${byType.get("circular-dep")?.length ?? 0} |`);
  lines.push(`| 🔴 Critical | Client-Server Leak    | ${byType.get("client-server-leak")?.length ?? 0} |`);
  lines.push(`| 🔴 High     | Deep Import           | ${byType.get("deep-import")?.length ?? 0} |`);
  lines.push(`| 🟠 Medium   | App Deep Import       | ${byType.get("app-deep-import")?.length ?? 0} |`);
  lines.push(`| 🟡 Low      | Schema Impure         | ${byType.get("schema-impure")?.length ?? 0} |`);
  lines.push("");

  for (const t of allTypes) {
    const files = byType.get(t) ?? [];
    if (files.length === 0) continue;

    lines.push(`## ${violationLabel(t)} (${files.length} files)`);
    lines.push("");
    lines.push(violationDescription(t));
    lines.push("");

    for (const a of files.sort((x, y) => x.rel.localeCompare(y.rel))) {
      lines.push(`### \`${a.rel}\``);
      lines.push("");

      if (t === "deep-import") {
        const badImports = uniq(
          a.hits.filter((h) => h.isDeepImport).map((h) => h.rawPath),
        );
        if (badImports.length > 0) {
          lines.push("**Offending imports:**");
          for (const p of badImports) lines.push(`- \`${p}\``);
          lines.push("");
        }
      }

      if (t === "app-deep-import") {
        const badImports = uniq(
          a.hits
            .filter(
              (h) =>
                h.rawPath.startsWith("@/modules/") &&
                !isAllowedCrossModuleEntryImport(h.rawPath),
            )
            .map((h) => h.rawPath),
        );
        if (badImports.length > 0) {
          lines.push("**Offending imports:**");
          for (const p of badImports) lines.push(`- \`${p}\``);
          lines.push("");
        }
      }

      if (t === "circular-dep") {
        lines.push("");
      }

      if (t === "client-server-leak") {
        const leaks = uniq(
          a.hits
            .filter((h) => {
              const segments = h.rawPath.split("/");
              if (isModuleSchemaEntryPoint(h.rawPath)) return false;
              return (
                segments.includes("api") ||
                segments.includes("server") ||
                h.rawPath.endsWith(".service.ts") ||
                h.rawPath === "@/lib/db" ||
                h.rawPath.startsWith("@/lib/db/")
              );
            })
            .map((h) => h.rawPath),
        );
        lines.push("**Leaking imports:**");
        for (const p of leaks) lines.push(`- \`${p}\``);
        lines.push("");
      }

      if (t === "schema-impure") {
        const bad = uniq(
          a.hits
            .filter((h) => {
              const p = h.rawPath;
              if (isSchemaPath(p)) return false;
              if (p === "@/lib/db" || p.startsWith("@/lib/db/")) return false;
              if (p.startsWith("./") || p.startsWith("../")) {
                const resolvedId = h.resolvedNoteId.replaceAll("---", "/");
                return !isSchemaFile(resolvedId);
              }
              return true;
            })
            .map((h) => h.rawPath),
        );
        lines.push("**Non-schema imports:**");
        for (const p of bad) lines.push(`- \`${p}\``);
        lines.push("");
      }
    }
  }

  if (violated.length === 0) {
    lines.push("## No violations found");
    lines.push("");
    lines.push("Architecture boundaries are clean.");
    lines.push("");
  }

  const outPath = path.join(OUTPUT_DIR, ".VIOLATIONS.md");
  await writeReportFile(outPath, lines.join("\n"));
  process.stdout.write(`Violation report: ${outPath}\n`);
}

async function writeGraphContext(analyses: FileAnalysis[]) {
  const generated = new Date().toISOString();

  const moduleMap = new Map<string, FileAnalysis[]>();
  for (const a of analyses) {
    const mod = getModuleNameFromFileRel(a.rel) ?? "__root__";
    if (!moduleMap.has(mod)) moduleMap.set(mod, []);
    moduleMap.get(mod)!.push(a);
  }

  let totalEdges = 0;
  for (const a of analyses) totalEdges += a.uniqueLinks.length;

  const hasIncoming = new Set<string>();
  for (const a of analyses) {
    for (const link of a.uniqueLinks) {
      const targetId = link.slice(2, -2);
      hasIncoming.add(targetId);
    }
  }

  type OrphanGroup = "test" | "entry" | "leaf" | "isolated";
  const orphans: Array<{ rel: string; group: OrphanGroup }> = [];
  for (const a of analyses) {
    const hasOut = a.uniqueLinks.length > 0;
    const hasIn = hasIncoming.has(a.noteId);
    if (hasOut || hasIn) continue;

    let group: OrphanGroup;
    if (a.rel.endsWith(".test.ts") || a.rel.endsWith(".test.tsx")) {
      group = "test";
    } else if (
      /^src\/app\/(layout|page|error|loading|not-found)\.(tsx?|jsx?)$/.test(a.rel) ||
      a.rel.endsWith(".css") ||
      /^src\/test\/setup\.(ts|tsx)$/.test(a.rel)
    ) {
      group = "entry";
    } else if (a.tags.some((t) => t.startsWith("entry/"))) {
      group = "entry";
    } else if (!hasOut && hasIn) {
      group = "leaf";
    } else {
      group = "isolated";
    }
    orphans.push({ rel: a.rel, group });
  }

  const crossModuleDeps = new Map<string, Set<string>>();
  for (const a of analyses) {
    const fromMod = getModuleNameFromFileRel(a.rel);
    if (!fromMod) continue;
    for (const hit of a.hits) {
      const toMod = hit.rawPath.startsWith("@/")
        ? getModuleNameFromImport(hit.rawPath)
        : getModuleNameFromFileRel(hit.resolvedNoteId.replaceAll("---", "/"));
      if (!toMod || toMod === fromMod) continue;
      if (!crossModuleDeps.has(fromMod)) crossModuleDeps.set(fromMod, new Set());
      crossModuleDeps.get(fromMod)!.add(toMod);
    }
  }

  const violationCounts: Record<ViolationType, number> = {
    "circular-dep": 0,
    "client-server-leak": 0,
    "deep-import": 0,
    "app-deep-import": 0,
    "schema-impure": 0,
  };
  for (const a of analyses) {
    for (const v of a.violations) violationCounts[v]++;
  }
  const totalViolations = Object.values(violationCounts).reduce((s, n) => s + n, 0);

  const lines: string[] = [];

  lines.push("# Graph Context");
  lines.push(`> Generated: ${generated}`);
  lines.push(`> Attach this file when asking an external AI about the dependency graph.`);
  lines.push("");

  lines.push("## Overview");
  lines.push(`- Total files: ${analyses.length}`);
  lines.push(`- Total edges (tracked imports): ${totalEdges}`);
  lines.push(`- Modules: ${moduleMap.size}`);
  lines.push(`- Orphan nodes: ${orphans.length} (see Orphans section)`);
  lines.push(`- Violations: ${totalViolations} (see .VIOLATIONS.md for details)`);
  lines.push("");

  lines.push("## Node Color Legend");
  lines.push("Colors in Obsidian Graph View indicate file role or violation severity.");
  lines.push("");
  lines.push("| Color | Meaning |");
  lines.push("|---|---|");
  lines.push("| Red | Circular dependency (critical) |");
  lines.push("| Orange-red | Client-server leak (critical) |");
  lines.push("| Orange | Deep import — cross-module boundary violation (high) |");
  lines.push("| Yellow-orange | App layer bypassing module entry point (medium) |");
  lines.push("| Yellow | Schema file importing non-pure code (low) |");
  lines.push("| Pink | Middleware entry point |");
  lines.push("| Purple | Schema entry point (schema.ts) |");
  lines.push("| Purple (dark) | core/shared files |");
  lines.push("| Blue | Page / layout files (app layer) |");
  lines.push("| Light blue | Page-level components |");
  lines.push("| Cyan | Server action entry points (api/actions.ts) |");
  lines.push("| Green | Module entry points (client.ts / server.ts) |");
  lines.push("| White/Grey | Regular files |");
  lines.push("");

  lines.push("## Node Size Legend");
  lines.push("Node size reflects coupling score (inDegree + outDegree). Filter by tag to highlight.");
  lines.push("");
  lines.push("| Tag | Meaning |");
  lines.push("|---|---|");
  lines.push(`| \`coupling/high\` | inDegree + outDegree ≥ ${COUPLING_HIGH_THRESHOLD} — review recommended |`);
  lines.push(`| \`coupling/medium\` | inDegree + outDegree ≥ ${COUPLING_MEDIUM_THRESHOLD} — monitor |`);
  lines.push("");

  lines.push("## Modules");
  lines.push("");
  lines.push("| Module | Files | Entry Points |");
  lines.push("|---|---|---|");
  for (const [mod, files] of [...moduleMap.entries()].sort()) {
    const entryPoints = files
      .filter((f) => f.tags.some((t) => t === "entry/module"))
      .map((f) => path.basename(f.rel))
      .sort()
      .join(", ");
    lines.push(`| ${mod} | ${files.length} | ${entryPoints || "—"} |`);
  }
  lines.push("");

  lines.push("## Cross-Module Dependencies");
  lines.push("Format: `importer → [dependencies]`");
  lines.push("");
  for (const [fromMod, toMods] of [...crossModuleDeps.entries()].sort()) {
    lines.push(`- \`${fromMod}\` → [${[...toMods].sort().join(", ")}]`);
  }
  if (crossModuleDeps.size === 0) lines.push("_No cross-module dependencies detected._");
  lines.push("");

  lines.push("## Violations Summary");
  if (totalViolations === 0) {
    lines.push("No violations found. Architecture boundaries are clean.");
  } else {
    lines.push("| Type | Count |");
    lines.push("|---|---|");
    lines.push(`| Circular Dependency (critical) | ${violationCounts["circular-dep"]} |`);
    lines.push(`| Client-Server Leak (critical)  | ${violationCounts["client-server-leak"]} |`);
    lines.push(`| Deep Import (high)             | ${violationCounts["deep-import"]} |`);
    lines.push(`| App Deep Import (medium)       | ${violationCounts["app-deep-import"]} |`);
    lines.push(`| Schema Impure (low)            | ${violationCounts["schema-impure"]} |`);
    lines.push("");
    lines.push("See `.VIOLATIONS.md` for full details.");
  }
  lines.push("");

  {
    const inDeg = new Map<string, number>();
    for (const a of analyses) {
      for (const hit of a.hits) {
        inDeg.set(hit.resolvedNoteId, (inDeg.get(hit.resolvedNoteId) ?? 0) + 1);
      }
    }
    const highCoupling = analyses
      .map((a) => ({
        rel: a.rel,
        score: (inDeg.get(a.noteId) ?? 0) + a.uniqueLinks.length,
        inDegree: inDeg.get(a.noteId) ?? 0,
        outDegree: a.uniqueLinks.length,
      }))
      .filter((x) => x.score >= COUPLING_MEDIUM_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    lines.push("## High-Coupling Files");
    if (highCoupling.length > 0) {
      lines.push(
        `Files with coupling score ≥ ${COUPLING_MEDIUM_THRESHOLD}. ` +
        `Score ≥ ${COUPLING_HIGH_THRESHOLD} = **high**, ≥ ${COUPLING_MEDIUM_THRESHOLD} = **medium**.`,
      );
      lines.push("");
      lines.push("| File | Score | In | Out | Level |");
      lines.push("|---|---|---|---|---|");
      for (const x of highCoupling) {
        const level = x.score >= COUPLING_HIGH_THRESHOLD ? "high" : "medium";
        lines.push(`| \`${x.rel}\` | ${x.score} | ${x.inDegree} | ${x.outDegree} | ${level} |`);
      }
    } else {
      lines.push("_No files exceed the coupling threshold._");
    }
    lines.push("");
  }

  lines.push("## Orphan Nodes");
  lines.push("Nodes with no tracked edges in or out. Grouped by likely cause.");
  lines.push("");

  const orphanGroups: Record<OrphanGroup, string[]> = {
    test: [],
    entry: [],
    leaf: [],
    isolated: [],
  };
  for (const o of orphans) orphanGroups[o.group].push(o.rel);

  const groupMeta: Record<OrphanGroup, { label: string; concern: string }> = {
    test: {
      label: "Test files",
      concern: "Not a concern — test files are never imported.",
    },
    entry: {
      label: "Entry / framework files",
      concern: "Not a concern — Next.js root pages, CSS, test setup, or module entries imported by app/ layer outside graph scope.",
    },
    leaf: {
      label: "Leaf nodes",
      concern: "Not a concern — consumed by others but import nothing themselves.",
    },
    isolated: {
      label: "Isolated files",
      concern: "Review recommended — no connections detected.",
    },
  };

  for (const group of ["isolated", "entry", "leaf", "test"] as OrphanGroup[]) {
    const files = orphanGroups[group];
    if (files.length === 0) continue;
    const meta = groupMeta[group];
    lines.push(`### ${meta.label} (${files.length})`);
    lines.push(`_${meta.concern}_`);
    lines.push("");
    for (const rel of files.sort()) lines.push(`- \`${rel}\``);
    lines.push("");
  }

  if (orphans.length === 0) lines.push("_No orphan nodes._\n");

  const outPath = path.join(OUTPUT_DIR, ".GRAPH-CONTEXT.md");
  await writeReportFile(outPath, lines.join("\n"));
  process.stdout.write(`Graph context: ${outPath}\n`);
}

function normalizeGeneratedLine(md: string): string {
  return md
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replace(/^> Generated: .*$/m, "> Generated: __GENERATED__");
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") return null;
    throw err;
  }
}

async function writeReportFile(outPath: string, nextContent: string) {
  const prev = await readFileIfExists(outPath);
  if (prev !== null) {
    const prevNormalized = normalizeGeneratedLine(prev);
    const nextNormalized = normalizeGeneratedLine(nextContent);
    if (prevNormalized === nextNormalized) return;
  }
  await fs.writeFile(outPath, nextContent, "utf8");
}

function getCouplingBucket(score: number): CouplingBucket | null {
  if (score >= COUPLING_HIGH_THRESHOLD) return "high";
  if (score >= COUPLING_MEDIUM_THRESHOLD) return "medium";
  return null;
}

function buildFrontmatterTags(rel: string, violations: ViolationType[]): string[] {
  const layerMatch = /^src\/([^/]+)\//.exec(rel);
  const layer = layerMatch ? layerMatch[1] : "src";
  const tags = [`layer/${layer}`];

  const moduleName = getModuleNameFromFileRel(rel);
  if (moduleName) tags.push(`module/${moduleName}`);

  for (const v of violations) tags.push(`violation/${v}`);

  const areaTag = getAreaTag(rel);
  if (areaTag) tags.push(areaTag);

  for (const entryTag of getEntryTags(rel)) tags.push(entryTag);

  return uniq(tags);
}

async function writeGraphConfig() {
  const graphConfig = {
    "collapse-filter": false,
    search: "",
    showTags: true,
    showAttachments: false,
    hideUnresolved: false,
    showOrphans: true,
    "collapse-color-groups": false,
    colorGroups: GRAPH_COLOR_GROUPS,
    "collapse-display": true,
    showArrow: true,
    textFadeMultiplier: 0,
    nodeSizeMultiplier: 1.2,
    lineSizeMultiplier: 1,
    "collapse-forces": true,
    centerStrength: 0.518713248970312,
    repelStrength: 10,
    linkStrength: 1,
    linkDistance: 250,
    scale: 1,
    close: false,
  };

  const configPath = path.join(OBSIDIAN_CONFIG_DIR, "graph.json");
  await fs.writeFile(configPath, JSON.stringify(graphConfig, null, 2), "utf8");
}

async function cleanOutputDir() {
  const entries = await fs.readdir(OUTPUT_DIR, { withFileTypes: true });
  await Promise.all(
    entries
      .filter(
        (e) =>
          e.name !== ".obsidian" &&
          e.name !== ".VIOLATIONS.md" &&
          e.name !== ".GRAPH-CONTEXT.md",
      )
      .map((e) =>
        fs.rm(path.join(OUTPUT_DIR, e.name), { recursive: true, force: true }),
      ),
  );
}

async function listFilesRecursively(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listFilesRecursively(full)));
      continue;
    }
    if (!entry.isFile()) continue;
    results.push(full);
  }
  return results;
}

function isFileInFilteredModules(fileRelPosix: string): boolean {
  if (!FILTER_MODULES) return true;
  const moduleName = getModuleNameFromFileRel(fileRelPosix);
  if (moduleName === null) return true;
  return FILTER_MODULES.includes(moduleName);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function statIfExists(p: string) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

// Strips comments before import extraction to avoid false positives from
// import-like strings inside comment blocks.
function stripCommentsAndStrings(source: string): string {
  const out: string[] = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    if (source[i] === "/" && source[i + 1] === "/") {
      while (i < len && source[i] !== "\n") i++;
      continue;
    }
    if (source[i] === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < len && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out.push(source[i]);
    i++;
  }

  return out.join("");
}

function extractRelevantSpecifiers(
  sourceText: string,
  options: { includeRelative: boolean },
): string[] {
  const results: string[] = [];
  const lines = sourceText.split(/\r?\n/);

  const fromRegex = /\bfrom\s+["'](@\/(?:modules|lib|app)\/[^"']+)["']/g;
  const importCallRegex = /\bimport\s*\(\s*["'](@\/(?:modules|lib|app)\/[^"']+)["']\s*\)/g;
  const requireRegex = /\brequire\s*\(\s*["'](@\/(?:modules|lib|app)\/[^"']+)["']\s*\)/g;
  const exportFromRegex = /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["'](\.{1,2}\/[^"']+)["']/g;
  const importFromRelativeRegex = /\bfrom\s+["'](\.{1,2}\/[^"']+)["']/g;
  const importSideEffectRelativeRegex = /\bimport\s+["'](\.{1,2}\/[^"']+)["']/g;
  const requireRelativeRegex = /\brequire\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;

  for (const line of lines) {
    for (const match of line.matchAll(fromRegex)) results.push(match[1]);
    for (const match of line.matchAll(importCallRegex)) results.push(match[1]);
    for (const match of line.matchAll(requireRegex)) results.push(match[1]);
    if (options.includeRelative) {
      for (const match of line.matchAll(exportFromRegex)) results.push(match[1]);
      for (const match of line.matchAll(importFromRelativeRegex)) results.push(match[1]);
      for (const match of line.matchAll(importSideEffectRelativeRegex)) results.push(match[1]);
      for (const match of line.matchAll(requireRelativeRegex)) results.push(match[1]);
    }
  }

  return uniq(
    results.filter(
      (p) =>
        TRACKED_IMPORT_PREFIXES.some((x) => p.startsWith(x)) ||
        (options.includeRelative && (p.startsWith("./") || p.startsWith("../"))),
    ),
  );
}

async function resolveImportToNoteId(importPath: string): Promise<string> {
  const relGuess = importPath.startsWith("@/")
    ? `src/${importPath.slice(2)}`
    : importPath;
  const resolvedRel = await resolveToExistingFileRelativeToRoot(relGuess);
  if (resolvedRel) return toNoteId(toPosixPath(resolvedRel));
  const hasExt = /\.[a-zA-Z0-9]+$/.test(relGuess);
  return toNoteId(toPosixPath(hasExt ? relGuess : `${relGuess}.ts`));
}

async function resolveToExistingFileRelativeToRoot(
  relativePathFromRoot: string,
): Promise<string | null> {
  const fullBase = path.resolve(process.cwd(), relativePathFromRoot);
  const baseStat = await statIfExists(fullBase);

  if (baseStat?.isFile()) return relativePathFromRoot;

  if (!baseStat) {
    for (const ext of RESOLVE_EXTENSIONS) {
      const stat = await statIfExists(`${fullBase}${ext}`);
      if (stat?.isFile()) return `${relativePathFromRoot}${ext}`;
    }
  }

  if (baseStat?.isDirectory()) {
    for (const ext of RESOLVE_EXTENSIONS) {
      const candidate = path.join(fullBase, `index${ext}`);
      const stat = await statIfExists(candidate);
      if (stat?.isFile())
        return toPosixPath(path.join(relativePathFromRoot, `index${ext}`));
    }
  }

  return null;
}

async function resolveRelativeSpecifierToNoteId(
  relativeSpecifier: string,
  fromFileRelPosix: string,
): Promise<string> {
  const fromDirPosix = path.posix.dirname(fromFileRelPosix);
  const posixRelFromRoot = path.posix.normalize(
    path.posix.join(fromDirPosix, relativeSpecifier),
  );
  const osRelFromRoot = path.join(...posixRelFromRoot.split("/"));
  const resolvedRel = await resolveToExistingFileRelativeToRoot(osRelFromRoot);
  if (resolvedRel) return toNoteId(toPosixPath(resolvedRel));
  const hasExt = /\.[a-zA-Z0-9]+$/.test(posixRelFromRoot);
  return toNoteId(hasExt ? posixRelFromRoot : `${posixRelFromRoot}.ts`);
}

function isSchemaFile(fileRelPosix: string): boolean {
  if (fileRelPosix.includes("/schema/")) return true;
  if (/\/schema\.ts$/.test(fileRelPosix)) return true;
  if (/\/db\/schema\.ts$/.test(fileRelPosix)) return true;
  if (/\.schema\.ts$/.test(fileRelPosix)) return true;
  return false;
}

function isSchemaPath(importPath: string): boolean {
  if (importPath.includes("/schema/")) return true;
  if (importPath.includes("/schema.ts")) return true;
  if (/\/db\/schema/.test(importPath)) return true;
  if (importPath.endsWith(".schema")) return true;
  if (importPath.endsWith(".schema.ts")) return true;
  if (/\/schema$/.test(importPath)) return true;
  return false;
}

function isModuleSchemaEntryPoint(importPath: string): boolean {
  return /^@\/modules\/[^/]+\/schema$/.test(importPath);
}

function getModuleNameFromFileRel(fileRelPosix: string): string | null {
  const m = /^src\/modules\/([^/]+)\//.exec(fileRelPosix);
  return m ? m[1] : null;
}

function getModuleNameFromImport(importPath: string): string | null {
  const m = /^@\/modules\/([^/]+)(?:\/|$)/.exec(importPath);
  return m ? m[1] : null;
}

function isAllowedCrossModuleEntryImport(importPath: string): boolean {
  const m = /^@\/modules\/([^/]+)(?:\/(.*))?$/.exec(importPath);
  if (!m) return true;
  const moduleName = m[1];
  const rest = m[2] ?? "";
  if (rest === "client" || rest === "server" || rest === "schema" || rest === "api/actions")
    return true;
  if (rest === "" && moduleName === "core") return true;
  return false;
}

function shouldIncludeRelativeEdges(fileRelPosix: string, mode: GraphMode): boolean {
  if (mode === "full") return true;
  if (/^src\/modules\/[^/]+\/(client|server|schema)\.ts$/.test(fileRelPosix)) return true;
  if (/^src\/modules\/[^/]+\/db\/schema\.ts$/.test(fileRelPosix)) return true;
  if (fileRelPosix === "src/lib/db/schema.ts") return true;
  return false;
}

function getAreaTag(fileRelPosix: string): string | null {
  if (fileRelPosix.startsWith("src/modules/")) {
    if (fileRelPosix.includes("/api/")) return "area/api";
    if (fileRelPosix.includes("/components/")) return "area/components";
    if (fileRelPosix.includes("/schema/")) return "area/schema";
    if (fileRelPosix.includes("/db/")) return "area/schema";
    return "area/module-root";
  }
  if (fileRelPosix.startsWith("src/app/")) return "area/app";
  if (fileRelPosix.startsWith("src/lib/")) return "area/lib";
  if (fileRelPosix === "src/middleware.ts") return "area/proxy";
  return null;
}

function getEntryTags(fileRelPosix: string): string[] {
  const tags: string[] = [];
  if (/^src\/app\/.*\/(page|layout)\.tsx$/.test(fileRelPosix)) tags.push("entry/page");
  if (fileRelPosix === "src/lib/db/schema.ts") tags.push("entry/schema");
  if (/^src\/modules\/[^/]+\/(client|server|schema)\.ts$/.test(fileRelPosix)) {
    tags.push("entry/module");
    if (fileRelPosix.endsWith("/schema.ts")) tags.push("entry/schema");
  }
  if (/^src\/modules\/[^/]+\/db\/schema\.ts$/.test(fileRelPosix)) tags.push("entry/schema");
  if (fileRelPosix === "src/modules/core/index.ts") {
    tags.push("entry/module");
    tags.push("core/shared");
  }
  if (/^src\/modules\/[^/]+\/api\/actions\.ts$/.test(fileRelPosix)) tags.push("entry/api");
  if (/^src\/modules\/[^/]+\/components\/.*View\.tsx$/.test(fileRelPosix)) tags.push("entry/view");
  if (/^src\/modules\/[^/]+\/components\/.+\/index\.tsx$/.test(fileRelPosix)) tags.push("entry/view");
  if (fileRelPosix.startsWith("src/modules/core/components/")) tags.push("core/shared");
  if (fileRelPosix.startsWith("src/modules/core/lib/")) tags.push("core/shared");
  if (fileRelPosix.startsWith("src/modules/core/constants/")) tags.push("core/shared");
  if (fileRelPosix === "src/modules/core/server.ts") {
    tags.push("entry/module");
    tags.push("core/shared");
  }
  if (fileRelPosix.startsWith("src/modules/core/server/")) tags.push("core/shared");
  if (fileRelPosix === "src/middleware.ts") tags.push("entry/proxy");
  return uniq(tags);
}

function toPosixPath(p: string): string {
  return p.replaceAll("\\", "/");
}

function toNoteOutputPath(relPathPosix: string): string {
  return path.join(OUTPUT_DIR, relPathPosix.replaceAll("/", "---") + ".md");
}

function toNoteId(relPathPosix: string): string {
  return relPathPosix.replaceAll("/", "---");
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

type GraphMode = "focus" | "full";

function parseMode(argv: string[]): GraphMode {
  const modeArg = argv.find((a) => a.startsWith("--mode="));
  const value = modeArg?.slice("--mode=".length);
  if (value === "focus" || value === "full") return value;
  return "full";
}

function hexToRgbInt(hex: string): number {
  return Number.parseInt(hex.replace("#", ""), 16);
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
