namespace Q.Utils {
  /**
   * Set the content for the file handler.
   *
   * @param content The file content.
   */
  export function SetSingleFileHandler(content: string) {
    Q.System.setIOHandler(
      new (class SingleContentHandler extends Q.System.IOHandlerBase {
        async read() {
          return content;
        }
      })()
    );
  }

  /**
   * Reset the compiler.
   */
  export function reset() {
    Q.Source.Graph.reset();
    Q.System.resetIOHandler();
  }
}
