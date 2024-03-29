/**
 * A parser which uses best-guessing to produce the best result even when the
 * code is in the most broken state.
 */
namespace Q.Parser {
  /**
   * Result of parse()
   */
  export interface ParsedInfo {
    /**
     * The root node of the AST.
     */
    AST: AST.Source;
  }

  /**
   * Parse a new Source file into an AST Source object and collect parse errors.
   *
   * @param source The source file to parse.
   */
  export function parse(tokens: Scanner.TokenListEntityBase): ParsedInfo {
    currentSource = tokens.source;
    cursorStack.length = 0;
    cursorStack.push((current = tokens));
    // Skip new lines.
    while (current.token && current.token.kind === Scanner.TokenKind.NEW_LINE)
      current = current.next;
    // Generate the AST.
    addErrorFrame();
    const AST = Grammar.source();
    return { AST };
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
  const cursorStack: Scanner.TokenListEntityBase[] = [];

  /**
   * The current source file passed to parse() function.
   */
  let currentSource: Source.File;

  /**
   * The current token list entity.
   */
  export let current: Scanner.TokenListEntityBase;

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
  export function reportError(...errors: Errors.ParseError[]) {
    if (errorFrames.length) {
      errorFrames[errorFrames.length - 1].push(...errors);
    } else {
      throw new Error();
    }
  }

  /**
   * Adds a new error frame.
   */
  export function addErrorFrame() {
    errorFrames.push([]);
  }

  /**
   * Pop the current error frame from the stack and report its collected errors
   * if the report parameter is set to `true`.
   *
   * @param report Whatever to report the collected errors or ignore them.
   */
  export function popErrorFrame(node: AST.Node | null) {
    const errors = errorFrames.pop();
    if (!errors) throw new Error("");
    if (!node) return;
    node.diagnostics.push(...errors);
  }

  // !-----------------------Start of the matcher API.

  /**
   * Reads an array of elements matched by the matcher.
   *
   * @param matcher The matcher callback used to match array items.
   * @param end Optional callback to check if we can give up on the search or
   *  not at the current position.
   */
  export function readArray<T>(
    matcher: () => T | False,
    end?: () => boolean
  ): T[] {
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
   * Matches an array of elements which has a separator between each element.
   *
   * @param matcher The callback used to match values.
   * @param isSep The callback function used to check if the current token is a
   *  separator.
   * @param isEnd Check if the current token can be the final state.
   */
  export function readArraySep<T>(
    matcher: () => T | False,
    isSep: (token: Scanner.TokenListEntityBase) => boolean,
    isEnd?: (token: Scanner.TokenListEntityBase) => boolean
  ): T[] {
    const collected: T[] = [];
    const end = () => (isEnd ? eof() || isEnd(current) : eof());
    let hasSep = false;
    let lastSepToken: Scanner.TokenListEntityBase;
    let lastPushed = false;

    while (!end()) {
      const value = matcher();

      if (value && !hasSep && lastPushed) {
        const lastToken = current.prev!.token;
        reportError(
          new Errors.MissedListSeparator(
            lastToken!.position.add(lastToken!.length)
          )
        );
      }

      lastPushed = false;

      hasSep = value
        ? !end() && isSep((lastSepToken = current))
        : isSep((lastSepToken = current));
      hasSep && next();

      if (value) {
        collected.push(value);
        lastPushed = true;
      } else if (hasSep) {
        reportError(
          new Errors.ExtraListSeparator(lastSepToken!.token!.position)
        );
      } else {
        reportError(new Errors.UnexpectedToken(current.token!));
        next();
      }
    }

    if (hasSep) {
      reportError(
        new Errors.TrailingListSeparator(lastSepToken!.token!.position)
      );
    }

    return collected;
  }

  /**
   * Creates a new function that matches a specific grammar.
   *
   * @param factory The function that constructs the new AST Node.
   * @param matchers List of matcher callbacks.
   */
  export function createPattern<T extends AST.Node>(
    factory: (context: T) => T,
    names: string[],
    ...matchers: ((
      context: WritableContext<T>
    ) => AST.Node | AST.Node[] | False | true)[]
  ): () => T | null {
    if (names.length !== matchers.length) throw new Error();

    const many = (matchers.length / 2) | 0 || 1;

    const matcher = (child: AST.Node[]): T | null => {
      const context: WritableContext<T> = {} as any;
      const start = current.token;
      let entity: Scanner.TokenListEntityBase;
      let counter = 0;

      for (let i = 0; i < matchers.length; ++i) {
        if (eof()) {
          if (i === 0 || counter < many) return null;
          reportError(new Errors.UnexpectedEOF(currentSource.getEOF()));
          break;
        }

        entity = current;
        const ret = matchers[i](context);

        if (ret instanceof AST.Node) {
          child.push(ret);
        } else if (Array.isArray(ret)) {
          child.push(...ret);
        }

        if (ret) {
          ++counter;
        } else {
          current = entity;
          reportError(
            new Errors.ExpectedToken(
              current.token!.position,
              names[i],
              current.token!
            )
          );
        }
        if (entity === current && !(Array.isArray(ret) && ret.length === 0))
          next();
        else if (!ret && i === matchers.length - 1) next();
      }

      if (counter < many) return null;

      const lastToken = entity!.token!;
      context.location = {
        start: start!.position,
        end: lastToken.position.add(lastToken.length)
      };

      return factory(context as T);
    };

    return () => {
      // Store the current token so if we don't match the data
      // we can just set it back to here.
      store();
      // Start a new error frame.
      addErrorFrame();
      const child: AST.Node[] = [];
      const value = matcher(child);
      // Undo the changes to the cursor.
      if (value === null) {
        restore();
      } else {
        child.map(node => (node.parent = value));
      }
      popErrorFrame(value);
      return value;
    };
  }

  // TODO(qti3e) Clean this monkey-junky typing.
  export function lrBinary<
    T extends AST.Node,
    LHS extends keyof T,
    RHS extends keyof T,
    OPERATOR extends Scanner.Token = Scanner.Token
  >(
    factory: (
      loc: Source.Location,
      lhs: T | T[LHS],
      rhs: T[RHS],
      operator: OPERATOR
    ) => T,
    head: () => T | (T[LHS] extends AST.Node ? T[LHS] : never) | null,
    isOp: (token: Scanner.TokenListEntityBase) => boolean,
    rhs: () => T[RHS] | null
  ): () => T | (T[LHS] extends AST.Node ? T[LHS] : never) | null {
    const matcher = ():
      | T
      | (T[LHS] extends AST.Node ? T[LHS] : never)
      | null => {
      let right: T[RHS] | null;
      let prev: T | (T[LHS] extends AST.Node ? T[LHS] : never) | null;
      let op: OPERATOR;

      const e = current;
      prev = head();
      if (!prev) return null;
      if (e === current) next();

      while (!eof()) {
        if (!current.token || !isOp(current)) break;
        op = current.token as OPERATOR;
        next();
        const e = current;
        right = rhs();
        if (!right) break;
        if (e === current) next();
        const loc = {
          start: new Source.Position(currentSource, 0),
          end: new Source.Position(currentSource, 0)
        };
        prev = factory(loc, prev, right, op);
        console.log(prev);
      }

      return prev;
    };

    return () => {
      // Store the current token so if we don't match the data
      // we can just set it back to here.
      store();
      // Start a new error frame.
      addErrorFrame();
      const value = matcher();
      // Undo the changes to the cursor.
      if (value === null) restore();
      popErrorFrame(value);
      return value;
    };
  }
}
