import { test, assertEqual, assert } from "liltest";
import Q from "../Q";

test(async function parser() {
  Q.Utils.reset();
  Q.Utils.SetSingleFileHandler(`
func a()

func b(X, Y)
  `);

  const source = Q.Source.Graph.getFile("./main.ema");
  const AST = await source.parse();

  assertEqual(AST.length, 2);

  assert(AST[0] instanceof Q.AST.FunctionDeclaration);
  assert(AST[1] instanceof Q.AST.FunctionDeclaration);

  assertEqual(AST[0].name.name, "a");
  assertEqual(AST[1].name.name, "b");

  assertEqual(AST[0].parameters.length, 0);
  assertEqual(AST[1].parameters.length, 2);

  assert(AST[1].parameters[0] instanceof Q.AST.Parameter);
  assert(AST[1].parameters[1] instanceof Q.AST.Parameter);

  assertEqual(AST[1].parameters[0].name.name, "X");
  assertEqual(AST[1].parameters[1].name.name, "Y");
});
