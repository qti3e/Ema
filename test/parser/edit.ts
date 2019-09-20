import { test, assertEqual, assert } from "liltest";
import Q from "../Q";

test(async function editTokenList() {
  Q.Utils.reset();
  Q.Utils.SetSingleFileHandler(
    `
func a()

func b(X, Y)
`.trim()
  );

  const source = Q.Source.Graph.getFile("./main.ema");
  await source.getContent();

  const stream = new Q.Scanner.TokenStream(source);
  const tokens = Q.Scanner.toStaticLinkedList(stream);

  source.edit(6, 7, "z");
  const info = Q.Scanner.applyEdit(tokens, 6, 7, 7);

  assertEqual(info.editHead.asIdentifer()!.name, "z");
  assertEqual(info.numInserted, 1);
  assertEqual(info.delCount, 1);
  assert(info.editHead.next.isPunctuation("("));
  assert(info.editHead.prev!.isKeyword("func"));

  let ast = await source.parse();
  assertEqual(source.hasError, false);
  assertEqual(ast.length, 2);
  assert(ast[0] instanceof Q.AST.FunctionDeclaration);
  assert(ast[1] instanceof Q.AST.FunctionDeclaration);
  assertEqual(ast[0].name.name, "z");
  assertEqual(ast[1].name.name, "b");

  source.edit(7, 17, "");
  const info2 = Q.Scanner.applyEdit(tokens, 7, 17, 7);
  assert(info2.editHead.isPunctuation("("));
  assertEqual(info2.numInserted, 0);
  assertEqual(info2.delCount, 6);
  assertEqual(info2.editHead.prev!.asIdentifer()!.name, "z");

  ast = await source.parse();
  assertEqual(source.hasError, false);
  assertEqual(ast.length, 1);
  assert(ast[0] instanceof Q.AST.FunctionDeclaration);
  assertEqual(ast[0].name.name, "z");
  assertEqual(ast[0].parameters.length, 2)
});
