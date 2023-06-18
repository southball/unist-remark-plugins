import type { Transformer } from "unified";
import type { Node } from "unist";
import { Data } from "vfile";
import type { Code } from "mdast";
import JSON5 from "json5";
import { traverseFlatten } from "unist-util-traverse";

type CodeMeta = {
  fold?: {
    summary: string;
  };
};

const isCode = (node: Node): node is Code => node.type === "code";

export default function remarkCodeBlockSummary(): Transformer {
  return (node: Node<Data>, vFile, callback) => {
    const [newTree] = traverseFlatten(node, (node) => {
      if (!isCode(node)) return node;

      const { meta, ...nodeRemaining } = node;
      const parsedMeta: CodeMeta = JSON5.parse(meta ?? "{}");

      if (parsedMeta.fold) {
        const newNodes = [
          {
            type: "paragraph",
            children: [
              {
                type: "html",
                value: `<details><summary>${parsedMeta.fold.summary}</summary>`,
              },
            ],
          },
          { ...nodeRemaining },
          {
            type: "paragraph",
            children: [{ type: "html", value: "</details>" }],
          },
        ];

        return newNodes;
      }

      return node;
    });

    if (typeof callback === "function") return callback(null, newTree, vFile);
    else return newTree;
  };
}
