const BLOCKED_TAGS = new Set(["script", "foreignobject", "iframe", "object", "embed"]);

const SHAPE_TAGS = new Set([
  "path",
  "rect",
  "circle",
  "ellipse",
  "polygon",
  "polyline",
  "line",
]);

function isSafeUrl(url: string) {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("javascript:")) return false;
  return true;
}

export function sanitizeSvgToCurrentColor(svgText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("SVG inválido.");
  }

  const svg = doc.querySelector("svg");
  if (!svg) {
    throw new Error("Arquivo não contém uma tag <svg>.");
  }

  // Remove dangerous tags
  doc.querySelectorAll(Array.from(BLOCKED_TAGS).join(",")).forEach((el) => el.remove());

  // Remove event handler attrs and unsafe hrefs
  const all = doc.querySelectorAll("*");
  all.forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }

      if ((name === "href" || name === "xlink:href") && !isSafeUrl(value)) {
        el.removeAttribute(attr.name);
        continue;
      }
    }
  });

  // Normalize colors to currentColor
  all.forEach((el) => {
    const tag = el.tagName.toLowerCase();

    const fill = el.getAttribute("fill");
    if (fill && fill !== "none" && !fill.trim().toLowerCase().startsWith("url(")) {
      el.setAttribute("fill", "currentColor");
    }

    const stroke = el.getAttribute("stroke");
    if (stroke && stroke !== "none" && !stroke.trim().toLowerCase().startsWith("url(")) {
      el.setAttribute("stroke", "currentColor");
    }

    // If it's a shape and no explicit fill/stroke, force fill to currentColor
    if (SHAPE_TAGS.has(tag) && !el.hasAttribute("fill") && !el.hasAttribute("stroke")) {
      el.setAttribute("fill", "currentColor");
    }
  });

  // Ensure the SVG scales nicely inside a fixed-height container.
  svg.setAttribute("height", "20");
  svg.removeAttribute("width");
  svg.setAttribute("preserveAspectRatio", svg.getAttribute("preserveAspectRatio") ?? "xMidYMid meet");

  // Remove inline styles that could override our color.
  svg.removeAttribute("style");

  return svg.outerHTML;
}

