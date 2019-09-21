namespace Q.Source {
  /**
   * A source file containing the parser generator's source.
   */
  export class File {
    /**
     * Cache of the resolved content.
     */
    private contentCache: string | undefined;

    /**
     * Cache of the lines.
     */
    private linesCache: string[] | undefined;

    /**
     * Cache of the line map used in lookupLineNumberAndColumn.
     */
    private lineLengthMapCache: number[] | undefined;

    /**
     * Cache of `.parse()`.
     */
    private parseInfo: Parser.ParsedInfo | undefined;

    /**
     * The last token list used for the current file.
     */
    private tokenList: Scanner.StaticTokenListEntity | undefined;

    /**
     * Invalidate the cache.
     */
    resetCache() {
      this.lineLengthMapCache = undefined;
      this.linesCache = undefined;
      this.contentCache = undefined;
      this.parseInfo = undefined;
    }

    /**
     * Apply an edit to the current content.
     *
     * @param start Start position.
     * @param end End position.
     * @param text The new text to be put in the given area.
     */
    edit(start: number, end: number, text: string): void {
      const content = this.contentCache!;
      const parseInfo = this.parseInfo;
      this.resetCache();
      const before = content.slice(0, start);
      const after = content.slice(end);
      this.contentCache = before + text + after;
      // TODO(qti3e)
      // if (!parseInfo) return;
      // const newEnd = end + (text.length - (end - start));
      // const editInfo = Scanner.applyEdit(this.tokenList!, start, end, newEnd);
    }

    /**
     * Parse the current file.
     */
    async parse(): Promise<AST.Source> {
      if (!this.parseInfo) {
        await this.getContent();
        const stream = new Scanner.TokenStream(this);
        this.tokenList = Scanner.toStaticLinkedList(stream);
        this.parseInfo = Parser.parse(this.tokenList);
      }
      return this.parseInfo.AST;
    }

    /**
     * Return list of all the parse errors in this document.
     */
    getParseErrors() {
      if (!this.parseInfo) return [];

      const errors: Errors.ParseError[] = [];
      for (const node of this.parseInfo.AST) {
        errors.push(...node.diagnostics);
      }
      return errors;
    }

    /**
     * Whatever this source file has any error or not.
     */
    get hasError() {
      return this.getParseErrors.length > 0;
    }

    /**
     * Constructs a new source file.
     *
     * @param path Path to the file - must be resolvable by our System I/O API.
     */
    constructor(readonly path: string) {}

    /**
     * Resolves the content of the current source object.
     */
    async getContent() {
      if (this.contentCache) return this.contentCache;
      return (this.contentCache = await System.IOHandler.read(this.path));
    }

    /**
     * Returns the content of the current source sync.
     *
     * @Note Currently the content must be loaded with getContent call first.
     * @returns {string} The content representing this source file.
     */
    getContentSync(): string {
      if (!this.contentCache) throw new Error("Source content is not loaded.");
      return this.contentCache;
    }

    /**
     * Get an array of lines, it uses `getContentSync` to resolve the content.
     *
     * @returns {string[]} An array representing each line in the document.
     */
    getLinesSync(): string[] {
      if (this.linesCache) return this.linesCache.slice();
      this.linesCache = this.getContentSync().match(/.*(\r?\n)?/g)!;
      this.linesCache.pop();
      return this.linesCache.slice();
    }

    /**
     * Returns an array of lines in the document.
     */
    async getLines(): Promise<string[]> {
      await this.getContent();
      return this.getLinesSync();
    }

    /**
     * Resolve the line number and column at the given position. (all starting from one)
     *
     * @param position Cursor index in the document.
     * @returns {[number, number]} Returns the tuple `[line, column]`.
     */
    lookupLineNumberAndColumn(position: number): [number, number] {
      if (!this.lineLengthMapCache) {
        const map: number[] = [];
        let current = 0;
        const lines = this.getLinesSync();
        for (const line of lines) {
          map.push(current);
          current += line.length;
        }
        this.lineLengthMapCache = map;
      }

      const map = this.lineLengthMapCache!;
      let index = (map.length / 2) | 0;
      let step = (map.length / 4) | 0;

      while (index < map.length) {
        if (map[index] > position) {
          index -= step;
        } else {
          if (map[index + 1] > position) {
            return [index + 1, position - map[index] + 1];
          }
          index += step;
        }
        step = (step / 2) | 0 || 1;
      }

      return [index, position - map[map.length - 1] + 1];
    }

    /**
     * Returns the EOF position.
     */
    getEOF(): Position {
      const { length } = this.getContentSync();
      return new Position(this, length);
    }
  }

  /**
   * A location object represents a location at one specific source file.
   */
  export class Position {
    /**
     * Cache of the `lookupLineNumberAndColumn` call with this location's position.
     */
    private locationCache?: [number, number];

    /**
     * Constructs a new Location object from a source file and a position.
     *
     * @param source The source file containing this location.
     * @param position Cursor position of the current location in the source file.
     */
    constructor(readonly source: File, readonly position: number) {}

    /**
     * Returns the path to the current location's source file.
     */
    get path(): string {
      return this.source.path;
    }

    /**
     * Line number of the current location in the source file.
     */
    get lineNumber(): number {
      if (!this.locationCache)
        this.locationCache = this.source.lookupLineNumberAndColumn(
          this.position
        );
      return this.locationCache[0];
    }

    /**
     * Column number of the current location in the source file.
     */
    get column(): number {
      if (!this.locationCache)
        this.locationCache = this.source.lookupLineNumberAndColumn(
          this.position
        );
      return this.locationCache[1];
    }

    /**
     * Return the line from source for he current position.
     */
    getLine(): string {
      const lineNo = this.lineNumber;
      return this.source.getLinesSync()[lineNo - 1].trimRight();
    }

    /**
     * Returns a string in the path:line:col format.
     */
    getUri(): string {
      return `${this.path}:${this.lineNumber}:${this.column}`;
    }

    /**
     * Adds the given number to the current position returning a new one.
     *
     * @param count The number to be added to the current position.
     */
    add(count: number) {
      if (count === 0) return this;
      return new Position(this.source, this.position + count);
    }
  }

  /**
   * An area in the source file.
   */
  export interface Location {
    /**
     * Starting position (inclusive)
     */
    start: Position;

    /**
     * End position (inclusive)
     */
    end: Position;
  }
}

/**
 * The source graph.
 */
namespace Q.Source.Graph {
  /**
   * Map each path to the respective File.
   */
  const fileMap = new Map<string, File>();

  /**
   * Returns the file from the given path either from the map or creates a
   * new entity.
   *
   * @param path Path to the file.
   */
  export function getFile(path: string): File {
    let value: File | undefined;
    if ((value = fileMap.get(path))) return value;
    value = new File(path);
    fileMap.set(path, value);
    return value;
  }

  /**
   * Return a list containing all of the files which are loaded into the
   * Source Graph.
   */
  export function getFiles(): File[] {
    return Array.from(fileMap.values());
  }

  /**
   * Reset the source graph.
   */
  export function reset(): void {
    fileMap.clear();
  }
}
