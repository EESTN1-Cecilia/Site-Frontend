/* EEST N°1 Monte Grande — JavaScript puro */
(function () {
  "use strict";

  var EXT = { pdf: "PDF", doc: "DOC", docx: "DOC", xls: "XLS", xlsx: "XLS", ppt: "PPT", pptx: "PPT" };

  function extOf(name) {
    var raw = String(name || "").split(".").pop().toLowerCase();
    return EXT[raw] || "DOC";
  }

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function arrowIcon(cls, path) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    if (cls) svg.setAttribute("class", cls);
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", path);
    svg.appendChild(p);
    return svg;
  }

  function docCard(item) {
    var ext = extOf(item.name);
    var a = el("a", "doc");
    a.href = "https://drive.google.com/file/d/" + item.id + "/view";
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    var img = el("img", "doc-cover");
    img.loading = "lazy";
    img.alt = "Portada de " + item.label;
    img.src = "/api/public/thumb?id=" + item.id;
    img.addEventListener("error", function () {
      if (!img.dataset.retry) {
        img.dataset.retry = "1";
        img.src = "https://drive.google.com/thumbnail?id=" + item.id + "&sz=w480";
        return;
      }
      var fb = el("div", "doc-cover-fallback", ext);
      img.replaceWith(fb);
    });
    a.appendChild(img);

    var body = el("div", "doc-body");
    body.appendChild(el("span", "doc-ext", ext));
    var txt = el("span", "doc-text");
    txt.appendChild(el("span", "doc-label", item.label));
    txt.appendChild(el("span", "doc-name", item.name));
    body.appendChild(txt);
    var arr = arrowIcon("doc-arrow", "M7 17 17 7M9 7h8v8");
    body.appendChild(arr);
    a.appendChild(body);
    return a;
  }

  function renderSections(sections, mount) {
    sections.forEach(function (section) {
      var wrap = el("section", "card section");
      var head = document.createElement("header");
      head.appendChild(el("h2", null, section.title));
      if (section.subtitle) head.appendChild(el("p", null, section.subtitle));
      wrap.appendChild(head);

      var files = section.items.filter(function (i) { return i.type === "file"; });
      if (files.length) {
        var grid = el("div", "doc-grid");
        files.forEach(function (f) { grid.appendChild(docCard(f)); });
        wrap.appendChild(grid);
      }

      var texts = section.items.filter(function (i) { return i.type === "text"; });
      if (texts.length) {
        var list = el("div", "links");
        texts.forEach(function (t) {
          if (t.href) {
            var a = el("a", "btn-link");
            a.href = t.href;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.appendChild(document.createTextNode(t.text));
            a.appendChild(arrowIcon(null, "M7 17 17 7M9 7h8v8"));
            list.appendChild(a);
          } else {
            list.appendChild(el("p", "note", t.text));
          }
        });
        wrap.appendChild(list);
      }

      mount.appendChild(wrap);
    });
  }

  function setupTheme() {
    var btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    function label() {
      var dark = document.documentElement.classList.contains("dark");
      btn.textContent = dark ? "☀ Modo claro" : "☾ Modo oscuro";
      btn.setAttribute("aria-label", dark ? "Activar modo claro" : "Activar modo oscuro");
    }
    label();
    btn.addEventListener("click", function () {
      var dark = document.documentElement.classList.toggle("dark");
      try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
      label();
    });
  }

  function setupNav() {
    var path = location.pathname.replace(/\/index\.html$/, "/");
    document.querySelectorAll(".nav a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === path || (href !== "/" && path.indexOf(href) === 0)) a.classList.add("active");
      else if (href === "/" && (path === "/" || path === "")) a.classList.add("active");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupTheme();
    setupNav();
    var mount = document.querySelector("[data-sections]");
    if (mount && window.SITE_DATA) {
      var key = mount.getAttribute("data-sections");
      renderSections(window.SITE_DATA[key] || [], mount);
    }
  });
})();
