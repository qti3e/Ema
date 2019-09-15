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
      this.linesCache = this.getContentSync().split(/\r?\n/g);
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
      if (position === 0) return [1, 1];
      if (position < 0) return [0, 0];

      const lines = this.getLinesSync();
      let currentLineIndex = 0;
      let len = 0;

      if (position > this.contentCache!.length)
        throw new Error("Source offset out of range.");

      while (position > (len = lines[currentLineIndex++].length))
        position -= len;

      return [currentLineIndex + 1, position + 1];
    }
  }

  /**
   * A location object represents a location at one specific source file.
   */
  export class Location {
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
    let value: File;
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
}
