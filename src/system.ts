namespace Q.System {
  /**
   * Base class for an IOHandler.
   */
  export abstract class IOHandlerBase {
    /**
     * Reads data from the given path and returns a string.
     *
     * @param path Path to the file which you want its content.
     */
    abstract read(path: string): Promise<string>;
  }

  /**
   * Current active IOHandler for the system.
   */
  export declare const IOHandler: IOHandlerBase;

  /**
   * Set the current active IOHandler.
   *
   * @param handler A valid IOHandler
   */
  export function setIOHandler(handler: IOHandlerBase): void {
    if (!(handler instanceof IOHandlerBase))
      throw new Error("An IO handler was expected.");
    Object.defineProperty(Q.System, "IOHandler", {
      value: handler,
      configurable: true,
      writable: false,
      enumerable: true
    });
  }

  // Set the default value for IOHandler - it only throws an error.
  Object.defineProperty(Q.System, "IOHandler", {
    get() {
      throw new Error("Current IO handler is not registered yet.");
    },
    configurable: true,
    enumerable: true
  });
}
