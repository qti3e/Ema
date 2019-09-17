namespace Q.Errors {
  function genBar(start: number, length: number) {
    return " ".repeat(start) + "~".repeat(length);
  }

  export function formatParseError(error: ParseError) {
    const { position, code, message } = error;
    const lineNumberString = String(position.lineNumber);
    return [
      `${position.getUri()} - error EMA${code}: ${message}`,
      `${lineNumberString} ${position.getLine()}`,
      genBar(lineNumberString.length + position.column, error.length)
    ].join("\n");
  }

  export abstract class ParseError {
    constructor(readonly position: Source.Position) {}
    abstract readonly code: number;
    abstract readonly message: string;
    length = 1;

    toString() {
      return formatParseError(this);
    }
  }

  export class UnexpectedCharacterError extends ParseError {
    readonly code = 1001;
    readonly message = "Unexpected character.";
  }

  export class UnterminatedStringLiteral extends ParseError {
    readonly code = 1002;
    readonly message = "Unterminated string literal.";
  }

  export class MissedListSeparator extends ParseError {
    readonly code = 1003;
    readonly message = "Missed list separator.";
  }

  export class TrailingListSeparator extends ParseError {
    readonly code = 1004;
    readonly message = "Trailing list separator.";
  }

  export class ExtraListSeparator extends ParseError {
    readonly code = 1005;
    readonly message = "Extra list separator.";
  }

  export class UnexpectedToken extends ParseError {
    readonly code = 1006;
    readonly message = "Unexpected token.";

    constructor(readonly token: Scanner.Token) {
      super(token.position);
      this.length = token.length;
    }
  }

  export class ExpectedToken extends ParseError {
    readonly code = 1007;
    readonly message: string;

    constructor(position: Source.Position, readonly expected: string) {
      super(position);
      this.message = `Expected "${expected}" but found something else.`;
    }
  }
}
