namespace Q.Parser {
  let stream: Tokenizer.TokenStream;

  function numericLiteral() {
    const token = stream.peek();
  }

  export function parse(source: Source.File): AST.Source[] {
    stream = new Tokenizer.TokenStream(source);
    return [];
  }
}
