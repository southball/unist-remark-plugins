import { Data, Node, NodeData, Parent } from "unist";

type Awaitable<T> = PromiseLike<T> | T;
type Flattenable<T> = T[] | T;

const id = <T>(x: T): T => x;
const notUndefined = <T>(x: T | undefined): x is T => x !== undefined;

const isParent = (node: Node): node is Parent => "children" in node;

type Action = (node: Node, index: number, parent?: Node) => Node;

type ActionAsync = (
  node: Node,
  index: number,
  parent?: Node
) => Awaitable<Node>;

type ActionFlatten = (
  node: Node,
  index: number,
  parent?: Node
) => Flattenable<Node | undefined>;

type ActionAsyncFlatten = (
  node: Node,
  index: number,
  parent?: Node
) => Awaitable<Flattenable<Node | undefined>>;

export const traverse = (node: Node, visitor: Action): Node => {
  const traverseInternal = (
    node: Node,
    visitor: Action,
    index: number = 0,
    parent: Node | undefined = undefined
  ): Node => {
    if (isParent(node)) {
      const children = node.children.map((child, index) =>
        traverseInternal(child, visitor, index, node)
      );
      return {
        ...node,
        children,
      } as Parent as Node;
    } else {
      return visitor(node, index, parent);
    }
  };
  return traverseInternal(node, visitor);
};

export const traverseAsync = async (
  node: Node,
  visitor: ActionAsync
): Promise<Node> => {
  const traverseAsyncInternal = async (
    node: Node,
    visitor: ActionAsync,
    index: number = 0,
    parent: Node | undefined = undefined
  ): Promise<Node> => {
    if (isParent(node)) {
      const children = await Promise.all(
        node.children.map((child, index) =>
          traverseAsyncInternal(child, visitor, index, node)
        )
      );
      return {
        ...node,
        children,
      } as Parent as Node;
    } else {
      return await visitor(node, index, parent);
    }
  };

  return await traverseAsyncInternal(node, visitor);
};

export const traverseFlatten = (
  node: Node,
  visitor: ActionFlatten
): Array<Node> => {
  const traverseFlattenInternal = (
    node: Node,
    visitor: ActionFlatten,
    index: number = 0,
    parent: Node | undefined = undefined
  ): Flattenable<Node | undefined> => {
    if (isParent(node)) {
      const results = node.children.map((child, index) =>
        traverseFlattenInternal(child, visitor, index, node)
      );
      const children = results
        .flatMap(id)
        .filter((result) => result !== undefined);
      return {
        ...node,
        children,
      } as Parent as Node;
    } else {
      return visitor(node, index, parent);
    }
  };

  const result = traverseFlattenInternal(node, visitor);
  if (Array.isArray(result)) {
    return result.flatMap(id).filter(notUndefined);
  } else {
    return [result].filter(notUndefined);
  }
};

export const traverseAsyncFlatten = async (
  node: Node,
  visitor: ActionAsyncFlatten
): Promise<Array<Node>> => {
  const traverseAsyncFlattenInternal = async (
    node: Node,
    visitor: ActionAsyncFlatten,
    index: number = 0,
    parent: Node | undefined = undefined
  ): Promise<Flattenable<Node | undefined>> => {
    if (isParent(node)) {
      const results = await Promise.all(
        node.children.map((child, index) =>
          traverseAsyncFlattenInternal(child, visitor, index, node)
        )
      );
      const children = results
        .flatMap(id)
        .filter((result) => result !== undefined);
      return {
        ...node,
        children,
      } as Parent as Node;
    } else {
      return await visitor(node, index, parent);
    }
  };

  const result = await traverseAsyncFlattenInternal(node, visitor);
  if (Array.isArray(result)) {
    return result.flatMap(id).filter(notUndefined);
  } else {
    return [result].filter(notUndefined);
  }
};
