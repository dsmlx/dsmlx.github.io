/* Mermaid rendering for ```mermaid fences.
 *
 * pymdownx.superfences turns the fence into <pre class="mermaid">, which is what
 * mermaid looks for. Theme variables are pinned to the site tokens so diagrams
 * read as part of the page rather than as a pasted-in image. */
(function () {
  if (typeof mermaid === "undefined") {
    return;
  }

  var fontStack =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", ' +
    '"Hiragino Sans GB", "Microsoft YaHei", Roboto, Helvetica, Arial, sans-serif';

  mermaid.initialize({
    startOnLoad: true,
    securityLevel: "strict",
    theme: "base",
    fontFamily: fontStack,
    themeVariables: {
      fontFamily: fontStack,
      fontSize: "15px",
      background: "#FFFFFF",
      primaryColor: "#FFFFFF",
      primaryBorderColor: "#1D5BC4",
      primaryTextColor: "#1A2332",
      secondaryColor: "#EFF3F9",
      secondaryBorderColor: "#636F80",
      secondaryTextColor: "#1A2332",
      tertiaryColor: "#E4EAF3",
      tertiaryBorderColor: "#636F80",
      tertiaryTextColor: "#3E4859",
      lineColor: "#3E4859",
      textColor: "#1A2332",
      clusterBkg: "#F7F9FC",
      clusterBorder: "#C7D2E0",
      edgeLabelBackground: "#FFFFFF",
    },
    flowchart: {
      htmlLabels: true,
      curve: "basis",
      // Enough air that labelled edges do not collide with the boxes.
      nodeSpacing: 44,
      rankSpacing: 56,
      padding: 12,
      // Render at the diagram's natural size instead of scaling it down to the
      // content column. Scaling a wide flow to fit shrinks its type with it,
      // which is how an architecture diagram ends up unreadable; the container
      // scrolls instead.
      useMaxWidth: false,
    },
    sequence: {
      useMaxWidth: false,
      actorFontFamily: fontStack,
      noteFontFamily: fontStack,
      messageFontFamily: fontStack,
    },
  });
})();
