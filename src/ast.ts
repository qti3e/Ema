namespace Q.AST {
  export abstract class Node {
    abstract readonly location: Source.Location;
    parent: Node | null = null;
  }

  export type Source = Declaration[];

  export type Declaration = FunctionDeclaration;

  export type Statement = ExpressionStatement;

  export type Expression = Identifier | NumericLiteral | MemberAccess;

  export type TypeRef = Identifier | MemberAccess;

  export class ExpressionStatement extends Node {
    readonly location: Source.Location;

    constructor(readonly expression: Expression) {
      super();
      this.location = expression.location;
    }
  }

  export class FunctionDeclaration extends Node {
    constructor(
      readonly location: Source.Location,
      readonly name: Identifier,
      readonly parameters: Parameter[],
      readonly body: Statement[]
    ) {
      super();
    }
  }

  export class Parameter extends Node {
    constructor(
      readonly location: Source.Location,
      readonly name: Identifier,
      readonly type: TypeRef
    ) {
      super();
    }
  }

  export class NumericLiteral extends Node {
    constructor(readonly location: Source.Location, readonly value: number) {
      super();
    }
  }

  export class Identifier extends Node {
    constructor(readonly location: Source.Location, readonly name: string) {
      super();
    }
  }

  export type BinaryOperator = "+" | "-" | "*" | "/" | "%";

  export class BinaryOperation extends Node {
    constructor(
      readonly location: Source.Location,
      readonly operator: BinaryOperator,
      readonly lhs: Identifier,
      readonly rhs: Identifier
    ) {
      super();
    }
  }

  export class MemberAccess extends Node {
    constructor(
      readonly location: Source.Location,
      readonly base: MemberAccess | Identifier,
      readonly member: Identifier
    ) {
      super();
    }
  }
}
