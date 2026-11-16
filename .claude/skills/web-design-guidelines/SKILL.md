---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the local guidelines file `guidelines.md` (in this skill's directory)
2. Read the specified files (or the files changed by the current task)
3. Check against all rules in the guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

The rules are vendored in `guidelines.md`, pinned to the commit listed in `UPSTREAM.md`.
Do not fetch them from the network: the local copy is the source of truth for this project.

## Usage

When a file or pattern is given:
1. Read `guidelines.md`
2. Read the specified files
3. Apply all rules from the guidelines
4. Output findings using the format specified in the guidelines

If no files are specified, review the files changed by the current task.
