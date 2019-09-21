namespace Q.Parser.Grammar {
  export const declaration = createPattern<AST.FunctionDeclaration>(
    $ => new AST.FunctionDeclaration($.location, $.name, $.parameters, []),
    ["func", "identifier", "(", "parameters", ")"],
    _ => current.isKeyword("func"),
    _ => (_.name = current.asIdentifer()),
    _ => current.isPunctuation("("),
    _ =>
      (_.parameters = readArraySep(
        parameter,
        $ => $.isPunctuation(","),
        $ => $.isPunctuation(")")
      )),
    _ => current.isPunctuation(")")
  );

  export const parameter = createPattern<AST.Parameter>(
    $ => new AST.Parameter($.location, $.name, $.type),
    ["identifier"],
    _ => (_.name = current.asIdentifer())
  );
}
