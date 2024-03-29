import { CyHttpMessages } from 'cypress/types/net-stubbing';
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
  responseOrResponseBuilder: OUT | ((req: CyHttpMessages.IncomingHttpRequest) => OUT);
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
    private _fixtureOrFixtureBuilder: OUT | ((req: CyHttpMessages.IncomingHttpRequest) => OUT),
    private headers: Headers = {}
  ) {}

  get route(): StubbedRoute<OUT> {
    // Important to return something if fixture (or fixture builder) is null, otherwise will be seen as not-stubbed!
    const emptyResponse = {};
    const fixtureOrFixtureBuilder =
      this._fixtureOrFixtureBuilder !== null ? this._fixtureOrFixtureBuilder : (emptyResponse as OUT);

    return {
      url: this.url,
      method: this.method,
      status: this.status,
      headers: this.headers,
      responseOrResponseBuilder: fixtureOrFixtureBuilder,
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
   * Return a copy of the fixture, or the fixture builder
   */
  public get fixtureOrFixtureBuilder(): OUT | ((req: CyHttpMessages.IncomingHttpRequest) => OUT) {
    if (this._fixtureOrFixtureBuilder instanceof Function) {
      return this._fixtureOrFixtureBuilder;
    }
    return cloneDeep(this._fixtureOrFixtureBuilder);
  }

  /**
   * Return a copy of the fixture (if endpoint was stubbed with a fixture object),
   * or throw an error (if endpoint was stubbed with a fixture builder function)
   */
  public get fixture(): OUT {
    if (this._fixtureOrFixtureBuilder instanceof Function) {
      throw new TypeError('Cannot get fixture, endpoint was stubbed with a fixture builder function');
    } else {
      return cloneDeep(this._fixtureOrFixtureBuilder);
    }
  }

  /**
   * Get the fixture builder (if endpoint was stubbed with a fixture builder function),
   * or throw an error (if endpoint was stubbed with a fixture object)
   */
  public get fixtureBuilder(): (req: CyHttpMessages.IncomingHttpRequest) => OUT {
    if (this._fixtureOrFixtureBuilder instanceof Function) {
      return this._fixtureOrFixtureBuilder;
    } else {
      throw new TypeError('Cannot get fixture builder, endpoint was stubbed with a fixture object');
    }
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
   * Override the initial fixture.
   *
   * If a fixture builder was provided, a new fixture builder function is created
   * that calls the initial fixture builder and then merges the result with the override.
   * @param override the override object (a partial fixture)
   */
  withOverride(override: Partial<OUT>): this {
    if (this._fixtureOrFixtureBuilder instanceof Function) {
      const fixtureBuilder = this._fixtureOrFixtureBuilder;
      this._fixtureOrFixtureBuilder = (req: CyHttpMessages.IncomingHttpRequest) => {
        return RouteConfig.mergeFixtures(fixtureBuilder(req), override);
      };
    } else {
      this._fixtureOrFixtureBuilder = RouteConfig.mergeFixtures(this._fixtureOrFixtureBuilder, override);
    }
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
   * Map the existing fixture to something different.
   *
   * If a fixture builder was provided, a new fixture builder function is created
   * that calls the initial fixture builder and then maps the result with the provided mapper.
   * @param mapper the mapping function
   */
  mappingFixture(mapper: (fixture: OUT) => OUT): this {
    if (this._fixtureOrFixtureBuilder instanceof Function) {
      const fixtureBuilder = this._fixtureOrFixtureBuilder;
      this._fixtureOrFixtureBuilder = (req: CyHttpMessages.IncomingHttpRequest) => {
        return mapper(fixtureBuilder(req));
      };
    } else {
      this._fixtureOrFixtureBuilder = mapper(this._fixtureOrFixtureBuilder);
    }
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
