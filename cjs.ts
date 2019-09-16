declare const module: { exports: Object } | undefined;
if (typeof module === "object") {
  module.exports = Q;
}
