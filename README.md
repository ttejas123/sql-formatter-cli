# sql-fmt

A tiny TypeScript CLI to format SQL queries. It highlights common SQL keywords, adds indentation and newlines, and supports a few options to customize output.

## Installation

- Local (inside a project):
  npm i -D sql-fmt

- Global:
  npm i -g sql-fmt

## Usage

You can pass a file, a quoted SQL string, or read from stdin.

sql-fmt [options] <file.sql | "SQL QUERY" | ->

Examples:
- From a file:
  sql-fmt query.sql

- From a quoted string:
  sql-fmt "select id, name from users where id in (1,2,3);"

- From stdin:
  echo "select * from users where id = 1" | sql-fmt -

- With options:
  sql-fmt --indent 4 --keyword-case lower "SELECT id, name FROM users WHERE id IN (1, 2, 3);"

- Using --sql option explicitly:
  sql-fmt --sql "select * from users where id = 42"

## Options
- --indent <n>        Number of spaces per indent (default: 2)
- --keyword-case <c>  Keyword case: upper | lower | keep (default: upper)
- --sql <query>       Provide SQL as a string explicitly (overrides file/stdin)
- --help              Show help
- --version           Show version

## Programmatic use

You can import the formatter and use it in your tools:

import { formatSQL } from "sql-fmt";

const pretty = formatSQL("select id, name from users where id in (1,2,3)", {
  indentSize: 2,
  keywordCase: "upper",
});

console.log(pretty);

## Notes
- This formatter is intentionally simple and rule-based. It doesn’t fully parse SQL, but it works well for many common queries.
- Supports keywords: SELECT, FROM, WHERE, GROUP BY, ORDER BY, HAVING, LIMIT, JOIN (and variants), ON, AS, AND, OR, UNION, INSERT, INTO, VALUES, UPDATE, SET, DELETE.

## Development
- Build: npm run build
- Dev (ts-node): npm run dev
- Tests: npm test (Note: included tests are placeholders from another project and may not apply.)

## License
MIT
