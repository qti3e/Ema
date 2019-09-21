namespace Q.AST {
  export type Source = Declaration[];
  export type Declaration = FunctionDeclaration;
  export type Statement = ExpressionStatement;
  export type Expression = Identifier | NumericLiteral | MemberAccess;
  export type TypeRef = Identifier | MemberAccess;

  export abstract class Node {
    abstract readonly location: Source.Location;
    parent: Node | null = null;
    readonly diagnostics: Errors.ParseError[] = [];

    getAllDiagnostics(): Errors.ParseError[] {
      const errors = this.diagnostics.slice();
      for (const node of this.getChildren()) {
        errors.push(...node.getAllDiagnostics());
      }
      return errors;
    }

    abstract getChildren(): AST.Node[];
  }

  export class ExpressionStatement extends Node {
    readonly location: Source.Location;

    constructor(readonly expression: Expression) {
      super();
      this.location = expression.location;
    }

    getChildren() {
      return [this.expression];
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

    getChildren() {
      return [this.name, ...this.parameters, ...this.body];
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

    getChildren() {
      return [this.name, this.type];
    }
  }

  export class NumericLiteral extends Node {
    constructor(readonly location: Source.Location, readonly value: number) {
      super();
    }

    getChildren() {
      return [];
    }
  }

  export class Identifier extends Node {
    constructor(readonly location: Source.Location, readonly name: string) {
      super();
    }

    getChildren() {
      return [];
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

    getChildren() {
      return [this.lhs, this.rhs];
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

    getChildren() {
      return [this.base, this.member];
    }
  }
}
