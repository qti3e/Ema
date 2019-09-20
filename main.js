const Q = require("./build/q");

class Handler extends Q.System.IOHandlerBase {
  async read() {
    return `
    func a()

    func b(x, 2 z, t)

    func c(x, , y, )

    func d(x y)

    func e(, x)
    `;
  }
}

Q.System.setIOHandler(new Handler());

async function main() {
  const source = Q.Source.Graph.getFile("./main.js");
  await source.getContent();

  const result = Q.Parser.parse(source);

  for (const err of source.getParseErrors()) {
    console.log(err.toString());
  }

  console.log(result);

  debugger;
}

main();
