"use client";

import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Package,
  Power,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import CategoryHomepageControls from "@/components/admin/category-homepage-controls";
import SubcategoryStorefrontControls from "./subcategory-storefront-controls";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  toggleCategory,
  toggleSubcategory,
  updateCategory,
  updateSubcategory,
} from "@/app/admin/categories/actions";

function CategoryDestructiveButton({
  label,
  pendingLabel,
  confirmation,
  disabled = false,
}: {
  label: string;
  pendingLabel: string;
  confirmation: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="is-danger st-category-destructive-action st-admin-image-destructive-v32"
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        if (!window.confirm(confirmation)) {
          event.preventDefault();
        }
      }}
    >
      <span>{pending ? pendingLabel : label}</span>
      <Trash2 aria-hidden="true" />
    </button>
  );
}

export type CategoryTreeRoot = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  show_on_homepage: boolean;
  homepage_theme: "light" | "dark";
  sort_order: number;
  is_active: boolean;
  productCount: number;
};

export type CategoryTreeNode = {
  id: string;
  category_id: string;
  parent_subcategory_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  homepage_theme: "light" | "dark";
  sort_order: number;
  is_active: boolean;
  productCount: number;
};

type Selection =
  { type: "category"; id: string } | { type: "subcategory"; id: string };

type Props = {
  categories: CategoryTreeRoot[];
  subcategories: CategoryTreeNode[];
};

function categoryClientSlugify(
  value: string,
) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}


function descendants(
  nodes: CategoryTreeNode[],
  parentId: string | null,
  categoryId: string,
) {
  return nodes
    .filter(
      (node) =>
        node.category_id === categoryId &&
        node.parent_subcategory_id === parentId,
    )
    .sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
}

export default function CategoryTreeManager({
  categories,
  subcategories,
}: Props) {
  const router = useRouter();

  const [isSaving, setIsSaving] =
    useState(false);

  const [isEditDirty, setIsEditDirty] =
    useState(false);

  const [
    pendingCreatedCategorySlug,
    setPendingCreatedCategorySlug,
  ] = useState<string | null>(null);

  const [selection, setSelection] = useState<Selection | null>(
    categories[0] ? { type: "category", id: categories[0].id } : null,
  );

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(categories.map((category) => `category:${category.id}`)),
  );

  const [addingTo, setAddingTo] = useState<{
    categoryId: string;
    parentId: string | null;
    parentName: string;
  } | null>(null);

  const [addingRootCategory, setAddingRootCategory] =
    useState(false);

  /*
   * New root categories start after every existing root category.
   * The administrator can still edit this Order before saving.
   */
  const nextRootCategoryOrder =
    categories.reduce(
      (highestOrder, category) =>
        Math.max(highestOrder, category.sort_order),
      0,
    ) + 1;

  /*
   * New Subcategories receive their Order from siblings only.
   * Every parent owns an independent 1, 2, 3... sequence.
   */
  const nextSubcategoryOrder = addingTo
    ? subcategories.reduce(
        (highestOrder, node) =>
          node.category_id === addingTo.categoryId &&
          node.parent_subcategory_id === addingTo.parentId
            ? Math.max(highestOrder, node.sort_order)
            : highestOrder,
        0,
      ) + 1
    : 1;

  useEffect(() => {
    function handleAddCategory() {
      setAddingRootCategory(true);
      setAddingTo(null);
      setSelection(null);
    }

    window.addEventListener(
      "st-admin:add-category",
      handleAddCategory,
    );

    return () => {
      window.removeEventListener(
        "st-admin:add-category",
        handleAddCategory,
      );
    };
  }, []);

  const [statusDrafts, setStatusDrafts] = useState<Record<string, boolean>>({});

  /*
   * After an inline Category creation the server data refreshes
   * without remounting this client component.
   *
   * As soon as the new Category appears in props, make it the
   * current working Category and leave its branch open.
   */
  useEffect(() => {
    if (!pendingCreatedCategorySlug) {
      return;
    }

    const createdCategory =
      categories.find(
        (category) =>
          category.slug ===
          pendingCreatedCategorySlug,
      ) ?? null;

    if (!createdCategory) {
      return;
    }

    setSelection({
      type: "category",
      id: createdCategory.id,
    });

    setExpanded((current) => {
      const next =
        new Set(current);

      next.add(
        `category:${createdCategory.id}`,
      );

      return next;
    });

    setAddingRootCategory(false);

    setPendingCreatedCategorySlug(
      null,
    );

    setIsEditDirty(false);
  }, [
    categories,
    pendingCreatedCategorySlug,
  ]);


  /*
   * Selecting another persisted Category/Subcategory always
   * begins from a clean Save state.
   */
  useEffect(() => {
    setIsEditDirty(false);
  }, [
    selection?.type,
    selection?.id,
    addingRootCategory,
    addingTo?.categoryId,
    addingTo?.parentId,
  ]);


  function statusValue(
    type: "category" | "subcategory",
    id: string,
    savedValue: boolean,
  ) {
    return statusDrafts[`${type}:${id}`] ?? savedValue;
  }

  function updateStatusDraft(
    type: "category" | "subcategory",
    id: string,
    value: boolean,
  ) {
    setStatusDrafts((current) => ({
      ...current,
      [`${type}:${id}`]: value,
    }));
  }

  const selectedCategory =
    selection?.type === "category"
      ? (categories.find((category) => category.id === selection.id) ?? null)
      : null;

  const selectedSubcategory =
    selection?.type === "subcategory"
      ? (subcategories.find((node) => node.id === selection.id) ?? null)
      : null;

  const selectedRoot = selectedSubcategory
    ? (categories.find(
        (category) => category.id === selectedSubcategory.category_id,
      ) ?? null)
    : selectedCategory;



  const selectedCategoryStatus = selectedCategory
    ? statusValue("category", selectedCategory.id, selectedCategory.is_active)
    : false;

  const selectedSubcategoryStatus = selectedSubcategory
    ? statusValue(
        "subcategory",
        selectedSubcategory.id,
        selectedSubcategory.is_active,
      )
    : false;

  function inlineCategoryFormData(
    form: HTMLFormElement,
  ) {
    const formData =
      new FormData(form);

    formData.set(
      "_st_category_inline",
      "1",
    );

    return formData;
  }


  function editorFormData() {
    const formId =
      selectedCategory
        ? `st-category-editor-${selectedCategory.id}`
        : selectedSubcategory
          ? `st-subcategory-editor-${selectedSubcategory.id}`
          : null;

    if (!formId) {
      return null;
    }

    const form =
      document.getElementById(
        formId,
      );

    if (
      !(form instanceof HTMLFormElement)
    ) {
      return null;
    }

    return new FormData(form);
  }


  function selectedEditorHasChanges() {
    const formData =
      editorFormData();

    if (!formData) {
      return false;
    }

    const wallpaper =
      formData.get("wallpaper");

    const hasNewWallpaper =
      typeof File !== "undefined" &&
      wallpaper instanceof File &&
      wallpaper.size > 0;

    if (selectedCategory) {
      const name =
        String(
          formData.get(
            "category_name",
          ) ?? "",
        ).trim();

      const sortOrder =
        Number(
          formData.get(
            "sort_order",
          ) ?? 0,
        );

      const isActive =
        formData.get(
          "is_active",
        ) === "on";

      const showOnHomepage =
        formData.get(
          "show_on_homepage",
        ) === "on";

      const homepageTheme =
        String(
          formData.get(
            "homepage_theme",
          ) ?? "light",
        ) === "dark"
          ? "dark"
          : "light";

      return (
        name !==
          selectedCategory.name ||
        sortOrder !==
          Number(
            selectedCategory.sort_order,
          ) ||
        isActive !==
          selectedCategory.is_active ||
        showOnHomepage !==
          selectedCategory.show_on_homepage ||
        homepageTheme !==
          selectedCategory.homepage_theme ||
        hasNewWallpaper
      );
    }

    if (selectedSubcategory) {
      const name =
        String(
          formData.get(
            "subcategory_name",
          ) ?? "",
        ).trim();

      const sortOrder =
        Number(
          formData.get(
            "sort_order",
          ) ?? 0,
        );

      const isActive =
        formData.get(
          "is_active",
        ) === "on";

      const homepageTheme =
        String(
          formData.get(
            "homepage_theme",
          ) ?? "light",
        ) === "dark"
          ? "dark"
          : "light";

      return (
        name !==
          selectedSubcategory.name ||
        sortOrder !==
          Number(
            selectedSubcategory.sort_order,
          ) ||
        isActive !==
          selectedSubcategory.is_active ||
        homepageTheme !==
          selectedSubcategory.homepage_theme ||
        hasNewWallpaper
      );
    }

    return false;
  }


  function scheduleEditDirtyCheck() {
    if (
      addingRootCategory ||
      addingTo ||
      (!selectedCategory &&
        !selectedSubcategory)
    ) {
      return;
    }

    /*
     * Theme controls use React state, so wait until the current
     * interaction has committed before reading FormData.
     */
    window.requestAnimationFrame(
      () => {
        setIsEditDirty(
          selectedEditorHasChanges(),
        );
      },
    );
  }


  async function handleCreateCategorySubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const formData =
      inlineCategoryFormData(
        event.currentTarget,
      );

    const categoryName =
      String(
        formData.get(
          "category_name",
        ) ??
          formData.get("name") ??
          "",
      );

    const expectedSlug =
      categoryClientSlugify(
        categoryName,
      );

    setIsSaving(true);

    try {
      await createCategory(
        formData,
      );

      setPendingCreatedCategorySlug(
        expectedSlug || null,
      );

      /*
       * Server refresh only:
       * no route navigation and therefore no loss of tree state.
       */
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }


  async function handleCreateSubcategorySubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSaving ||
      !addingTo
    ) {
      return;
    }

    const context = {
      ...addingTo,
    };

    const formData =
      inlineCategoryFormData(
        event.currentTarget,
      );

    setIsSaving(true);

    try {
      await createSubcategory(
        formData,
      );

      /*
       * Keep the administrator in the exact parent context from
       * which Add subcategory was opened.
       */
      setSelection(
        context.parentId
          ? {
              type: "subcategory",
              id: context.parentId,
            }
          : {
              type: "category",
              id: context.categoryId,
            },
      );

      setExpanded((current) => {
        const next =
          new Set(current);

        next.add(
          `category:${context.categoryId}`,
        );

        if (context.parentId) {
          next.add(
            `subcategory:${context.parentId}`,
          );
        }

        return next;
      });

      setAddingTo(null);
      setIsEditDirty(false);

      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }


  async function handleUpdateCategorySubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !isEditDirty ||
      isSaving
    ) {
      return;
    }

    const formData =
      inlineCategoryFormData(
        event.currentTarget,
      );

    setIsSaving(true);

    try {
      await updateCategory(
        formData,
      );

      /*
       * Selection + expanded tree state are deliberately untouched.
       */
      setIsEditDirty(false);

      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }


  async function handleUpdateSubcategorySubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !isEditDirty ||
      isSaving
    ) {
      return;
    }

    const formData =
      inlineCategoryFormData(
        event.currentTarget,
      );

    setIsSaving(true);

    try {
      await updateSubcategory(
        formData,
      );

      /*
       * Keep this exact recursive Subcategory selected.
       */
      setIsEditDirty(false);

      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }


  const totalNodes = categories.length + subcategories.length;



  function subcategoryBranchIds(rootId: string) {
    const result = new Set<string>();
    const stack = [rootId];

    while (stack.length > 0) {
      const currentId = stack.pop();

      if (!currentId || result.has(currentId)) {
        continue;
      }

      result.add(currentId);

      for (const node of subcategories) {
        if (node.parent_subcategory_id === currentId) {
          stack.push(node.id);
        }
      }
    }

    return result;
  }

  function categoryBranchIds(categoryId: string) {
    return new Set(
      subcategories
        .filter((node) => node.category_id === categoryId)
        .map((node) => node.id),
    );
  }

  function expandCategoryNode(categoryId: string) {
    const branchIds = categoryBranchIds(categoryId);

    setExpanded((current) => {
      const next = new Set(current);

      next.add(`category:${categoryId}`);

      for (const nodeId of branchIds) {
        next.add(`subcategory:${nodeId}`);
      }

      return next;
    });
  }

  function toggleCategoryNode(categoryId: string) {
    const categoryKey = `category:${categoryId}`;
    const branchIds = categoryBranchIds(categoryId);

    setExpanded((current) => {
      const shouldCollapse = current.has(categoryKey);

      if (shouldCollapse) {
        return new Set<string>();
      }

      const next = new Set<string>();

      next.add(categoryKey);

      for (const nodeId of branchIds) {
        next.add(`subcategory:${nodeId}`);
      }

      return next;
    });
  }

  function expandSubcategoryNode(subcategoryId: string) {
    const selectedNode = subcategories.find(
      (node) => node.id === subcategoryId,
    );

    if (!selectedNode) {
      return;
    }

    const descendantIds = subcategoryBranchIds(subcategoryId);

    setExpanded((current) => {
      const next = new Set(current);

      next.add(`category:${selectedNode.category_id}`);

      let currentNode: CategoryTreeNode | undefined = selectedNode;
      const visited = new Set<string>();

      while (currentNode && !visited.has(currentNode.id)) {
        visited.add(currentNode.id);

        next.add(`subcategory:${currentNode.id}`);

        if (!currentNode.parent_subcategory_id) {
          break;
        }

        currentNode = subcategories.find(
          (node) =>
            node.id === currentNode?.parent_subcategory_id,
        );
      }

      for (const nodeId of descendantIds) {
        next.add(`subcategory:${nodeId}`);
      }

      return next;
    });
  }

  function toggleSubcategoryNode(subcategoryId: string) {
    const key = `subcategory:${subcategoryId}`;
    const branchIds = subcategoryBranchIds(subcategoryId);

    setExpanded((current) => {
      const next = new Set(current);
      const shouldOpen = !next.has(key);

      if (shouldOpen) {
        for (const nodeId of branchIds) {
          next.add(`subcategory:${nodeId}`);
        }
      } else {
        for (const nodeId of branchIds) {
          next.delete(`subcategory:${nodeId}`);
        }
      }

      return next;
    });
  }

  function selectCategoryNode(categoryId: string) {
    setAddingRootCategory(false);
    setAddingTo(null);

    const isAlreadySelected =
      selection?.type === "category" &&
      selection.id === categoryId;

    /*
     * Clicking the currently selected Category again closes its
     * hierarchy and clears the inspector selection completely.
     *
     * The right workspace then naturally returns to the existing
     * "Select a category" empty state.
     */
    if (isAlreadySelected) {
      setExpanded(new Set<string>());
      setSelection(null);
      return;
    }

    toggleCategoryNode(categoryId);

    setSelection({
      type: "category",
      id: categoryId,
    });
  }

  function selectSubcategoryNode(subcategoryId: string) {
    setAddingRootCategory(false);
    setAddingTo(null);

    expandSubcategoryNode(subcategoryId);

    setSelection({
      type: "subcategory",
      id: subcategoryId,
    });
  }

  function renderNode(node: CategoryTreeNode, depth: number) {
    const children = descendants(subcategories, node.id, node.category_id);

    const key = `subcategory:${node.id}`;
    const isExpanded = expanded.has(key);
    const isSelected =
      selection?.type === "subcategory" && selection.id === node.id;

    const isActive = statusValue(
      "subcategory",
      node.id,
      node.is_active,
    );

    return (
      <div key={node.id} className="st-category-tree__branch">
        <div
          className={`st-category-tree__node ${
            isSelected ? "is-selected" : ""
          } ${isActive ? "is-active" : "is-inactive"}`}
          style={{ "--tree-depth": depth } as React.CSSProperties}
        >
          <button
            type="button"
            className="st-category-tree__expand"
            onClick={() => children.length && toggleSubcategoryNode(node.id)}
            aria-label={
              children.length
                ? `${isExpanded ? "Collapse" : "Expand"} ${node.name}`
                : undefined
            }
          >
            {children.length ? (
              isExpanded ? (
                <ChevronDown aria-hidden="true" />
              ) : (
                <ChevronRight aria-hidden="true" />
              )
            ) : (
              <span />
            )}
          </button>

          <button
            type="button"
            className="st-category-tree__select"
            onClick={() => selectSubcategoryNode(node.id)}
          >
            <span className="st-category-tree__folder">
              <Folder aria-hidden="true" />
            </span>

            <span className="st-category-tree__label">
              <strong>{node.name}</strong>
              <small>
                {node.productCount}{" "}
                {node.productCount === 1 ? "product" : "products"}
                {children.length
                  ? ` · ${children.length} ${
                      children.length === 1 ? "child" : "children"
                    }`
                  : ""}
              </small>
            </span>

            <span
              className={`st-category-tree__state ${
                isActive ? "is-active" : "is-inactive"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </button>


        </div>

        {children.length > 0 ? (
          <div
            className={`st-category-tree__children ${
              isExpanded ? "is-open" : "is-closed"
            }`}
            aria-hidden={!isExpanded}
          >
            <div className="st-category-tree__children-inner">
              {children.map((child) =>
                renderNode(child, depth + 1),
              )}
            </div>
          </div>
        ) : null}

        {isSelected ? (
          <div
            className="st-category-tree__add-slot-v2"
            style={{ "--tree-depth": depth } as React.CSSProperties}
          >
            <button
              type="button"
              className="st-category-tree__add-subcategory-v2"
              onClick={() => {
                expandSubcategoryNode(node.id);

                setAddingTo({
                  categoryId: node.category_id,
                  parentId: node.id,
                  parentName: node.name,
                });
              }}
            >
              <FolderPlus aria-hidden="true" />
              <span>Add subcategory</span>
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="st-category-manager">
      <aside className="st-category-manager__tree">
        <div className="st-category-manager__tree-head">
          <div className="st-category-manager__tree-title">
            <strong>Category structure</strong>
            <span>Select a category or expand its hierarchy.</span>
          </div>


        </div>

        <div className="st-category-tree">
            {categories.map((category) => {
              const children = descendants(subcategories, null, category.id);

              const key = `category:${category.id}`;
              const isExpanded = expanded.has(key);
              const isSelected =
                selection?.type === "category" && selection.id === category.id;

              const isActive = statusValue(
                "category",
                category.id,
                category.is_active,
              );

              return (
                <div
                  key={category.id}
                  className="st-category-tree__root-group"
                  data-admin-category-card="true"
                  data-admin-category-search={`${category.name} ${category.slug} ${
                    category.description ?? ""
                  } ${children.map((child) => child.name).join(" ")}`}
                >
                  <div
                    className={`st-category-tree__root ${
                      isSelected ? "is-selected" : ""
                    } ${isActive ? "is-active" : "is-inactive"}`}
                  >
                    <button
                      type="button"
                      className="st-category-tree__expand"
                      onClick={() => toggleCategoryNode(category.id)}
                      aria-label={`${
                        isExpanded ? "Collapse" : "Expand"
                      } ${category.name}`}
                    >
                      {isExpanded ? (
                        <ChevronDown aria-hidden="true" />
                      ) : (
                        <ChevronRight aria-hidden="true" />
                      )}
                    </button>

                    <button
                      type="button"
                      className="st-category-tree__select"
                      onClick={() => selectCategoryNode(category.id)}
                    >
                      <span className="st-category-tree__folder is-root">
                        <Folder aria-hidden="true" />
                      </span>

                      <span className="st-category-tree__label">
                        <strong>{category.name}</strong>
                        <small>
                          {category.productCount}{" "}
                          {category.productCount === 1
                            ? "product"
                            : "products"}
                          {" · "}
                          {children.length}{" "}
                          {children.length === 1 ? "branch" : "branches"}
                        </small>
                      </span>

                      <span
                        className={`st-category-tree__state ${
                          isActive ? "is-active" : "is-inactive"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </div>

                  {children.length > 0 ? (
                    <div
                      className={`st-category-tree__children ${
                        isExpanded ? "is-open" : "is-closed"
                      }`}
                      aria-hidden={!isExpanded}
                    >
                      <div className="st-category-tree__children-inner">
                        {children.map((node) => renderNode(node, 1))}
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={`st-category-tree__add-slot-v2 is-root ${
                      isSelected ? "is-open" : "is-closed"
                    }`}
                    aria-hidden={!isSelected}
                  >
                    <button
                        type="button"
                        tabIndex={isSelected ? 0 : -1}
                        className="st-category-tree__add-subcategory-v2"
                        onClick={() => {
                          expandCategoryNode(category.id);

                          setAddingTo({
                            categoryId: category.id,
                            parentId: null,
                            parentName: category.name,
                          });
                        }}
                      >
                        <FolderPlus aria-hidden="true" />
                        <span>Add subcategory</span>
                      </button>
                    </div>
                </div>
              );
            })}
        </div>
      </aside>

      <section
        className="st-category-manager__workspace"
        onInputCapture={() => {
          scheduleEditDirtyCheck();
        }}
        onChangeCapture={() => {
          scheduleEditDirtyCheck();
        }}
        onClickCapture={(event) => {
          if (
            addingRootCategory ||
            addingTo
          ) {
            return;
          }

          const target =
            event.target instanceof Element
              ? event.target
              : null;

          const themeButton =
            target?.closest(
              "button[aria-pressed]",
            );

          if (
            themeButton?.getAttribute(
              "aria-pressed",
            ) === "false"
          ) {
            scheduleEditDirtyCheck();
          }
        }}
      >
        {addingRootCategory ? (
          <>
            <div className="st-category-workspace__hero">
              <div>
                <span>New category</span>
                <h2>Create category</h2>
              </div>

              <div className="st-category-workspace__summary">
                <span className="st-category-workspace__status is-inactive">
                  Inactive
                </span>
              </div>
            </div>

            <div className="st-category-workspace__body">
              <div className="st-category-workspace__section">
                <div className="st-category-workspace__section-head">
                  <div>
                    <strong>General</strong>
                    <span>
                      Name, storefront status and directory order.
                    </span>
                  </div>
                </div>

                <form
                  key="category-form:new"
                  id="st-category-create-editor"
                  onSubmit={handleCreateCategorySubmit}
                  className="st-category-workspace__form"
                >
                  <label className="st-category-name-field-v2">
                    <span>Name</span>

                    <span className="st-category-name-control-v2">
                      <input
                        name="category_name"
                        required
                        autoFocus
                        autoComplete="off"
                        placeholder="Enter category name"
                      />
                    </span>
                  </label>

                  <label className="st-category-name-field-v2 is-order">
                    <span>Order</span>

                    <span className="st-category-name-control-v2 st-category-order-control-v2">
                      <input
                        name="sort_order"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={nextRootCategoryOrder}
                      />
                    </span>
                  </label>

                  <label className="st-category-workspace__status-control is-wide">
                    <span className="st-category-workspace__status-copy">
                      <strong>Category status</strong>
                      <small>
                        Active categories are available across the storefront.
                      </small>
                    </span>

                    <span className="st-category-workspace__switch">
                      <input
                        type="checkbox"
                        name="is_active"
                        aria-label="Category active"
                      />

                      <span
                        className="st-category-workspace__switch-track"
                        aria-hidden="true"
                      >
                        <span />
                      </span>
                    </span>
                  </label>
                </form>
              </div>

              <CategoryHomepageControls
                key="category-homepage:new"
                categoryId=""
                formId="st-category-create-editor"
                categoryName=""
                imageUrl={null}
                showOnHomepage={false}
                homepageTheme="light"
                actions={
                  <>
                    <button
                      type="button"
                      className="st-category-create-workspace__cancel"
                      onClick={() => setAddingRootCategory(false)}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      form="st-category-create-editor"
                      className="st-category-workspace__final-save"
                        disabled={isSaving}
                    >
                      <Save aria-hidden="true" />
                      Save changes
                    </button>
                  </>
                }
              />
            </div>
          </>
        ) : addingTo ? (
          <>
            <div className="st-category-workspace__hero st-category-create-workspace__hero">
              <div>
                <span>New subcategory</span>
                <h2>Create subcategory</h2>
                <p>Inside {addingTo.parentName}</p>
              </div>

              <div className="st-category-create-workspace__parent">
                <Folder aria-hidden="true" />

                <span>
                  <small>Parent</small>
                  <strong>{addingTo.parentName}</strong>
                </span>
              </div>
            </div>

            <div className="st-category-workspace__body">
              <div className="st-category-workspace__section">
                <div className="st-category-workspace__section-head">
                  <div>
                    <strong>General</strong>
                    <span>
                      Name, storefront status and directory order.
                    </span>
                  </div>
                </div>

                <form
                  key={`${addingTo.categoryId}:${addingTo.parentId ?? "root"}`}
                  onSubmit={handleCreateSubcategorySubmit}
                  className="st-category-workspace__form st-category-create-workspace__form"
                >
                  <input
                    type="hidden"
                    name="category_id"
                    value={addingTo.categoryId}
                  />

                  <input
                    type="hidden"
                    name="parent_subcategory_id"
                    value={addingTo.parentId ?? ""}
                  />

                  <input
                    type="hidden"
                    name="suggested_sort_order"
                    value={nextSubcategoryOrder}
                  />

                  <label className="st-category-name-field-v2">
                    <span>Name</span>

                    <span className="st-category-name-control-v2">
                      <input
                        name="subcategory_name"
                        required
                        autoFocus
                        autoComplete="off"
                        placeholder="Enter subcategory name"
                      />
                    </span>
                  </label>

                  <label className="st-category-name-field-v2 is-order">
                    <span>Order</span>

                    <span className="st-category-name-control-v2 st-category-order-control-v2">
<input
                      name="sort_order"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={nextSubcategoryOrder}
                    />
</span>
</label>

                  <label className="st-category-workspace__status-control is-wide">
                    <span className="st-category-workspace__status-copy">
                      <strong>Subcategory status</strong>
                      <small>
                        Active subcategories are available in category navigation.
                      </small>
                    </span>

                    <span className="st-category-workspace__switch">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked
                        aria-label="Subcategory active"
                      />

                      <span
                        className="st-category-workspace__switch-track"
                        aria-hidden="true"
                      >
                        <span />
                      </span>
                    </span>
                  </label>

                  <div className="st-category-workspace__save-row is-wide st-category-create-workspace__actions">
                    <button
                      type="button"
                      className="st-category-create-workspace__cancel"
                      onClick={() => setAddingTo(null)}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="st-category-create-workspace__submit"
                        disabled={isSaving}
                    >
                      <FolderPlus aria-hidden="true" />
                      Create subcategory
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : selectedCategory ? (
          <>
            <div className="st-category-workspace__hero">
              <div>
                <span>Category</span>
                <h2>{selectedCategory.name}</h2>
              </div>

              <div className="st-category-workspace__summary">
                <div className="st-category-workspace__product-count">
                  <Package aria-hidden="true" />
                  <span>
                    <strong>{selectedCategory.productCount}</strong>
                    {selectedCategory.productCount === 1
                      ? " product"
                      : " products"}
                  </span>
                </div>

                <span
                  className={`st-category-workspace__status ${
                    selectedCategoryStatus ? "is-active" : "is-inactive"
                  }`}
                >
                  {selectedCategoryStatus ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="st-category-workspace__body">
              <div className="st-category-workspace__section">
                <div className="st-category-workspace__section-head">
                  <div>
                    <strong>General</strong>
                    <span>Name, storefront status and directory order.</span>
                  </div>
                </div>

                <form
                  key={`category-form:${selectedCategory.id}`}
                  id={`st-category-editor-${selectedCategory.id}`}
                  onSubmit={handleUpdateCategorySubmit}
                  className="st-category-workspace__form"
                >
                  <input
                    type="hidden"
                    name="category_id"
                    value={selectedCategory.id}
                  />

                  <label className="st-category-name-field-v2">
                    <span>Name</span>

                    <span className="st-category-name-control-v2">
                      <input
                        name="category_name"
                        required
                        defaultValue={selectedCategory.name}
                        autoComplete="off"
                      />
                    </span>
                  </label>

                  <label className="st-category-name-field-v2 is-order">
                    <span>Order</span>
                    <span className="st-category-name-control-v2 st-category-order-control-v2">
<input
                      name="sort_order"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={selectedCategory.sort_order}
                    />
</span>
</label>

                  <label className="st-category-workspace__status-control is-wide">
                    <span className="st-category-workspace__status-copy">
                      <strong>Category status</strong>
                      <small>
                        Active categories are available across the storefront.
                      </small>
                    </span>

                    <span className="st-category-workspace__switch">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={selectedCategoryStatus}
                        onChange={(event) =>
                          updateStatusDraft(
                            "category",
                            selectedCategory.id,
                            event.target.checked,
                          )
                        }
                        aria-label="Category active"
                      />
                      <span
                        className="st-category-workspace__switch-track"
                        aria-hidden="true"
                      >
                        <span />
                      </span>
                    </span>
                  </label>

                </form>


              </div>

              <CategoryHomepageControls
                  key={`category-homepage:${selectedCategory.id}`}
                  categoryId={selectedCategory.id}
                  formId={`st-category-editor-${selectedCategory.id}`}
                  categoryName={selectedCategory.name}
                  imageUrl={selectedCategory.image_url}
                  showOnHomepage={selectedCategory.show_on_homepage}
                  homepageTheme={selectedCategory.homepage_theme}
                  actions={
                    <>
                      <form action={deleteCategory}>
                        <input
                          type="hidden"
                          name="category_id"
                          value={selectedCategory.id}
                        />

                        <CategoryDestructiveButton
                          label="Delete category"
                          pendingLabel="Deleting..."
                          confirmation={`Delete the category "${selectedCategory.name}"? This cannot be undone.`}
                        />
                      </form>

                      <button
                        type="submit"
                        form={`st-category-editor-${selectedCategory.id}`}
                        className="st-category-workspace__final-save"
                        disabled={!isEditDirty || isSaving}
                      >
                        <Save aria-hidden="true" />
                        Save changes
                      </button>
                    </>
                  }
                />
            </div>
          </>
        ) : selectedSubcategory && selectedRoot ? (
          <>
            <div className="st-category-workspace__hero">
              <div>
                <span>Subcategory</span>
                <h2>{selectedSubcategory.name}</h2>
              </div>

              <div className="st-category-workspace__summary">
                <div className="st-category-workspace__product-count">
                  <Package aria-hidden="true" />
                  <span>
                    <strong>{selectedSubcategory.productCount}</strong>
                    {selectedSubcategory.productCount === 1
                      ? " product"
                      : " products"}
                  </span>
                </div>

                <span
                  className={`st-category-workspace__status ${
                    selectedSubcategoryStatus ? "is-active" : "is-inactive"
                  }`}
                >
                  {selectedSubcategoryStatus ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="st-category-workspace__body">
              <div className="st-category-workspace__section">
                <div className="st-category-workspace__section-head">
                  <div>
                    <strong>General</strong>
                    <span>Part of {selectedRoot.name}.</span>
                  </div>

                </div>

                <form
                  key={`subcategory-form:${selectedSubcategory.id}`}
                  id={`st-subcategory-editor-${selectedSubcategory.id}`}
                  onSubmit={handleUpdateSubcategorySubmit}
                  className="st-category-workspace__form"
                >
                  <input
                    type="hidden"
                    name="subcategory_id"
                    value={selectedSubcategory.id}
                  />

                  <label className="st-category-name-field-v2">
                    <span>Name</span>

                    <span className="st-category-name-control-v2">
                      <input
                        name="subcategory_name"
                        required
                        defaultValue={selectedSubcategory.name}
                        autoComplete="off"
                      />
                    </span>
                  </label>

                  <label className="st-category-name-field-v2 is-order">
                    <span>Order</span>
                    <span className="st-category-name-control-v2 st-category-order-control-v2">
<input
                      name="sort_order"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={selectedSubcategory.sort_order}
                    />
</span>
</label>

                  <label className="st-category-workspace__status-control is-wide">
                    <span className="st-category-workspace__status-copy">
                      <strong>Subcategory status</strong>
                      <small>
                        Active subcategories remain available in category
                        navigation.
                      </small>
                    </span>

                    <span className="st-category-workspace__switch">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={selectedSubcategoryStatus}
                        onChange={(event) =>
                          updateStatusDraft(
                            "subcategory",
                            selectedSubcategory.id,
                            event.target.checked,
                          )
                        }
                        aria-label="Subcategory active"
                      />
                      <span
                        className="st-category-workspace__switch-track"
                        aria-hidden="true"
                      >
                        <span />
                      </span>
                    </span>
                  </label>

                </form>


              </div>

              <SubcategoryStorefrontControls
                  key={`subcategory-homepage:${selectedSubcategory.id}`}
                  subcategoryId={selectedSubcategory.id}
                  formId={`st-subcategory-editor-${selectedSubcategory.id}`}
                  subcategoryName={selectedSubcategory.name}
                  imageUrl={selectedSubcategory.image_url}
                  homepageTheme={selectedSubcategory.homepage_theme}
                  actions={
                    <>
                      <form action={deleteSubcategory}>
                        <input
                          type="hidden"
                          name="subcategory_id"
                          value={selectedSubcategory.id}
                        />

                        <ConfirmSubmitButton
                          label="Delete subcategory"
                          pendingLabel="Deleting..."
                          confirmation={`Delete "${selectedSubcategory.name}"? It must contain no products or child categories.`}
                          className="is-danger st-category-destructive-action st-admin-image-destructive-v32"
                        />
                      </form>

                      <button
                        type="submit"
                        form={`st-subcategory-editor-${selectedSubcategory.id}`}
                        className="st-category-workspace__final-save"
                        disabled={!isEditDirty || isSaving}
                      >
                        <Save aria-hidden="true" />
                        Save changes
                      </button>
                    </>
                  }
                />
            </div>
          </>
        ) : (
          <div className="st-category-workspace__blank">
            <Folder aria-hidden="true" />
            <strong>Select a category</strong>
            <span>Choose a node from the tree to manage it.</span>
          </div>
        )}
      </section>

    </div>
  );
}
