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

    constructor(public expression: Expression) {
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
      public name: Identifier,
      public parameters: Parameter[],
      public body: Statement[]
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
      public name: Identifier,
      public type: TypeRef
    ) {
      super();
    }

    getChildren() {
      return [this.name, this.type];
    }
  }

  export class NumericLiteral extends Node {
    constructor(readonly location: Source.Location, public value: number) {
      super();
    }

    getChildren() {
      return [];
    }
  }

  export class Identifier extends Node {
    constructor(readonly location: Source.Location, public name: string) {
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
      public operator: BinaryOperator,
      public lhs: Identifier,
      public rhs: Identifier
    ) {
      super();
    }

    getChildren() {
      return [this.lhs, this.rhs];
    }
  }

  export class MemberAccess extends Node {
    constructor(
      public location: Source.Location,
      public base: MemberAccess | Identifier,
      public member: Identifier
    ) {
      super();
    }

    getChildren() {
      return [this.base, this.member];
    }
  }
}
