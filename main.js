const Q = require("./build/q");

class Handler extends Q.System.IOHandlerBase {
  async read() {
    return `
    func a

    func 5


    func c
    `;
  }
}

Q.System.setIOHandler(new Handler());

async function main() {
  const source = Q.Source.Graph.getFile("./main.js");
  const text = await source.getContent();

  const result = Q.Parser.parse(source);
  // console.log(source.hasError, result);
  for (const err of source.getParseErrors()) {
    console.log(err.toString());
  }

}

main();
