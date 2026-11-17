import { Node } from "@tiptap/core";

// Keep existing GFM tables editable when a legacy write-up enters the visual editor.
export const ContentTable = Node.create({
  name: "table", group: "block", content: "tableRow+", isolating: true,
  parseHTML() { return [{ tag: "table" }]; },
  renderHTML() { return ["table", {}, ["tbody", {}, 0]]; },
  markdownTokenName: "table",
  parseMarkdown(token, helpers) {
    const cell = (value: { tokens?: Parameters<typeof helpers.parseInline>[0]; text?: string }, header: boolean) => helpers.createNode(header ? "tableHeader" : "tableCell", {}, [helpers.createNode("paragraph", {}, value.tokens ? helpers.parseInline(value.tokens) : [helpers.createTextNode(value.text ?? "")])]);
    return helpers.createNode("table", {}, [helpers.createNode("tableRow", {}, (token.header ?? []).map((value: Parameters<typeof cell>[0]) => cell(value, true))), ...(token.rows ?? []).map((row: Parameters<typeof cell>[0][]) => helpers.createNode("tableRow", {}, row.map(value => cell(value, false))))]);
  },
});
export const ContentTableRow = Node.create({ name: "tableRow", content: "(tableCell|tableHeader)+", parseHTML() { return [{ tag: "tr" }]; }, renderHTML() { return ["tr", {}, 0]; } });
export const ContentTableCell = Node.create({ name: "tableCell", content: "block+", isolating: true, parseHTML() { return [{ tag: "td" }]; }, renderHTML() { return ["td", {}, 0]; } });
export const ContentTableHeader = Node.create({ name: "tableHeader", content: "block+", isolating: true, parseHTML() { return [{ tag: "th" }]; }, renderHTML() { return ["th", {}, 0]; } });
export const contentTableExtensions = [ContentTable, ContentTableRow, ContentTableCell, ContentTableHeader];
