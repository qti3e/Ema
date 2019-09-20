namespace Q.Scanner {
  /**
   * The `.kind` property for all of the tokens.
   */
  export enum TokenKind {
    NUMERIC_LITERAL,
    STRING_LITERAL,
    PUNCTUATION,
    OPERATOR,
    ASSIGNMENT_OPERATOR,
    RELATIONAL_OPERATOR,
    IDENTIFIER,
    NEW_LINE
  }

  /**
   * A token is an atomic unit in the language grammar it can be any of the
   * following:
   */
  export type Token =
    | NumericLiteralToken
    | StringLiteralToken
    | PunctuationToken
    | AssignmentOperatorToken
    | OperatorToken
    | RelationalOperatorToken
    | IdentifierToken
    | NewLineToken;

  /**
   * Shared properties by all of the tokens.
   */
  type TokenBase = {
    /**
     * Start position for this token.
     */
    position: Source.Position;

    /**
     * Length of this token.
     */
    length: number;
  };

  /**
   * A numeric literal token is a token representing any number in the source
   * file.
   */
  export type NumericLiteralToken = TokenBase & {
    kind: TokenKind.NUMERIC_LITERAL;

    /**
     * An un-parsed string value representing the number.
     */
    value: string;
  };

  /**
   * A string literal can be either a Double Quote a Single Quote.
   */
  export type StringLiteralToken = TokenBase & {
    kind: TokenKind.STRING_LITERAL;

    /**
     * Un-parsed value for a string literal.
     */
    value: string;
  };

  /**
   * Every valid punctuation in the source file.
   */
  export type Punctuation =
    | ";"
    | "."
    | ":"
    | ","
    | "("
    | ")"
    | "{"
    | "}"
    | "["
    | "]";

  /**
   * A punctuation in the source.
   */
  export type PunctuationToken = TokenBase & {
    kind: TokenKind.PUNCTUATION;

    /**
     * Type of the punctuation.
     */
    punctuation: Punctuation;
  };

  /**
   * Every valid assignment operator in the source file.
   */
  export type AssignmentOperator = "=" | "+=" | "-+" | "*=" | "/=" | "%=";

  /**
   * An assignment operator in the source.
   */
  export type AssignmentOperatorToken = TokenBase & {
    kind: TokenKind.ASSIGNMENT_OPERATOR;

    /**
     * Type of the operator.
     */
    operator: AssignmentOperator;
  };

  /**
   * Every valid unary or binary operator in the source.
   */
  export type Operator =
    | "+"
    | "-"
    | "*"
    | "/"
    | "%"
    | "|"
    | "&"
    | "^"
    | "!"
    | "||"
    | "&&"
    | "**"
    | "++"
    | "--";

  /**
   * An operator in the source file.
   */
  export type OperatorToken = TokenBase & {
    kind: TokenKind.OPERATOR;

    /**
     * Type of the operator.
     */
    operator: Operator;
  };

  /**
   * All of the valid comparison operator in the source.
   */
  export type RelationalOperator = "<" | ">" | "==" | "!=";

  /**
   * A relation operator in the source file.
   */
  export type RelationalOperatorToken = TokenBase & {
    kind: TokenKind.RELATIONAL_OPERATOR;

    /**
     * Type of the operator.
     */
    operator: RelationalOperator;
  };

  /**
   * An identifier token.
   */
  export type IdentifierToken = TokenBase & {
    kind: TokenKind.IDENTIFIER;

    /**
     * Name of the identifer.
     */
    name: string;

    /**
     * Whatever this identifier is a possible keyword or not.
     */
    keyword?: boolean;
  };

  /**
   * A new line token - Yes new line tokens are emitted by the TokenStream.
   */
  export type NewLineToken = TokenBase & {
    kind: TokenKind.NEW_LINE;
  };

  /**
   * List of keywords.
   */
  export const keywords: ReadonlySet<string> = new Set<string>(["func"]);

  /**
   * An implementation for a token stream.
   */
  export class TokenStream {
    /**
     * The current token in the stack. (There is no stack!)
     */
    private current: Token | null = null;

    /**
     * The current position in the source.
     */
    private cursor = 0;

    /**
     * Content of the `source`, just for localization.
     */
    private text: string;

    /**
     * Constructs a new TokenStream from the given source file.
     *
     * @Note The source file must be loaded in order to be used.
     * @param source The source file.
     */
    constructor(readonly source: Source.File) {
      this.text = source.getContentSync();
    }

    /**
     * Helper function to read an escaped sequence of bytes.
     *
     * @param escape The end character or the character we want to unescape.
     */
    private readEscaped(escape: string): string {
      let escaped = false;
      let str = "";
      ++this.cursor;
      while (this.text[this.cursor]) {
        var ch = this.text[this.cursor++];
        if (escaped) {
          str += ch;
          escaped = false;
        } else if (ch == "\\") {
          escaped = true;
        } else if (ch == escape) {
          return str;
        } else {
          str += ch;
        }
      }
      // Report an error.
      this.source.addParseError(
        new Errors.UnterminatedStringLiteral(
          new Source.Position(this.source, this.cursor)
        )
      );
      // But keep working :D
      return str;
    }

    /**
     * Helper function to match regular expressions.
     *
     * @param regExp The regular expression we want to match against.
     */
    private regExp(regExp: RegExp): string {
      const text = this.text.slice(this.cursor);
      const matches = regExp.exec(text);
      if (!matches) return "";
      const match = matches[0];
      this.cursor += match.length;
      return match;
    }

    /**
     * Skip white spaces expect "\r" and "\n" (a.k.a New line feeds)
     */
    private skipWhiteSpace() {
      let ch = this.text[this.cursor];
      while (/\s/.test(ch) && !(ch === "\n" || ch === "\r"))
        ch = this.text[++this.cursor];
    }

    /**
     * Read the next token skipping the trimming white spaces.
     */
    private readNext(): Token | null {
      this.skipWhiteSpace();

      const start = this.cursor;
      const ch0 = this.text[this.cursor];
      const ch1 = this.text[this.cursor + 1];

      if (ch0 === undefined) return null;

      if (ch0 === "\n") {
        ++this.cursor;
        return {
          kind: TokenKind.NEW_LINE,
          position: new Source.Position(this.source, start),
          length: 1
        };
      }

      if (ch0 === "\r") {
        if (ch1 === "\n") {
          this.cursor += 2;
          return {
            kind: TokenKind.NEW_LINE,
            position: new Source.Position(this.source, start),
            length: 2
          };
        }
        ++this.cursor;
        return this.readNext();
      }

      if (/\d/.test(ch0)) {
        const value = this.regExp(/^\d+(\.\d+)?/);
        return {
          kind: TokenKind.NUMERIC_LITERAL,
          value,
          position: new Source.Position(this.source, start),
          length: value.length
        };
      }

      if (ch0 === "." && /\d/.test(ch1)) {
        const value = this.regExp(/^\.\d+/);
        return {
          kind: TokenKind.NUMERIC_LITERAL,
          value,
          position: new Source.Position(this.source, start),
          length: value.length
        };
      }

      if (/[a-zA-Z\$_]/.test(ch0)) {
        const name = this.regExp(/^[a-zA-Z\$_][a-zA-Z0-9_\-]*/);
        const token: IdentifierToken = {
          kind: TokenKind.IDENTIFIER,
          name,
          position: new Source.Position(this.source, start),
          length: name.length
        };
        if (keywords.has(name)) token.keyword = true;
        return token;
      }

      if (ch0 === '"' || ch0 === "'") {
        const value = this.readEscaped(ch0);
        return {
          kind: TokenKind.STRING_LITERAL,
          value,
          position: new Source.Position(this.source, start),
          length: value.length
        };
      }

      const w2 = ch0 + ch1;

      if (ch1 === "=") {
        switch (ch0) {
          case "=":
          case "!":
            this.cursor += 2;
            return {
              kind: TokenKind.RELATIONAL_OPERATOR,
              operator: w2 as RelationalOperator,
              position: new Source.Position(this.source, start),
              length: 2
            };
          case "-":
          case "+":
          case "*":
          case "/":
          case "%":
            this.cursor += 2;
            return {
              kind: TokenKind.ASSIGNMENT_OPERATOR,
              operator: w2 as AssignmentOperator,
              position: new Source.Position(this.source, start),
              length: 2
            };
        }
      }

      if (ch0 === ch1) {
        switch (ch0) {
          case "|":
          case "&":
          case "*":
          case "+":
          case "-":
            this.cursor += 2;
            return {
              kind: TokenKind.OPERATOR,
              operator: w2 as Operator,
              position: new Source.Position(this.source, start),
              length: 2
            };
        }
      }

      switch (ch0) {
        case "+":
        case "-":
        case "*":
        case "/":
        case "%":
        case "|":
        case "&":
        case "^":
        case "!":
          ++this.cursor;
          return {
            kind: TokenKind.OPERATOR,
            operator: ch0,
            position: new Source.Position(this.source, start),
            length: 1
          };
        case "<":
        case ">":
          ++this.cursor;
          return {
            kind: TokenKind.RELATIONAL_OPERATOR,
            operator: ch0,
            position: new Source.Position(this.source, start),
            length: 1
          };
        case "=":
          ++this.cursor;
          return {
            kind: TokenKind.ASSIGNMENT_OPERATOR,
            operator: "=",
            position: new Source.Position(this.source, start),
            length: 1
          };
        case ";":
        case ".":
        case ":":
        case ",":
        case "(":
        case ")":
        case "{":
        case "}":
        case "[":
        case "]":
          ++this.cursor;
          return {
            kind: TokenKind.PUNCTUATION,
            punctuation: ch0,
            position: new Source.Position(this.source, start),
            length: 1
          };
      }

      // Report an error.
      this.source.addParseError(
        new Errors.UnexpectedCharacterError(
          new Source.Position(this.source, start)
        )
      );

      // Yes there was an error an we reported it, but keep moving forward.
      // We always want to parse the source code even if it's in a broken
      // state.
      ++this.cursor;
      return this.readNext();
    }

    /**
     * Peek the current token.
     */
    peek() {
      return this.current || (this.current = this.readNext());
    }

    /**
     * Return the current token and advance to the next.
     */
    next() {
      const token = this.current;
      this.current = null;
      return token || this.readNext();
    }

    /**
     * Have we reached the end of file?
     */
    eof() {
      return this.peek() === null;
    }

    /**
     * Changes the current cursor to the given one.
     *
     * @param cursor The new cursor.
     */
    jump(cursor: number) {
      this.cursor = cursor;
    }

    /**
     * Reloads the contents of the current file.
     */
    reloadContent() {
      this.text = this.source.getContentSync();
    }

    /**
     * Return all the remaining tokens in an array.
     */
    list(): Token[] {
      const tokens: Token[] = [];
      while (!this.eof()) tokens.push(this.next()!);
      return tokens;
    }

    listUntil(position: number) {
      const tokens: Token[] = [];
    }
  }

  /**
   * An entity in the doubly linked-list, this list helps us control the
   * navigation between tokens easier.
   */
  export abstract class TokenListEntityBase {
    /**
     * Constructs a new list entity.
     *
     * @param stream The stream this list is bounded to.
     * @param prev The previous item
     */
    constructor(
      readonly stream: TokenStream,
      readonly prev: TokenListEntityBase | null
    ) {
      this.source = stream.source;
    }

    /**
     * The current file containing this token.
     */
    readonly source: Source.File;

    /**
     * The next token.
     */
    abstract readonly next: TokenListEntityBase;

    /**
     * The current token in this entity.
     */
    abstract readonly token: Token | null;

    /**
     * Returns whatever the current token is a specific token or not.
     *
     * @param name The keyword name.
     */
    isKeyword(name: string): boolean {
      const { token } = this;
      return !!(
        token &&
        token.kind === TokenKind.IDENTIFIER &&
        token.keyword &&
        token.name === name
      );
    }

    /**
     * Returns whatever the current token is a specific punctuation or not.
     *
     * @param punctuation The punctuation.
     */
    isPunctuation(punctuation: string): boolean {
      const { token } = this;
      return !!(
        token &&
        token.kind === TokenKind.PUNCTUATION &&
        token.punctuation === punctuation
      );
    }

    /**
     * Returns true if the current token is a new-line token.
     */
    isNewLine(): boolean {
      const { token } = this;
      return !!(token && token.kind === TokenKind.NEW_LINE);
    }

    /**
     * Returns a new AST Identifier from the current token if it's a identifier
     * otherwise returns null.
     */
    asIdentifer(): AST.Identifier | null {
      const { token } = this;
      return token && token.kind === TokenKind.IDENTIFIER && !token.keyword
        ? new AST.Identifier(
            {
              start: token.position,
              end: token.position.add(token.length)
            },
            token.name
          )
        : null;
    }
  }

  export class StreamTokenListEntity extends TokenListEntityBase {
    /**
     * The list is lazily evaluated from the stream.
     * This property holds the computed value of the next token.
     */
    private nextCache?: TokenListEntityBase;

    constructor(
      stream: TokenStream,
      prev: TokenListEntityBase | null,
      readonly token: Token | null
    ) {
      super(stream, prev);
    }

    /**
     * Returns the next element.
     */
    get next(): TokenListEntityBase {
      if (this.nextCache) return this.nextCache;
      const token = this.stream.next();
      const entity = new StreamTokenListEntity(this.stream, this, token);
      return (this.nextCache = entity);
    }
  }

  export class StaticTokenListEntity extends TokenListEntityBase {
    /**
     * The next element cache.
     */
    private nextCache?: StaticTokenListEntity;

    constructor(
      stream: TokenStream,
      prev: TokenListEntityBase | null,
      readonly backend: Token[],
      readonly index: number
    ) {
      super(stream, prev);
    }

    get next(): StaticTokenListEntity {
      if (this.nextCache) return this.nextCache;
      this.nextCache = new StaticTokenListEntity(
        this.stream,
        this,
        this.backend,
        this.index + 1
      );
      return this.nextCache;
    }

    get token(): Token | null {
      return this.backend[this.index] || null;
    }
  }

  /**
   * Constructs a new linked list from a TokenStream.
   *
   * @param stream A TokenStream to be used as the source.
   */
  export function toStreamLinkedList(
    stream: TokenStream
  ): StreamTokenListEntity {
    return new StreamTokenListEntity(stream, null, stream.next());
  }

  /**
   * Constructs a new static linked list of Tokens.
   *
   * @param stream A TokenStream to be used as the source.
   */
  export function toStaticLinkedList(
    stream: TokenStream
  ): StaticTokenListEntity {
    return new StaticTokenListEntity(stream, null, stream.list(), 0);
  }

  export function applyEdit(
    list: StaticTokenListEntity,
    startPos: number,
    endPos: number,
    newEndPos: number
  ) {
    const { backend, stream } = list;
    const newTokens: Token[] = [];
    stream.reloadContent();
    stream.jump(startPos);

    while (!stream.eof()) {
      const token = stream.next()!;
      if (token.position.position >= newEndPos) break;
      newTokens.push(token);
    }

    const sIndex = findTokenIndexAtPosition(list, startPos);
    const eIndex = findTokenIndexAtPosition(list, endPos - 1, sIndex);
    const delCount = eIndex - sIndex + 1;

    backend.splice(sIndex, delCount, ...newTokens);

    let editHead: StaticTokenListEntity = list;
    while (editHead.index !== sIndex) editHead = editHead.next;

    return {
      editHead,
      numInserted: newTokens.length,
      delCount
    };
  }

  export function findTokenIndexAtPosition(
    list: StaticTokenListEntity,
    position: number,
    start: number = 0
  ): number {
    const { backend } = list;

    const len = backend.length - start;
    let index = (start + len / 2) | 0;
    let step = (len / 4) | 0;

    while (index < backend.length && index >= start) {
      const token = backend[index];
      const start = token.position.position;

      if (start > position) {
        index -= step;
      } else {
        if (position < start + token.length) {
          // start <= position && position < (start + token.length)
          return index;
        }
        index += step;
      }

      step = (step / 2) | 0 || 1;
    }

    return -1;
  }
}
