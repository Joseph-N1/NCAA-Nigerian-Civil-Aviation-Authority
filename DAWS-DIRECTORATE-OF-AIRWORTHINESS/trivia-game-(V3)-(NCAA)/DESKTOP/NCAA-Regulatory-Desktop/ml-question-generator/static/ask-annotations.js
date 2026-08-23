(function () {
    const references = Array.from(document.querySelectorAll("[data-answer-reference]"));
    if (!references.length) {
        return;
    }

    const prefersTapBehavior = window.matchMedia("(hover: none), (pointer: coarse)");

    function setExpanded(reference, expanded) {
        const link = reference.querySelector(".answer-reference-link");
        if (link) {
            link.setAttribute("aria-expanded", expanded ? "true" : "false");
        }
    }

    function closeReference(reference) {
        reference.classList.remove("is-open");
        setExpanded(reference, false);
    }

    function openReference(reference) {
        references.forEach((candidate) => {
            if (candidate !== reference) {
                closeReference(candidate);
            }
        });

        reference.classList.add("is-open");
        setExpanded(reference, true);
    }

    references.forEach((reference) => {
        const link = reference.querySelector(".answer-reference-link");
        if (!link) {
            return;
        }

        setExpanded(reference, false);

        reference.addEventListener("mouseenter", () => {
            openReference(reference);
        });

        reference.addEventListener("mouseleave", () => {
            if (!reference.matches(":focus-within")) {
                closeReference(reference);
            }
        });

        reference.addEventListener("focusin", () => {
            openReference(reference);
        });

        reference.addEventListener("focusout", () => {
            window.requestAnimationFrame(() => {
                if (!reference.matches(":focus-within") && !reference.matches(":hover")) {
                    closeReference(reference);
                }
            });
        });

        link.addEventListener("click", (event) => {
            if (!prefersTapBehavior.matches) {
                return;
            }

            if (!reference.classList.contains("is-open")) {
                event.preventDefault();
                openReference(reference);
            }
        });
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest("[data-answer-reference]")) {
            references.forEach(closeReference);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }

        references.forEach(closeReference);

        const activeReference = document.activeElement && document.activeElement.closest("[data-answer-reference]");
        if (activeReference) {
            document.activeElement.blur();
        }
    });
})();
