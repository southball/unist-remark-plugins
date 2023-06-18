import type { Transformer } from "unified";
import type { Node } from "unist";
import { Data } from "vfile";
import { exec } from "child_process";
import * as fs from "fs";
import which from "which";
import type { Code } from "mdast";
import jsdom from "jsdom";
import * as os from "os";
import { traverseAsyncFlatten } from "unist-util-traverse";

type RemarkMermaidOptions = {
  themes: string[];
};

const defaultOptions = {
  themes: ["default"],
};

/**
 * Reprefixing the IDs of definitions in SVG in order to show multiple diagrams
 * with different themes on the same page.
 */
const postprocess = (svgContent: string, prefix: string): string => {
  const svg = new jsdom.JSDOM(svgContent);

  const svgId = svg.window.document.querySelector("svg")!.id;
  const replacementSvgId = `${prefix}${svgId}`;

  const defines = [...svg.window.document.querySelectorAll("defs marker")];

  const replacements = [];

  for (const define of defines) {
    replacements.push([`url(#${define.id})`, `url(#${prefix}${define.id})`]);
    define.id = prefix + define.id;
  }

  return replacements.reduce(
    (content, [before, after]) =>
      content.replaceAll(before, after).replaceAll(svgId, replacementSvgId),
    svg.window.document.body.innerHTML
  );
};

const renderSVG = async (
  mermaidContent: string,
  theme: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const prefix = `${os.tmpdir()}/mermaid-${Math.random()}`;
    fs.writeFileSync(`${prefix}.mmd`, mermaidContent);
    exec(
      `${which.sync("mmdc")} ` +
        `-i "${prefix}.mmd" ` +
        `-o "${prefix}.svg" ` +
        `-t ${theme} ` +
        `-b transparent`,
      (err, data) => {
        if (err) reject(err);
        else {
          resolve(
            postprocess(
              fs.readFileSync(`${prefix}.svg`, "utf-8"),
              `remark-mermaid-postprocess-${theme}-`
            )
          );
        }
      }
    );
  });
};

const isCode = (node: Node<Data>): node is Code => node.type === "code";

export default function remarkMermaid(
  options: RemarkMermaidOptions = defaultOptions
): Transformer {
  return async (node: Node<Data>, vFile, callback) => {
    const newTree = (
      await traverseAsyncFlatten(node, async (node) => {
        if (!isCode(node)) return node;

        const { lang, value } = node;

        if (lang !== "mermaid") return node;

        const newNodes = Promise.all(
          options.themes.map(async (theme) => {
            return {
              type: "html",
              value: `<div class="remark-mermaid remark-mermaid-${theme}">${await renderSVG(
                value,
                theme
              )}</div>`,
            };
          })
        );

        return newNodes;
      })
    )[0];

    if (typeof callback === "function") return callback(null, newTree, vFile);
    else return newTree;
  };
}
