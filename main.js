const Q = require("./build/q");

async function main() {
  Q.Utils.SetSingleFileHandler(
    `
func a(X.Y X)
`.trim()
  );

  const source = Q.Source.Graph.getFile("./main.ema");
  const ast = await source.parse();

  // source.edit(8, 8, ", T");

  for (const err of source.getParseErrors()) {
    console.log(err.toString());
  }

  console.log(ast);
  debugger;
}

main();
