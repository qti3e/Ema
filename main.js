const Q = require("./build/q");

class Handler extends Q.System.IOHandlerBase {
  async read() {
    return `let x = 5;
    return 5.3;
    return  
    t;`;
  }
}

Q.System.setIOHandler(new Handler());

async function main() {
  const source = Q.Source.Graph.getFile("./main.js");
  await source.getContent();

  const stream = new Q.Tokenizer.TokenStream(source);

  while (!stream.eof()) {
    console.log(stream.next());
  }
}

main();
