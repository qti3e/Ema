namespace Q.Errors {
  export abstract class ParseError {
    constructor(readonly position: Source.Position) {}
  }
  export class UnexpectedCharacterError extends ParseError {}
  export class UnterminatedStringLiteral extends ParseError {}
}
