"use client";

import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  Eye,
  EyeOff,
  Film,
  Pencil,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  type FormEvent,
  useState,
  useTransition,
} from "react";

import {
  createEntertainmentTitle,
  deleteEntertainmentTitle,
  moveEntertainmentTitle,
  toggleEntertainmentTitle,
  updateEntertainmentTitle,
  type MoviesSeriesActionResult,
} from "@/app/admin/categories/movies-series-actions";

export type EntertainmentAdminItem = {
  id: string;
  slug: string;
  title: string;
  kind: "Movie" | "Series";
  year: string;
  genre: string;
  tagline: string;
  poster_url: string;
  poster_storage_path: string | null;
  backdrop_url: string;
  backdrop_storage_path: string | null;
  trailer_url: string;
  trailer_storage_path: string | null;
  sort_order: number;
  is_active: boolean;
};

type Props = {
  items: EntertainmentAdminItem[];
  selectedId?: string | null;
};

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

export default function MoviesSeriesManager({
  items,
  selectedId = null,
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [adding, setAdding] =
    useState(false);

  // MOVIES_SERIES_INSERT_AFTER_STATE
  const [
    insertAfterId,
    setInsertAfterId,
  ] = useState<string | null>(null);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  // MOVIES_SERIES_EDITOR_MOTION_STATE_V14
  const [
    editorOpenId,
    setEditorOpenId,
  ] = useState<string | null>(null);

  const [notice, setNotice] =
    useState<Notice>(null);

  // MOVIES_SERIES_MEDIA_PREVIEW_STATE
  const [previewMedia, setPreviewMedia] =
    useState<{
      src: string;
      label: string;
      title: string;
    } | null>(null);

  // MOVIES_SERIES_SELECTED_TITLE_SYNC
  useEffect(() => {
    if (!selectedId) {
      return;
    }

    openEditorSmoothly(
      selectedId,
    );
  }, [selectedId]);

  // MOVIES_SERIES_EXTERNAL_TREE_ACTION
  useEffect(() => {
    function handleTreeAction(
      rawEvent: Event,
    ) {
      const event =
        rawEvent as CustomEvent<{
          action?: "add" | "edit";
          id?: string;
          afterId?: string;
        }>;

      const detail =
        event.detail;

      if (!detail?.action) {
        return;
      }

      setNotice(null);

      if (
        detail.action === "add"
      ) {
        setEditingId(null);

        setInsertAfterId(
          detail.afterId ?? null,
        );

        setAdding(true);

        window.requestAnimationFrame(
          () => {
            window.requestAnimationFrame(
              () => {
                document
                  .querySelector<HTMLElement>(
                    ".st-category-workspace__body.is-movies-series .st-ent-admin__editor",
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
              },
            );
          },
        );

        return;
      }

      if (
        detail.action === "edit" &&
        detail.id
      ) {
        setAdding(false);
        setInsertAfterId(null);

        openEditorSmoothly(
          detail.id,
        );

        window.requestAnimationFrame(
          () => {
            window.requestAnimationFrame(
              () => {
                document
                  .querySelector<HTMLElement>(
                    `[data-entertainment-id="${detail.id}"]`,
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
              },
            );
          },
        );
      }
    }

    window.addEventListener(
      "st:movies-series-title-action",
      handleTreeAction,
    );

    return () => {
      window.removeEventListener(
        "st:movies-series-title-action",
        handleTreeAction,
      );
    };
  }, []);

  // MOVIES_SERIES_NOTICE_AUTODISMISS
  useEffect(() => {
    if (!notice) {
      return;
    }

    const frame =
      window.requestAnimationFrame(() => {
        const element =
          document.querySelector<HTMLElement>(
            ".st-category-workspace__body.is-movies-series .st-ent-admin__notice",
          );

        if (!element) {
          return;
        }

        element.classList.remove(
          "is-animated",
        );

        void element.offsetWidth;

        element.classList.add(
          "is-animated",
        );
      });

    const dismissTimer =
      window.setTimeout(() => {
        setNotice(null);
      }, 5450);

    return () => {
      window.cancelAnimationFrame(
        frame,
      );

      window.clearTimeout(
        dismissTimer,
      );
    };
  }, [notice]);


  const activeCount =
    items.filter(
      (item) => item.is_active,
    ).length;

  // MOVIES_SERIES_MEDIA_PREVIEW_EFFECT
  useEffect(() => {
    if (!previewMedia) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setPreviewMedia(null);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [previewMedia]);

  // MOVIES_SERIES_LIGHT_EDITOR_MOTION_V14
  function openEditorSmoothly(
    id: string,
  ) {
    setAdding(false);

    /*
     * Mount closed first.
     * On the following paint, CSS opens it.
     *
     * No geometry measurement.
     * No forced browser reflow.
     */
    setEditorOpenId(null);
    setEditingId(id);

    window.requestAnimationFrame(
      () => {
        setEditorOpenId(id);
      },
    );
  }

  function closeEditorSmoothly(
    id: string,
  ) {
    /*
     * Keep the editor mounted while CSS closes it.
     * onTransitionEnd removes it after the motion.
     */
    setEditorOpenId(
      (current) =>
        current === id
          ? null
          : current,
    );
  }

  function finish(
    result: MoviesSeriesActionResult,
    closeEditor = false,
  ) {
    setNotice({
      type: result.ok
        ? "success"
        : "error",
      message: result.message,
    });

    if (result.ok) {
      if (closeEditor) {
        setAdding(false);

        if (editingId) {
          closeEditorSmoothly(
            editingId,
          );
        } else {
          setEditingId(null);
        }
      }

      router.refresh();
    }
  }

  function submitCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const formData =
      new FormData(event.currentTarget);

    startTransition(async () => {
      const result =
        await createEntertainmentTitle(
          formData,
        );

      finish(result, true);
    });
  }

  function submitUpdate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const formData =
      new FormData(event.currentTarget);

    startTransition(async () => {
      const result =
        await updateEntertainmentTitle(
          formData,
        );

      finish(result, true);
    });
  }

  function runDelete(
    item: EntertainmentAdminItem,
  ) {
    if (
      !window.confirm(
        `Remove "${item.title}" from Movies & Series?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result =
        await deleteEntertainmentTitle(
          item.id,
        );

      finish(result, true);
    });
  }

  function runToggle(
    item: EntertainmentAdminItem,
  ) {
    startTransition(async () => {
      const result =
        await toggleEntertainmentTitle(
          item.id,
          !item.is_active,
        );

      finish(result);
    });
  }

  function runMove(
    item: EntertainmentAdminItem,
    direction: "up" | "down",
  ) {
    startTransition(async () => {
      const result =
        await moveEntertainmentTitle(
          item.id,
          direction,
        );

      finish(result);
    });
  }

  return (
    <section className="st-ent-admin">
      <header className="st-ent-admin__head">
        <div className="st-ent-admin__head-copy">
          <span className="st-ent-admin__eyebrow">
            <Film aria-hidden="true" />
            Cinematic library
          </span>

          <h3>Movies &amp; Series</h3>

          <p>
            Manage the titles, artwork and
            trailers rendered by the existing
            storefront Movies &amp; Series
            experience.
          </p>
        </div>


      </header>

      {notice ? (
        <div
          className={`st-ent-admin__notice ${
            notice.type === "error"
              ? "is-error"
              : "is-success"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {adding ? (
        <form
          className="st-ent-admin__editor"
          onSubmit={submitCreate}
        >
          {/* MOVIES_SERIES_INSERT_AFTER_INPUT */}
          <input
            type="hidden"
            name="insert_after_id"
            value={insertAfterId ?? ""}
          />
          <div className="st-ent-admin__editor-head">
            <div>
              <span>New title</span>
              <strong>
                Add movie or series
              </strong>
            </div>

            <button
              type="button"
              aria-label="Close add title"
              onClick={() =>
                setAdding(false)
              }
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <EntertainmentFields
            mode="create"
          />

          <div className="st-ent-admin__editor-actions">
            <button
              type="button"
              className="is-secondary"
              disabled={isPending}
              onClick={() =>
                setAdding(false)
              }
            >
              Cancel
              <X aria-hidden="true" />
            </button>

            <button
              type="submit"
              className="is-primary"
              disabled={isPending}
            >
              {isPending
                ? "Saving..."
                : "Add title"}

              <Save aria-hidden="true" />
            </button>
          </div>
        </form>
      ) : null}

      {!items.length ? (
        <div className="st-ent-admin__empty">
          <Clapperboard
            aria-hidden="true"
          />

          <strong>
            No Movies &amp; Series titles
          </strong>

          <span>
            Add the first title to the
            cinematic storefront carousel.
          </span>
        </div>
      ) : (
        <div className="st-ent-admin__list">
          {items.map((item, index) => {
            if (
              selectedId &&
              item.id !== selectedId
            ) {
              return null;
            }

            const editing =
              editingId === item.id;

            const editorOpen =
              editorOpenId === item.id;

            return (
              <article
                key={item.id}
                data-entertainment-id={item.id}
                className={`st-ent-admin__card ${
                  !item.is_active
                    ? "is-hidden"
                    : ""
                }`}
              >
                <div className="st-ent-admin__card-main">
                  <button
                    type="button"
                    className="st-ent-admin__poster st-ent-admin__poster-button"
                    aria-label={`View ${item.title} poster`}
                    onClick={() =>
                      setPreviewMedia({
                        src: item.poster_url,
                        label: "Poster preview",
                        title: item.title,
                      })
                    }
                  >
                    <img
                      src={item.poster_url}
                      alt={`${item.title} poster`}
                    />
                  </button>

                  <div className="st-ent-admin__card-copy">
                    <div className="st-ent-admin__meta">
                      <span>
                        {item.kind}
                      </span>

                      <span>
                        {item.year}
                      </span>

                      <span>
                        {item.genre}
                      </span>
                    </div>

                    <h4>
                      {item.title}
                    </h4>

                    <p>
                      {item.tagline}
                    </p>

                    <div className="st-ent-admin__status-line">
                      <span
                        className={
                          item.is_active
                            ? "is-active"
                            : "is-inactive"
                        }
                      >
                        {item.is_active
                          ? "Visible on storefront"
                          : "Hidden from storefront"}
                      </span>

                      <span>
                        Trailer attached
                      </span>
                    </div>
                  </div>

                  <div className="st-ent-admin__card-controls">
                    <div className="st-ent-admin__order">
                      <button
                        type="button"
                        aria-label={`Move ${item.title} up`}
                        disabled={
                          isPending ||
                          index === 0
                        }
                        onClick={() =>
                          runMove(
                            item,
                            "up",
                          )
                        }
                      >
                        <ArrowUp
                          aria-hidden="true"
                        />
                      </button>

                      <span>
                        {index + 1}
                      </span>

                      <button
                        type="button"
                        aria-label={`Move ${item.title} down`}
                        disabled={
                          isPending ||
                          index ===
                            items.length - 1
                        }
                        onClick={() =>
                          runMove(
                            item,
                            "down",
                          )
                        }
                      >
                        <ArrowDown
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="st-ent-admin__control"
                      disabled={isPending}
                      onClick={() =>
                        runToggle(item)
                      }
                    >
                      {item.is_active
                        ? "Hide"
                        : "Show"}

                      {item.is_active ? (
                        <EyeOff
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye
                          aria-hidden="true"
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      className="st-ent-admin__control"
                      disabled={isPending}
                      onClick={() => {
                        setAdding(false);

                        if (editorOpen) {
                          closeEditorSmoothly(
                            item.id,
                          );

                          return;
                        }

                        openEditorSmoothly(
                          item.id,
                        );
                      }}
                    >
                      {editorOpen
                        ? "Close"
                        : "Edit"}

                      <Pencil
                        aria-hidden="true"
                      />
                    </button>

                    <button
                      type="button"
                      className="st-ent-admin__control is-danger"
                      disabled={isPending}
                      onClick={() =>
                        runDelete(item)
                      }
                    >
                      Remove
                      <Trash2
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>

                {editing ? (
                  <form
                    className={`st-ent-admin__editor is-edit ${
                      editorOpen
                        ? "is-motion-open"
                        : "is-motion-closed"
                    }`}
                    onSubmit={
                      submitUpdate
                    }
                    onTransitionEnd={(event) => {
                      if (
                        event.target !==
                          event.currentTarget ||
                        event.propertyName !==
                          "max-height" ||
                        editorOpen
                      ) {
                        return;
                      }

                      setEditingId(
                        (current) =>
                          current === item.id
                            ? null
                            : current,
                      );
                    }}
                  >
                    <input
                      type="hidden"
                      name="title_id"
                      value={item.id}
                    />

                    <div className="st-ent-admin__media-preview">
                      <button
                        type="button"
                        className="st-ent-admin__current-poster-preview"
                        aria-label={`View ${item.title} poster`}
                        onClick={() =>
                          setPreviewMedia({
                            src: item.poster_url,
                            label: "Poster preview",
                            title: item.title,
                          })
                        }
                      >
                        <img
                          src={item.poster_url}
                          alt={`${item.title} poster`}
                        />

                        <span>
                          Poster
                        </span>
                      </button>

                      <button
                        type="button"
                        className="st-ent-admin__backdrop-preview st-ent-admin__backdrop-button"
                        aria-label={`View ${item.title} homepage background`}
                        onClick={() =>
                          setPreviewMedia({
                            src: item.backdrop_url,
                            label:
                              "Homepage background preview",
                            title: item.title,
                          })
                        }
                      >
                        <img
                          src={
                            item.backdrop_url
                          }
                          alt={`${item.title} homepage background`}
                        />

                        <span>
                          Homepage background
                        </span>
                      </button>

                      <div className="st-ent-admin__trailer-preview">
                        <video
                          src={
                            item.trailer_url
                          }
                          controls
                          preload="metadata"
                        />
                      </div>
                    </div>

                    <EntertainmentFields
                      mode="edit"
                      item={item}
                    />

                    <div className="st-ent-admin__editor-actions">
                      <button
                        type="button"
                        className="is-secondary"
                        disabled={isPending}
                        onClick={() =>
                          closeEditorSmoothly(
                            item.id,
                          )
                        }
                      >
                        Cancel
                        <X
                          aria-hidden="true"
                        />
                      </button>

                      <button
                        type="submit"
                        className="is-primary"
                        disabled={isPending}
                      >
                        {isPending
                          ? "Saving..."
                          : "Save title"}

                        <Save
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      {/* MOVIES_SERIES_IMAGE_LIGHTBOX */}
      {previewMedia ? (
        <div
          className="st-category-homepage__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewMedia.title} ${previewMedia.label}`}
        >
          <button
            type="button"
            className="st-category-homepage__lightbox-backdrop"
            onClick={() =>
              setPreviewMedia(null)
            }
            aria-label="Close image preview"
          />

          <div className="st-category-homepage__lightbox-panel">
            <div className="st-category-homepage__lightbox-head">
              <div>
                <span>
                  {previewMedia.label}
                </span>

                <strong>
                  {previewMedia.title}
                </strong>
              </div>

              <button
                type="button"
                className="st-category-homepage__lightbox-close"
                onClick={() =>
                  setPreviewMedia(null)
                }
                aria-label="Close image preview"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="st-category-homepage__lightbox-stage">
              <img
                src={previewMedia.src}
                alt={`${previewMedia.title} ${previewMedia.label}`}
              />
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}

function EntertainmentFields({
  mode,
  item,
}: {
  mode: "create" | "edit";
  item?: EntertainmentAdminItem;
}) {
  const editing =
    mode === "edit" && item;

  return (
    <>
      <div className="st-ent-admin__fields">
        <label>
          <span>Title</span>

          <input
            name="title"
            required
            autoComplete="off"
            defaultValue={
              item?.title ?? ""
            }
            placeholder="Avengers: Endgame"
          />
        </label>

        <label>
          <span>Type</span>

          <select
            name="kind"
            defaultValue={
              item?.kind ?? "Movie"
            }
          >
            <option value="Movie">
              Movie
            </option>

            <option value="Series">
              Series
            </option>
          </select>
        </label>

        <label>
          <span>Year</span>

          <input
            name="year"
            required
            inputMode="numeric"
            autoComplete="off"
            defaultValue={
              item?.year ?? ""
            }
            placeholder="2026"
          />
        </label>

        <label>
          <span>Genre</span>

          <input
            name="genre"
            required
            autoComplete="off"
            defaultValue={
              item?.genre ?? ""
            }
            placeholder="Action · Adventure"
          />
        </label>

        <label className="is-wide">
          <span>Short phrase</span>

          <input
            name="tagline"
            required
            autoComplete="off"
            defaultValue={
              item?.tagline ?? ""
            }
            placeholder="Whatever it takes."
          />
        </label>

        <label className="st-ent-admin__visibility-row">
          <span className="st-ent-admin__visibility-copy">
            <strong>
              Storefront visibility
            </strong>

            <small>
              Show this title in the Movies & Series experience.
            </small>
          </span>

          <span className="st-category-workspace__switch">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={
                item?.is_active ??
                true
              }
              aria-label="Show title on storefront"
            />

            <span
              className="st-category-workspace__switch-track"
              aria-hidden="true"
            >
              <span />
            </span>
          </span>
        </label>
      </div>

      <div className="st-ent-admin__uploads">
        <label>
          <span className="st-ent-admin__upload-icon">
            <Upload
              aria-hidden="true"
            />
          </span>

          <span>
            <strong>
              Poster image
            </strong>

            <small>
              {editing
                ? "Optional — choose a file only to replace the current poster."
                : "Required. JPG, PNG, WEBP or AVIF."}
            </small>
          </span>

          <input
            type="file"
            name="poster"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required={!editing}
          />
        </label>

        <label>
          <span className="st-ent-admin__upload-icon">
            <Upload
              aria-hidden="true"
            />
          </span>

          <span>
            <strong>
              Homepage background
            </strong>

            <small>
              {editing
                ? "Optional — replace the large background image shown behind this title on the storefront."
                : "Required — the large wide image shown behind this title on the storefront."}
            </small>
          </span>

          <input
            type="file"
            name="backdrop"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required={!editing}
          />
        </label>

        <label>
          <span className="st-ent-admin__upload-icon">
            <Clapperboard
              aria-hidden="true"
            />
          </span>

          <span>
            <strong>
              Trailer
            </strong>

            <small>
              {editing
                ? "Optional — upload only when replacing the current trailer."
                : "Required. MP4 or WEBM, maximum 50 MB."}
            </small>
          </span>

          <input
            type="file"
            name="trailer"
            accept="video/mp4,video/webm"
            required={!editing}
          />
        </label>
      </div>
    </>
  );
}
