/**
 * A parser which uses best-guessing to produce the best result even when the
 * code is in the most broken state.
 */
namespace Q.Parser {
  /**
   * Parse a new Source file into an AST Source object and collect parse errors.
   *
   * @param source The source file to parse.
   */
  export function parse(source: Source.File): AST.Source {
    currentSource = source;
    const stream = new Scanner.TokenStream(source);
    cursorStack.length = 0;
    cursorStack.push((current = Scanner.toLinkedList(stream)));
    // Skip new lines.
    while (current.token && current.token.kind === Scanner.TokenKind.NEW_LINE)
      current = current.next;
    return readArray(declaration);
  }

  /**
   * Every value that means negative in JS.
   */
  type False = false | null | undefined | 0 | void;

  /**
   * Turns a AST Node into a null writable structure.
   */
  type WritableContext<T extends AST.Node> = {
    -readonly [key in keyof T]: T[key] | null;
  };

  /**
   * Store the cursors.
   */
  const cursorStack: Scanner.TokenListEntity[] = [];

  /**
   * The current source file passed to parse() function.
   */
  let currentSource: Source.File;

  /**
   * The current token list entity.
   */
  let current: Scanner.TokenListEntity;

  /**
   * Yet another stack to store error frames.
   * At the start of matching each Node we start a new error frame and all the
   * reported errors will be published on that frame instead of the source file
   * if that Node was used in the returned values we just add the errors to the
   * source file, otherwise we just ignore all the collected errors.
   */
  const errorFrames: Errors.ParseError[][] = [];

  /**
   * Stores the current token in the cursor stack.
   */
  function store() {
    cursorStack.push(current);
  }

  /**
   * Restore the last position stored in the cursor stack.
   */
  function restore() {
    if (cursorStack.length === 0) throw new Error("This is my fault.");
    current = cursorStack.pop()!;
  }

  /**
   * Returns whatever we've reached end of file.
   */
  function eof() {
    return current.token === null;
  }

  /**
   * Advance the current token.
   */
  function next() {
    if (current.token === null) return;
    current = current.next;
    while (current.token && current.token.kind === Scanner.TokenKind.NEW_LINE)
      current = current.next;
  }

  /**
   * Reports an error in the current error frame.
   *
   * @param errors List of parse errors.
   */
  function reportError(...errors: Errors.ParseError[]) {
    if (errorFrames.length) {
      errorFrames[errorFrames.length - 1].push(...errors);
    } else {
      for (const error of errors) currentSource.addParseError(error);
    }
  }

  /**
   * Adds a new error frame.
   */
  function addErrorFrame() {
    errorFrames.push([]);
  }

  /**
   * Pop the current error frame from the stack and report its collected errors
   * if the report parameter is set to `true`.
   *
   * @param report Whatever to report the collected errors or ignore them.
   */
  function popErrorFrame(report: boolean) {
    const errors = errorFrames.pop();
    if (!errors) throw new Error("");
    if (report) reportError(...errors);
  }

  // !-----------------------Start of the matcher API.

  /**
   * Reads an array of elements matched by the matcher.
   *
   * @param matcher The matcher callback used to match array items.
   * @param end Optional callback to check if we can give up on the search or
   *  not at the current position.
   */
  function readArray<T>(matcher: () => T | False, end?: () => boolean): T[] {
    const collected: T[] = [];

    while (!eof()) {
      const value = matcher();
      if (value) {
        collected.push(value);
      } else if (end && end()) {
        break;
      } else {
        // Report the error.
        reportError(new Errors.UnexpectedToken(current.token!));
        // Skip the current token and continue...
        next();
      }
    }

    return collected;
  }

  /**
   * Creates a new function that matches a specific grammar.
   *
   * @param factory The function that constructs the new AST Node.
   * @param matchers List of matcher callbacks.
   */
  function createPattern<T extends AST.Node>(
    factory: (context: T) => T,
    ...matchers: ((context: WritableContext<T>) => AST.Node | False | true)[]
  ): () => T | null {
    return () => {
      const context: WritableContext<T> = {} as any;
      const start = current.token;
      let entity: Scanner.TokenListEntity;
      // Store the current token so if we don't match the data
      // we can just set it back to here.
      store();
      // Start a new error frame.
      addErrorFrame();

      for (let i = 0; i < matchers.length; ++i) {
        // TODO(qti3e) Fuzzy-match.
        entity = current;
        if (!eof() && matchers[i](context)) {
          // If the matcher did not changed the current token.
          // we do it here.
          if (entity === current) next();
        } else {
          // Undo the changes to the cursor.
          restore();
          // Ignore all the errors in the current error frame.
          popErrorFrame(false);
          return null;
        }
      }

      const lastToken = entity!.token!;
      context.location = {
        start: start!.position,
        end: lastToken.position.add(lastToken.length)
      };

      // Publish all the errors in the current error frame.
      popErrorFrame(true);
      return factory(context as T);
    };
  }

  // !-------------------------- Start of Ema's actual grammar.

  const declaration = createPattern<AST.FunctionDeclaration>(
    $ => new AST.FunctionDeclaration($.location, $.name, [], []),
    _ => current.isKeyword("func"),
    _ => (_.name = current.asIdentifer())
  );
}