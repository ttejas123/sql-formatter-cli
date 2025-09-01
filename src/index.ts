#!/usr/bin/env node
import fs from "fs";
import path from "path";

// Predefined SQL keywords
const KEYWORDS = [
  "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY",
  "HAVING", "LIMIT", "JOIN", "INNER JOIN", "LEFT JOIN",
  "RIGHT JOIN", "FULL JOIN", "ON", "AS", "AND", "OR", "UNION",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE"
];

type KeywordCase = "upper" | "lower" | "keep";

interface FormatOptions {
  indentSize?: number; // spaces per level
  keywordCase?: KeywordCase;
}

// Normalize/case keywords in a SQL string according to option
function normalizeKeywords(query: string, keywordCase: KeywordCase = "upper") {
  let formatted = query.replace(/\s+/g, " ").trim(); // normalize spaces

  for (const kw of KEYWORDS) {
    const regexVersion = kw.replace(/ /g, "\\s+");
    const regex = new RegExp("\\b" + regexVersion + "\\b", "gi");
    formatted = formatted.replace(regex, (m) => {
      if (keywordCase === "upper") return kw;
      if (keywordCase === "lower") return kw.toLowerCase();
      return m; // keep original
    });
  }
  return formatted;
}

// SQL Formatter Core
export function formatSQL(sql: string, opts: FormatOptions = {}) {
  const indentSize = Math.max(0, opts.indentSize ?? 2);
  const keywordCase = opts.keywordCase ?? "upper";
  const spaceUnit = " ".repeat(indentSize);

  const ite = normalizeKeywords(sql, keywordCase);
  let result = "";
  let indent = 0;
  // Tokenize on whitespace, parens, commas, semicolons
  const tokens = ite.split(/(\s+|\(|\)|,|;)/);

  let prevWasKeyword = false;

  for (let i = 0; i < tokens.length; i++) {
    const tokenRaw = tokens[i];
    if (!tokenRaw || !tokenRaw.trim()) continue;
    const token = tokenRaw.trim();

    if (token === "(") {
      // opening parenthesis: place on same line if following a keyword or function, then newline and indent contents
      result = result.trimEnd() + " (\n" + spaceUnit.repeat(++indent);
      prevWasKeyword = false;
    } else if (token === ")") {
      indent = Math.max(0, indent - 1);
      result += "\n" + spaceUnit.repeat(indent) + ")";
      prevWasKeyword = false;
    } else if (token === ",") {
      result = result.trimEnd() + ",\n" + spaceUnit.repeat(indent);
      prevWasKeyword = false;
    } else if (token === ";") {
      result = result.trimEnd() + ";\n";
      prevWasKeyword = false;
    } else if (KEYWORDS.includes(token.toUpperCase())) {
      // new line before top-level keywords
      result += (result.endsWith("\n") || result === "" ? "" : "\n") + spaceUnit.repeat(indent) + token + " ";
      prevWasKeyword = true;
    } else {
      if (prevWasKeyword) {
        result += token + " ";
      } else {
        result += token + " ";
      }
      prevWasKeyword = false;
    }
  }

  return result.trim() + (result.trim().endsWith(";") ? "" : "");
}

function printHelp() {
  const bin = path.basename(process.argv[1] || "sql-fmt");
  console.error(
    [
      `Usage: ${bin} [options] <file.sql | "SQL QUERY" | ->`,
      "",
      "Options:",
      "  --indent <n>        Number of spaces per indent (default: 2)",
      "  --keyword-case <c>  Keyword case: upper | lower | keep (default: upper)",
      "  --help              Show this help and exit",
      "  --version           Show version and exit",
      "",
      "Input:",
      "  - Pass a filepath to read from disk",
      "  - Pass a quoted SQL string",
      "  - Pass '-' to read from stdin",
    ].join("\n")
  );
}

function getVersion(): string {
  try {
    const pkgTxt = fs.readFileSync(new URL("../package.json", import.meta.url), "utf8");
    const pkg = JSON.parse(pkgTxt);
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// CLI
if (import.meta.url === (process.argv[1] ? new URL(`file://${process.argv[1]}`).href : "")) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }
  if (args.includes("--version") || args.includes("-v")) {
    console.log(getVersion());
    process.exit(0);
  }

  // parse options
  let indentSize: number | undefined;
  let keywordCase: KeywordCase | undefined;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--indent" && i + 1 < args.length) {
      indentSize = parseInt(args[++i]!, 10);
      continue;
    }
    if (a === "--keyword-case" && i + 1 < args.length) {
      const v = String(args[++i]).toLowerCase();
      if (v === "upper" || v === "lower" || v === "keep") keywordCase = v as KeywordCase;
      continue;
    }
    rest.push(a);
  }

  const input = rest.join(" ");

  function runFormat(inputSql: string) {
    const out = formatSQL(inputSql, { indentSize, keywordCase });
    console.log(out);
  }

  if (rest.length === 0) {
    // Read from stdin until EOF
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => runFormat(data));
    // If no stdin, print help
    if (process.stdin.isTTY) {
      printHelp();
      process.exit(1);
    }
  } else if (rest.length === 1 && rest[0] === "-") {
    // explicit stdin
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => runFormat(data));
  } else {
    const candidate = rest[0];
    try {
      if (candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const sql = fs.readFileSync(candidate, "utf8");
        runFormat(sql);
      } else {
        runFormat(input);
      }
    } catch (err) {
      console.error(`Error: ${String((err as Error).message || err)}`);
      process.exit(1);
    }
  }
}