import { test } from "node:test";
import assert from "node:assert/strict";
import { comoInsertar } from "./links.js";

test("YouTube: cualquier forma del link da el mismo iframe", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
  ]) {
    assert.equal(comoInsertar(url).src, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", url);
  }
});

test("Google: documento, hoja, presentación y archivo de Drive", () => {
  assert.equal(
    comoInsertar("https://docs.google.com/document/d/abc_12-3/edit?usp=sharing").src,
    "https://docs.google.com/document/d/abc_12-3/preview",
  );
  assert.equal(
    comoInsertar("https://docs.google.com/spreadsheets/d/xyz/edit#gid=0").src,
    "https://docs.google.com/spreadsheets/d/xyz/preview",
  );
  assert.equal(
    comoInsertar("https://docs.google.com/presentation/d/pres/edit").src,
    "https://docs.google.com/presentation/d/pres/embed",
  );
  assert.equal(
    comoInsertar("https://drive.google.com/file/d/archivo1/view?usp=drive_link").src,
    "https://drive.google.com/file/d/archivo1/preview",
  );
});

test("PDF y links comunes van como tarjeta, sin iframe", () => {
  assert.equal(comoInsertar("https://abc.gob.ar/calendario.pdf").src, undefined);
  assert.equal(comoInsertar("https://abc.gob.ar/calendario.pdf").icono, "ph:file-pdf");
  assert.equal(comoInsertar("https://abc.gob.ar/").src, undefined);
});

test("un dominio que sólo se parece no se mete en un iframe", () => {
  assert.equal(comoInsertar("https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ").src, undefined);
  assert.equal(comoInsertar("https://docs.google.com.evil.com/document/d/abc/edit").src, undefined);
});
