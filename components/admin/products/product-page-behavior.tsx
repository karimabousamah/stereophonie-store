"use client";

import {
  useEffect,
} from "react";

type LifecycleHandles = {
  firstFrame: number;
  secondFrame: number;
  exitTimer: number;
  removeTimer: number;
};

function normalizeText(
  value: string | null | undefined,
) {
  return (
    value
      ?.replace(/\s+/g, " ")
      .trim()
      .toLowerCase() ??
    ""
  );
}

export default function ProductPageBehavior({
  collapseSpecificationsInitially = false,
}: {
  collapseSpecificationsInitially?: boolean;
}) {
  useEffect(() => {
    const handles =
      new Map<
        HTMLElement,
        LifecycleHandles
      >();

    /*
     * ========================================================
     * PRODUCT FEEDBACK
     * ========================================================
     *
     * Reuse every EXISTING Product success/error message.
     * We do not replace its content or its save behavior.
     *
     * Lifecycle matches Categories:
     *
     * enter
     * shown
     * 5 seconds
     * exit
     * remove from layout at 5.45 seconds
     */
    const startNotice = (
      notice: HTMLElement,
    ) => {
      const signature =
        normalizeText(
          notice.textContent,
        );

      if (!signature) {
        return;
      }

      if (
        notice.dataset
          .productFeedbackSignature ===
          signature &&
        handles.has(notice)
      ) {
        return;
      }

      const old =
        handles.get(notice);

      if (old) {
        window.cancelAnimationFrame(
          old.firstFrame,
        );

        if (old.secondFrame) {
          window.cancelAnimationFrame(
            old.secondFrame,
          );
        }

        window.clearTimeout(
          old.exitTimer,
        );

        window.clearTimeout(
          old.removeTimer,
        );
      }

      notice.hidden = false;

      notice.dataset
        .productFeedbackSignature =
        signature;

      notice.classList.add(
        "st-category-action-notice-v4",
      );

      if (
        notice.matches(
          '[data-admin-product-error="true"]',
        )
      ) {
        notice.setAttribute(
          "data-admin-category-error",
          "true",
        );
      }

      notice.classList.remove(
        "is-shown",
        "is-exit",
      );

      notice.classList.add(
        "is-enter",
      );

      /*
       * Capture the notice's real natural height BEFORE the
       * lifecycle collapses it.
       */
      const naturalHeight =
        Math.max(
          notice.scrollHeight,
          1,
        );

      notice.style.setProperty(
        "--st-product-feedback-height",
        `${naturalHeight}px`,
      );

      let secondFrame = 0;

      const firstFrame =
        window.requestAnimationFrame(
          () => {
            secondFrame =
              window.requestAnimationFrame(
                () => {
                  notice.classList.remove(
                    "is-enter",
                  );

                  notice.classList.add(
                    "is-shown",
                  );
                },
              );
          },
        );

      const exitTimer =
        window.setTimeout(
          () => {
            notice.classList.remove(
              "is-shown",
            );

            notice.classList.add(
              "is-exit",
            );
          },
          5000,
        );

      const removeTimer =
        window.setTimeout(
          () => {
            notice.hidden = true;

            /*
             * Prevent a refresh from replaying old
             * server-result feedback.
             */
            const url =
              new URL(
                window.location.href,
              );

            [
              "saved",
              "setup_saved",
              "image_success",
              "error",
            ].forEach(
              (parameter) => {
                url.searchParams.delete(
                  parameter,
                );
              },
            );

            window.history.replaceState(
              window.history.state,
              "",
              `${url.pathname}${url.search}${url.hash}`,
            );

            handles.delete(
              notice,
            );
          },
          5450,
        );

      handles.set(
        notice,
        {
          firstFrame,
          secondFrame,
          exitTimer,
          removeTimer,
        },
      );
    };

    const scanNotices = () => {
      const notices =
        document.querySelectorAll<
          HTMLElement
        >(
          [
            ".st-admin-product-alert-v5",
            '[data-admin-product-success="true"]',
            '[data-admin-product-error="true"]',
          ].join(","),
        );

      notices.forEach(
        (notice) => {
          /*
           * ProductActionNotice already owns the exact
           * Categories lifecycle itself.
           */
          if (
            notice.classList.contains(
              "st-category-action-notice-v4",
            )
          ) {
            return;
          }

          startNotice(
            notice,
          );
        },
      );
    };


    /*
     * ========================================================
     * EDIT PRODUCT — TECHNICAL SPECIFICATIONS
     * ========================================================
     *
     * Collapse ONLY the initial Edit Product state.
     *
     * We trigger the editor's EXISTING collapse control once.
     * Afterwards the admin remains completely free to reopen
     * and close specifications normally.
     */
    let specificationsCollapsed =
      !collapseSpecificationsInitially;

    const collapseSpecifications =
      () => {
        if (
          specificationsCollapsed
        ) {
          return;
        }

        const editor =
          document.querySelector<
            HTMLElement
          >(
            ".st-admin-tech-spec-editor-v3",
          );

        if (!editor) {
          return;
        }

        /*
         * Native details fallback.
         */
        const openDetails =
          editor.matches(
            "details[open]",
          )
            ? editor
            : editor.querySelector<
                HTMLElement
              >(
                "details[open]",
              );

        if (openDetails) {
          openDetails.removeAttribute(
            "open",
          );

          specificationsCollapsed =
            true;

          return;
        }

        /*
         * Find the real existing
         * "Hide specifications" control.
         *
         * Search the document because the editor currently
         * uses portal-driven pieces in a few places.
         */
        const controls =
          Array.from(
            document.querySelectorAll<
              HTMLElement
            >(
              [
                "button",
                '[role="button"]',
                "summary",
              ].join(","),
            ),
          );

        const textControl =
          controls.find(
            (control) => {
              const text =
                normalizeText(
                  control.textContent,
                );

              return (
                text.includes(
                  "specification",
                ) &&
                (
                  text.includes(
                    "hide",
                  ) ||
                  text.includes(
                    "collapse",
                  )
                )
              );
            },
          );

        if (textControl) {
          specificationsCollapsed =
            true;

          textControl.click();

          return;
        }

        /*
         * Accessibility fallback.
         */
        const expandedControl =
          controls.find(
            (control) => {
              if (
                control.getAttribute(
                  "aria-expanded",
                ) !== "true"
              ) {
                return false;
              }

              const label =
                normalizeText(
                  control.getAttribute(
                    "aria-label",
                  ),
                );

              const text =
                normalizeText(
                  control.textContent,
                );

              return (
                label.includes(
                  "specification",
                ) ||
                text.includes(
                  "specification",
                )
              );
            },
          );

        if (expandedControl) {
          specificationsCollapsed =
            true;

          expandedControl.click();
        }
      };


    /*
     * Initial pass.
     */
    scanNotices();

    let secondInitialFrame = 0;

    const firstInitialFrame =
      window.requestAnimationFrame(
        () => {
          secondInitialFrame =
            window.requestAnimationFrame(
              () => {
                collapseSpecifications();
                scanNotices();
              },
            );
        },
      );


    /*
     * Catch:
     * - portal-mounted Technical Specifications
     * - client-side Product errors
     * - any Product success/error feedback rendered later
     */
    const observer =
      new MutationObserver(
        () => {
          collapseSpecifications();
          scanNotices();
        },
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
        characterData: true,
      },
    );


    return () => {
      observer.disconnect();

      window.cancelAnimationFrame(
        firstInitialFrame,
      );

      if (secondInitialFrame) {
        window.cancelAnimationFrame(
          secondInitialFrame,
        );
      }

      handles.forEach(
        (handle) => {
          window.cancelAnimationFrame(
            handle.firstFrame,
          );

          if (handle.secondFrame) {
            window.cancelAnimationFrame(
              handle.secondFrame,
            );
          }

          window.clearTimeout(
            handle.exitTimer,
          );

          window.clearTimeout(
            handle.removeTimer,
          );
        },
      );

      handles.clear();
    };
  }, [
    collapseSpecificationsInitially,
  ]);

  return null;
}
