/**
 * Keeps React from crashing when browser translation rewrites the page.
 *
 * Google Translate and similar extensions replace text nodes with their own
 * <font> wrappers. React still holds references to the original nodes, so a
 * later removeChild or insertBefore on them throws "The node to be removed is
 * not a child of this node" and unmounts the whole tree.
 * See https://github.com/facebook/react/issues/11538.
 *
 * The patch only changes behavior when the DOM no longer matches what React
 * expects, so normal rendering is untouched.
 */
export function installTranslationGuard() {
  if (typeof Node === "undefined" || !Node.prototype) return;

  const proto = Node.prototype as Node & { __translationGuard?: boolean };
  if (proto.__translationGuard) return;
  proto.__translationGuard = true;

  const originalRemoveChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      // The node was moved into a translation wrapper or already detached.
      child.parentNode?.removeChild(child);
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      // Insert before the wrapper that now holds the reference node,
      // or append when the reference node is gone entirely.
      let anchor: Node | null = referenceNode;
      while (anchor && anchor.parentNode !== this) anchor = anchor.parentNode;
      return originalInsertBefore.call(this, newNode, anchor) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

installTranslationGuard();
