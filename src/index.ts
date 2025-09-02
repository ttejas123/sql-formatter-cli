#!/usr/bin/env node
import path from "path";

// Keywords
const KEYWORDS = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY",
    "HAVING", "LIMIT", "JOIN", "INNER JOIN", "LEFT JOIN",
    "RIGHT JOIN", "FULL JOIN", "ON", "AS", "AND", "OR", "UNION",
    "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE"
];

type KeywordCase = "upper" | "lower" | "keep";

interface FormatOptions {
    indentSize?: number;
    keywordCase?: KeywordCase;
}

function normalizeKeywords(query: string, keywordCase: KeywordCase = "upper") {
    let formatted = query.replace(/\s+/g, " ").trim();
    for (const kw of KEYWORDS) {
        const regexVersion = kw.replace(/ /g, "\\s+");
        const regex = new RegExp("\\b" + regexVersion + "\\b", "gi");
        formatted = formatted.replace(regex, (m) => {
            if (keywordCase === "upper") return kw;
            if (keywordCase === "lower") return kw.toLowerCase();
            return m;
        });
    }
    return formatted;
}

export function formatSQL(sql: string, opts: FormatOptions = {}) {
    const indentSize = Math.max(0, opts.indentSize ?? 2);
    const keywordCase = opts.keywordCase ?? "upper";
    const spaceUnit = " ".repeat(indentSize);

    const ite = normalizeKeywords(sql, keywordCase);
    let result = "";
    let indent = 0;

    const tokens = ite.split(/(\s+|\(|\)|,|;)/);
    let prevWasKeyword = false;

    for (const tokenRaw of tokens) {
        if (!tokenRaw || !tokenRaw.trim()) continue;
        const token = tokenRaw.trim();

        if (token === "(") {
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
            result += (result.endsWith("\n") || result === "" ? "" : "\n") +
                spaceUnit.repeat(indent) + token + " ";
            prevWasKeyword = true;
        } else {
            result += token + " ";
            prevWasKeyword = false;
        }
    }

    return result.trim();
}

function printHelp() {
    const bin = path.basename(process.argv[1] || "sql-fmt");
    console.error(
        [
            `Usage: ${bin} [options] "SQL QUERY"`,
            "",
            "Options:",
            "  --indent <n>        Number of spaces per indent (default: 2)",
            "  --keyword-case <c>  Keyword case: upper | lower | keep (default: upper)",
            "  --help              Show this help and exit",
            "  --version           Show version and exit",
            "",
            "Example:",
            `  ${bin} "select * from users where id=1"`,
        ].join("\n")
    );
}

function getVersion(): string {
    return "1.0.1";
}

// CLI
    const args = process.argv.slice(2);

    if (args.includes("--help") || args.includes("-h")) {
        printHelp();
        process.exit(0);
    }
    if (args.includes("--version") || args.includes("-v")) {
        console.log(getVersion());
        process.exit(0);
    }

    let indentSize: number | undefined;
    let keywordCase: KeywordCase | undefined;
    const sqlParts: string[] = [];

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
        sqlParts.push(a); // everything else is SQL
    }

    const sqlInput = sqlParts.join(" ").trim();
    if (!sqlInput) {
        console.error("Error: No SQL query provided.");
        printHelp();
        process.exit(1);
    }

    const out = formatSQL(sqlInput, { indentSize, keywordCase });
    console.log(out);
