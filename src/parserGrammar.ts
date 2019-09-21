namespace Q.Parser.Grammar {
  export const source = () => readArray(declaration) as any;

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
    ["type reference", "identifier"],
    _ => (_.type = typeRef()),
    _ => (_.name = current.asIdentifer())
  );

  export const typeRef = () => memberAccess() || current.asIdentifer();

  export const memberAccess = lrBinary<AST.MemberAccess, "base", "member">(
    (loc, lhs, rhs) => new AST.MemberAccess(loc, lhs, rhs),
    () => current.asIdentifer(),
    $ => $.isPunctuation("."),
    () => current.asIdentifer()
  );
}
