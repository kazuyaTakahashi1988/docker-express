"use strict";

const { builders } = require("prettier/doc");

const EJS_BLOCK_PATTERN = /<%[\s\S]*?%>/g;
const SCRIPT_BLOCK_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function collapseExtraBlankLines(text) {
  return text.replace(/(?:[ \t]*\r?\n){3,}/g, "\n\n");
}

function convertHtmlAttributeQuotes(text) {
  return text.replace(/(\s[\w:-]+)='([^'\n<>]*)'/g, (_match, name, value) => {
    return `${name}="${value.replace(/"/g, "&quot;")}"`;
  });
}

function hasUnescapedDoubleQuote(value) {
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      return true;
    }
  }

  return false;
}

function convertSingleQuotedJsStrings(code) {
  let result = "";
  let index = 0;

  while (index < code.length) {
    const char = code[index];

    if (char !== "'") {
      result += char;
      index += 1;
      continue;
    }

    let end = index + 1;
    let value = "";
    let escaped = false;

    while (end < code.length) {
      const nextChar = code[end];

      if (escaped) {
        value += nextChar;
        escaped = false;
        end += 1;
        continue;
      }

      if (nextChar === "\\") {
        value += nextChar;
        escaped = true;
        end += 1;
        continue;
      }

      if (nextChar === "'") {
        break;
      }

      if (nextChar === "\n" || nextChar === "\r") {
        break;
      }

      value += nextChar;
      end += 1;
    }

    if (code[end] !== "'" || hasUnescapedDoubleQuote(value)) {
      result += char;
      index += 1;
      continue;
    }

    result += `"${value.replace(/\\"/g, '"').replace(/"/g, '\\"')}"`;
    index = end + 1;
  }

  return result;
}

function convertInMatchedBlocks(text, pattern) {
  return text.replace(pattern, (block) => convertSingleQuotedJsStrings(block));
}

function removeQuotedText(text) {
  let result = "";
  let quote = "";
  let escaped = false;

  for (const char of text) {
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = "";
      }

      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    result += char;
  }

  return result;
}

function countBraceDelta(text) {
  const textWithoutStrings = removeQuotedText(text);
  const openingCount = (textWithoutStrings.match(/{/g) || []).length;
  const closingCount = (textWithoutStrings.match(/}/g) || []).length;

  return openingCount - closingCount;
}

function getCodeForLiteralDetection(line, isInEjs) {
  const trimmed = line.trim();

  if (isInEjs) {
    return trimmed;
  }

  const ejsMatch = trimmed.match(/^<%[-=#]?\s*([\s\S]*?)\s*%>$/);

  return ejsMatch ? ejsMatch[1].trim() : trimmed;
}

function isBlockOpening(code) {
  return (
    /^(if|for|while|switch|catch|function|class|try|else|finally)\b/.test(code) ||
    /=>\s*{$/.test(code)
  );
}

function isLiteralOpening(code, char) {
  if (char === "[") {
    return /(?:^|[:=,(])\s*\[$/.test(code);
  }

  return !isBlockOpening(code) && /(?:^|[:=,(])\s*{$/.test(code);
}

function shouldAddCommaToLiteralItem(line, literalStack) {
  if (!literalStack[literalStack.length - 1]) {
    return false;
  }

  const trimmed = line.trim();

  if (
    !trimmed ||
    /^<%/.test(trimmed) ||
    /^%>/.test(trimmed) ||
    /^(\/\/|\/\*|\*)/.test(trimmed) ||
    /^[}\]],?$/.test(trimmed) ||
    /[,;{[(]$/.test(trimmed) ||
    isBlockOpening(trimmed)
  ) {
    return false;
  }

  return true;
}

function updateLiteralStack(line, literalStack, isInEjs) {
  const code = removeQuotedText(getCodeForLiteralDetection(line, isInEjs));

  for (let index = 0; index < code.length; index += 1) {
    const char = code[index];

    if (char === "{" || char === "[") {
      literalStack.push(isLiteralOpening(code.slice(0, index + 1).trim(), char));
      continue;
    }

    if (char === "}" || char === "]") {
      literalStack.pop();
    }
  }
}

function shouldAddCommaToNestedLiteralClose(line, literalStackBefore, literalStackAfter) {
  const trimmed = line.trim();

  return (
    /^[}\]],?$/.test(trimmed) &&
    literalStackBefore[literalStackBefore.length - 1] &&
    literalStackAfter[literalStackAfter.length - 1] &&
    !trimmed.endsWith(",")
  );
}

function addTrailingComma(line) {
  return line.replace(/(\s*)$/, ",$1");
}

function addTrailingCommas(text) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const literalStack = [];
  let isInScript = false;
  let isInEjs = false;

  return lines
    .map((line) => {
      const trimmed = line.trim();
      const isJsLine = isInScript || isInEjs || /^<%[-=#]?/.test(trimmed);
      const stackBefore = [...literalStack];
      let formattedLine = line;

      if (isJsLine && shouldAddCommaToLiteralItem(line, literalStack)) {
        formattedLine = addTrailingComma(formattedLine);
      }

      if (isJsLine) {
        updateLiteralStack(formattedLine, literalStack, isInEjs);
      }

      if (
        isJsLine &&
        shouldAddCommaToNestedLiteralClose(formattedLine, stackBefore, literalStack)
      ) {
        formattedLine = addTrailingComma(formattedLine);
      }

      if (/^<%$/.test(trimmed)) {
        isInEjs = true;
      }

      if (/^%>$/.test(trimmed)) {
        isInEjs = false;
      }

      if (/<script\b[^>]*>/i.test(line) && !/<\/script\s*>/i.test(line)) {
        isInScript = true;
      }

      if (/<\/script\s*>/i.test(line)) {
        isInScript = false;
      }

      return formattedLine;
    })
    .join(eol);
}

function countTagDelta(line) {
  let delta = 0;
  const lineWithoutEjs = line.replace(EJS_BLOCK_PATTERN, "");
  const tagPattern = /<\/?([a-zA-Z][\w:-]*)(?:\s[^<>]*)?>/g;
  let match;

  while ((match = tagPattern.exec(lineWithoutEjs))) {
    const tag = match[0];
    const tagName = match[1].toLowerCase();

    if (tag.startsWith("</")) {
      delta -= 1;
      continue;
    }

    if (tag.endsWith("/>") || VOID_TAGS.has(tagName) || tag.startsWith("<!")) {
      continue;
    }

    delta += 1;
  }

  return delta;
}

function countEjsDelta(line) {
  let delta = 0;
  let match;

  while ((match = EJS_BLOCK_PATTERN.exec(line))) {
    delta += countBraceDelta(match[0].replace(/^<%-?=?#?/, "").replace(/%>$/, ""));
  }

  EJS_BLOCK_PATTERN.lastIndex = 0;
  return delta;
}

function countScriptDelta(line, isInScript) {
  if (!isInScript || /<\/script\s*>/i.test(line)) {
    return 0;
  }

  return countBraceDelta(line.replace(EJS_BLOCK_PATTERN, ""));
}

function countMultilineEjsDelta(line, isInEjs) {
  if (!isInEjs || /^<%/.test(line.trim()) || /^%>/.test(line.trim())) {
    return 0;
  }

  return countBraceDelta(line);
}

function getLeadingCloseCount(line, isInScript, isInEjs) {
  const trimmed = line.trim();
  let count = 0;

  if (/^<\//.test(trimmed)) {
    count += 1;
  }

  if (/^<%[-=#]?\s*}/.test(trimmed)) {
    count += 1;
  }

  if (isInScript && /^}/.test(trimmed)) {
    count += 1;
  }

  if (isInEjs && /^}/.test(trimmed)) {
    count += 1;
  }

  return count;
}

function indentEjs(text, tabWidth = 2) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const indentUnit = " ".repeat(tabWidth);
  let level = 0;
  let isInScript = false;
  let isInEjs = false;

  return lines
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return "";
      }

      const leadingCloseCount = getLeadingCloseCount(line, isInScript, isInEjs);
      level = Math.max(0, level - leadingCloseCount);

      const formattedLine = `${indentUnit.repeat(level)}${trimmed}`;
      const delta =
        countTagDelta(line) +
        countEjsDelta(line) +
        countScriptDelta(line, isInScript) +
        countMultilineEjsDelta(line, isInEjs);

      level = Math.max(0, level + delta + leadingCloseCount);

      if (/^<%$/.test(trimmed)) {
        isInEjs = true;
      }

      if (/^%>$/.test(trimmed)) {
        isInEjs = false;
      }

      if (/<script\b[^>]*>/i.test(line) && !/<\/script\s*>/i.test(line)) {
        isInScript = true;
      }

      if (/<\/script\s*>/i.test(line)) {
        isInScript = false;
      }

      return formattedLine;
    })
    .join(eol);
}

function formatEjs(text) {
  return indentEjs(
    addTrailingCommas(
      collapseExtraBlankLines(
        convertInMatchedBlocks(
          convertInMatchedBlocks(convertHtmlAttributeQuotes(text), EJS_BLOCK_PATTERN),
          SCRIPT_BLOCK_PATTERN,
        ),
      ),
    ),
  );
}

module.exports = {
  languages: [
    { name: "EJS", parsers: ["ejs-limited"], extensions: [".ejs"], vscodeLanguageIds: ["ejs"] },
  ],
  parsers: {
    "ejs-limited": {
      parse: (text) => ({ type: "ejs-limited-document", text: formatEjs(text) }),
      astFormat: "ejs-limited-document",
      locStart: () => 0,
      locEnd: (node) => node.text.length,
    },
  },
  printers: {
    "ejs-limited-document": { print: (path) => builders.concat([path.getValue().text]) },
  },
};
