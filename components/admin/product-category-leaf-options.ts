export type ProductCategoryRoot = {
  id: string;
  name: string;
};

export type ProductCategoryHierarchyNode = {
  id: string;
  category_id: string;
  parent_subcategory_id: string | null;
  name: string;
};

export type ProductLeafCategoryOption = {
  id: string;
  name: string;
  rootCategoryId: string;
  subcategoryId: string | null;
  editable: boolean;
};

/**
 * Product assignment always targets a leaf in the category tree.
 *
 * Root without children:
 *   Monitors -> selectable
 *
 * Root with children:
 *   Phones -> hidden
 *     iPhone -> selectable when it has no children
 *     Samsung -> selectable when it has no children
 *
 * The same rule continues recursively for deeper subcategories.
 */
export function buildProductCategoryLeafOptions(
  categories: ProductCategoryRoot[],
  subcategories: ProductCategoryHierarchyNode[],
): ProductLeafCategoryOption[] {
  const nodesByCategory = new Map<
    string,
    ProductCategoryHierarchyNode[]
  >();

  for (const node of subcategories) {
    const current = nodesByCategory.get(node.category_id) ?? [];
    current.push(node);
    nodesByCategory.set(node.category_id, current);
  }

  const result: ProductLeafCategoryOption[] = [];

  for (const category of categories) {
    const categoryNodes = nodesByCategory.get(category.id) ?? [];

    const childrenByParent = new Map<
      string,
      ProductCategoryHierarchyNode[]
    >();

    for (const node of categoryNodes) {
      const parentKey = node.parent_subcategory_id ?? "__root__";
      const current = childrenByParent.get(parentKey) ?? [];

      current.push(node);
      childrenByParent.set(parentKey, current);
    }

    const rootChildren = childrenByParent.get("__root__") ?? [];

    if (rootChildren.length === 0) {
      result.push({
        id: category.id,
        name: category.name,
        rootCategoryId: category.id,
        subcategoryId: null,
        editable: true,
      });

      continue;
    }

    const visited = new Set<string>();

    function appendLeaves(node: ProductCategoryHierarchyNode) {
      if (visited.has(node.id)) {
        return;
      }

      visited.add(node.id);

      const children = childrenByParent.get(node.id) ?? [];

      if (children.length === 0) {
        result.push({
          id: node.id,
          name: node.name,
          rootCategoryId: category.id,
          subcategoryId: node.id,
          editable: true,
        });

        return;
      }

      for (const child of children) {
        appendLeaves(child);
      }
    }

    for (const child of rootChildren) {
      appendLeaves(child);
    }
  }

  return result;
}
