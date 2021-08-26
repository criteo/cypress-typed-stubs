import { cloneDeep } from 'lodash';

/**
 * Copied from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/methods/index.d.ts
 * Keeping only the lowercase versions
 */
export type Method =
  | 'acl'
  | 'bind'
  | 'checkout'
  | 'connect'
  | 'copy'
  | 'delete'
  | 'get'
  | 'head'
  | 'link'
  | 'lock'
  | 'm-search'
  | 'merge'
  | 'mkactivity'
  | 'mkcalendar'
  | 'mkcol'
  | 'move'
  | 'notify'
  | 'options'
  | 'patch'
  | 'post'
  | 'propfind'
  | 'proppatch'
  | 'purge'
  | 'put'
  | 'rebind'
  | 'report'
  | 'search'
  | 'source'
  | 'subscribe'
  | 'trace'
  | 'unbind'
  | 'unlink'
  | 'unlock'
  | 'unsubscribe';

export type Headers = { [key: string]: string };

/**
 * A route == an HTTP method and a URL.
 * Copied from Cypress.RouteOptions
 */
export interface Route {
  method: Method;
  url: string | RegExp;
}

/**
 * This specific overload is used when generating JSON fixtures with SmokeJS
 */
export interface RouteWithOriginalUrl extends Route {
  // Used to keep track for smoke.js fixtures
  _originalUrlForSmokeJS: string;
}

/**
 * A route with a stubbed response
 */
export interface StubbedRoute<OUT> extends Route {
  response: OUT;
  status: number;
  onResponse?: (body: unknown) => void;
  headers?: Headers;
}

export class RouteConfig<OUT> {
  constructor(
    public name: string,
    readonly method: Method,
    readonly url: string | RegExp,
    // Used to keep track for smokejs fixtures
    public _originalUrlForSmokeJS: string,
    private status: number,
    private _fixture: OUT,
    private headers: Headers = {}
  ) {}

  get route(): StubbedRoute<OUT> {
    // Important to return something if fixture is null, otherwise will be seen as not-stubbed!
    const emptyResponse = {};
    const fixture = this._fixture !== null ? this._fixture : (emptyResponse as OUT);

    return {
      url: this.url,
      method: this.method,
      status: this.status,
      headers: this.headers,
      response: fixture,
      onResponse: (body: unknown) => {
        const logRequest = (parsedBody: unknown) => {
          // eslint-disable-next-line no-console
          console.debug(`${this.name}:`);
          // eslint-disable-next-line no-console
          console.debug(parsedBody);
        };

        // Present request as JSON if possible
        if (body && body instanceof Blob) {
          if (body.size === 0) {
            logRequest(null);
          } else {
            const fileReader = new FileReader();
            fileReader.onload = (event) => {
              logRequest(JSON.parse(event.target?.result as string));
            };
            fileReader.readAsText(body);
          }
        } else {
          logRequest(body);
        }
      },
    };
  }

  /**
   * Simple route used to spy, not for stubbing
   */
  get routeWithoutStub(): Route {
    return {
      url: this.url,
      method: this.method,
    };
  }

  /**
   * Alias used to wait on the route
   */
  get alias(): string {
    return '@' + this.name;
  }

  /**
   * Return a copy of the fixture
   */
  get fixture(): OUT {
    return cloneDeep(this._fixture);
  }

  /**
   * Override the HTTP status code returned by the endpoint
   * @param code
   */
  withStatusCode(code: number): this {
    this.status = code;

    return this;
  }

  /**
   * Override the initial fixture
   * @param override
   */
  withOverride(override: Partial<OUT>): this {
    this._fixture = RouteConfig.mergeFixtures(this._fixture, override);

    return this;
  }

  /**
   * Set specific HTTP headers to be returned with the response
   * @param headers
   */
  withHeaders(headers: Headers): this {
    this.headers = { ...headers };

    return this;
  }

  /**
   * Map the existing fixture to something different
   * @param mapper the mapping function
   */
  mappingFixture(mapper: (fixture: OUT) => OUT): this {
    this._fixture = mapper(this._fixture);

    return this;
  }

  static mergeFixtures<T>(fixture1: T, fixture2: Partial<T> | null): T {
    if (typeof fixture1 === 'object' && !Array.isArray(fixture1)) {
      return {
        ...fixture1,
        ...fixture2,
      };
    } else {
      // This is to support scalar fixtures (ex: boolean in hasDataSharingEnabled)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return fixture2 !== null ? fixture2 : fixture1;
    }
  }
}
