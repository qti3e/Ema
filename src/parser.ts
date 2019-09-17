/**
 * A parser which uses best-guessing to produce the best result even when the
 * code is in the most broken state.
 */
namespace Q.Parser {
  const stack: Scanner.TokenListEntity[] = [];
  let currentSource: Source.File;
  let current: Scanner.TokenListEntity;
  let ignoreErrors = false;

  function store() {
    stack.push(current);
  }

  function restore() {
    if (stack.length === 0) throw new Error("This is my fault.");
    current = stack.pop()!;
  }

  function eof() {
    return current.token === null;
  }

  function next() {
    if (current.token === null) return;
    current = current.next;
    while (current.token && current.token.kind === Scanner.TokenKind.NEW_LINE)
      current = current.next;
  }

  function prev() {
    if (!current.prev) throw new Error("This is my fault.");
    current = current.prev!;
    while (
      current.token &&
      current.token.kind === Scanner.TokenKind.NEW_LINE &&
      current.prev
    )
      current = current.prev;
  }

  function currentPosition() {
    if (current.token) return current.token.position;
    return current.prev!.token!.position;
  }

  function reportError(error: Errors.ParseError) {
    if (ignoreErrors) return;
    currentSource.addParseError(error);
  }

  // !-----------------------End of cursor manipulation API.

  export function parse(source: Source.File): AST.Source {
    currentSource = source;
    const stream = new Scanner.TokenStream(source);
    stack.length = 0;
    stack.push((current = Scanner.toLinkedList(stream)));
    ignoreErrors = false;

    const body = readArray(declaration);

    return body;
  }

  /**
   * Read an array of Nodes without separator.
   *
   * @param cb Callback that collects the data.
   * @param end Optional - Called when item is not matched and indicates
   *  whatever we keep moving or return from the array.
   */
  function readArray<T>(cb: () => T | false, end?: () => boolean): T[] {
    const result: T[] = [];

    while (!eof()) {
      while (current.token && current.token.kind === Scanner.TokenKind.NEW_LINE)
        current = current.next;

      const item = cb();

      if (!item) {
        if (end && end()) break;
        // Report the error.
        reportError(new Errors.UnexpectedToken(current.token!));
        // And keep moving...
        next();
      } else {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Reads a list of items with a separator.
   *
   * @param cb Callback that matches the data.
   * @param sep The function that matches the list separator.
   * @param end Called when item was not matched and indicates if we should
   *  continue moving forward or return the collected items.
   */
  function readArraySep<T>(
    cb: () => T | false,
    sep: () => unknown,
    end?: () => boolean
  ): T[] {
    const result: T[] = [];

    while (!eof()) {
      while (current.token && current.token.kind === Scanner.TokenKind.NEW_LINE)
        current = current.next;

      ignoreErrors = true;
      const item = cb();
      ignoreErrors = false;

      if (!item) {
        // For example in an array we can always check for `]` to see if we
        // are at the end of the list.
        if (end && end()) break;

        if (sep()) {
          // Imagine if we want to collect a list of numbers.
          // And we have `1, 2, 3` as a valid list this state (where we are)
          // happens with a thing like this: `1,, 2`. You see there is one blank
          // element. then there is a separator and that's something that
          // happens a lot of times... It's a error but we can keep moving forward.
          reportError(
            new Errors.ExtraListSeparator(
              current.prev
                ? current.prev.token!.position
                : current.token!.position
            )
          );
          // Don't exit, just keep finding other elements.
          continue;
        } else {
          // This is a trailing separator error.
          reportError(
            new Errors.TrailingListSeparator(
              current.token!.position.add(current.token!.length)
            )
          );
          break;
        }
      } else {
        result.push(item);
      }

      // Well, In real world this happens a lot when we miss the list separator.
      // So keep moving forward... but report an error.
      // Example: `1, 2, 3 4`
      if (!(eof() && sep())) {
        reportError(new Errors.MissedListSeparator(current.token!.position));
      }
    }

    return result;
  }

  function $keyword(keyword: string) {
    const { token } = current;
    return (
      token &&
      token.kind === Scanner.TokenKind.IDENTIFIER &&
      token.name === keyword
    );
  }

  function $identifer(): AST.Identifier | null {
    const { token } = current;
    if (!token || token.kind !== Scanner.TokenKind.IDENTIFIER) return null;
    if (token.keyword) return null;
    return new AST.Identifier(
      {
        start: token.position,
        end: token.position.add(token.length)
      },
      token.name
    );
  }

  function $punctuation(punctuation: string): boolean {
    const { token } = current;
    return !!(
      token &&
      token.kind === Scanner.TokenKind.PUNCTUATION &&
      token.punctuation === punctuation
    );
  }

  type WriteContext<T extends AST.Node> = {
    -readonly [key in keyof T]: T[key] | null | false;
  };

  type ReadyContext<T extends AST.Node> = {
    -readonly [key in keyof T]: T[key];
  };

  function createPattern<T extends AST.Node>(
    factory: (c: ReadyContext<T>) => T,
    words: string[],
    ...units: ((c: WriteContext<T>) => any)[]
  ): () => T | false {
    if (words.length !== units.length) throw new Error();
    const last = units.length - 1;

    return () => {
      const context: WriteContext<T> = {} as any;
      if (!units[0](context)) return false;
      const start = currentPosition();

      store();
      next();

      for (let i = 1; i < units.length; ++i) {
        if (!units[i](context)) {
          reportError(new Errors.ExpectedToken(currentPosition(), words[i]));

          if (i < 3) {
            restore();
            return false;
          }
        }

        if (i < last) next();
      }

      const lastToken = current.token!;
      context.location = {
        start,
        end: lastToken.position.add(lastToken.length)
      };

      return factory(context as ReadyContext<T>);
    };
  }

  // ===== LANGUAGE SPECIFIC FUNCTIONS ======

  const functionDeclaration = createPattern<AST.FunctionDeclaration>(
    $ => new AST.FunctionDeclaration($.location, $.name, $.parameters, []),
    ["func", "identifier", "(", "parameter list", ")"],
    _ => $keyword("func"),
    _ => (_.name = $identifer()),
    _ => $punctuation("("),
    _ =>
      (_.parameters = readArraySep(
        () => parameter(),
        () => $punctuation(","),
        () => $punctuation(")")
      )),
    _ => $punctuation(")")
  );

  const parameter = createPattern<AST.Parameter>(
    $ => new AST.Parameter($.location, $.name, $.type),
    ["type", "identifier"],
    _ => (_.type = $identifer()),
    _ => (_.name = $identifer())
  );

  function declaration(): AST.Declaration | false {
    return functionDeclaration();
  }
}
