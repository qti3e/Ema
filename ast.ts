namespace Q.AST {
  export abstract class Node {
    abstract readonly location: Source.Position;
  }

  export type Source = NumericLiteral[];

  export class NumericLiteral extends Node {
    constructor(readonly location: Source.Position, readonly value: number) {
      super();
    }
  }

  export class Identifier extends Node {
    constructor(readonly location: Source.Position, readonly name: string) {
      super();
    }
  }

  export type BinaryOperator = "+" | "-" | "*" | "/";

  export class BinaryOperation extends Node {
    constructor(
      readonly location: Source.Position,
      readonly operator: BinaryOperator,
      readonly lhs: Identifier,
      readonly rhs: Identifier
    ) {
      super();
    }
  }

  export class MemberAccess extends Node {
    constructor(
      readonly location: Source.Position,
      readonly base: MemberAccess | Identifier,
      readonly member: Identifier
    ) {
      super();
    }
  }
}
