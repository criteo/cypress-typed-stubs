import { cloneDeep } from 'lodash';
import { Observable } from 'rxjs';
import { Headers, Method, RouteConfig } from './routing';
import { SpyHttpClient } from './spy-http-client';
import { CyHttpMessages } from 'cypress/types/net-stubbing';

/**
 * An endpoint definition with methods to get route config and alias
 * IN: endpoint input parameters
 * OUT: endpoint response
 */
export abstract class AbstractEndpoint<IN extends unknown[], OUT> {
  abstract defaultConfig(...params: IN): RouteConfig<OUT>;

  endpointName!: string;

  protected constructor(private readonly parentName: string, protected headers: Headers = {}) {}

  get routeName(): string {
    return `${this.parentName}#${this.endpointName}`;
  }

  get alias(): string {
    return '@' + this.routeName;
  }

  /**
   * Prepare the fixture or fixture builder to build the route config.
   *
   * In the case of a fixture object, it clones it.
   * In the case of a function (i.e. fixture builder), it doesn't do anything.
   * @param fixtureOrFixtureBuilder
   * @private
   */
  protected prepareFixtureOrFixtureBuilder(fixtureOrFixtureBuilder: OUT | ((req: CyHttpMessages.IncomingHttpRequest) => OUT)): OUT | ((req: CyHttpMessages.IncomingHttpRequest) => OUT) {
    // In the case of a function (i.e. fixture builder),
    // we cannot clone it (cloning a function returns an empty object)
    if (fixtureOrFixtureBuilder instanceof Function) {
      return fixtureOrFixtureBuilder;
    }

    // In the case of a fixture object, make sure each call to RouteConfig is "pure",
    // in the sense each call to defaultConfig always returns the original fixture,
    // not one that has been modified by a previous call (if it were using the same reference).
    return cloneDeep(fixtureOrFixtureBuilder);
  }
}

/**
 * Endpoint based on a generated client endpoint
 */
export class Endpoint<C, IN extends unknown[], OUT> extends AbstractEndpoint<IN, OUT> {
  private static readonly STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
  private static readonly ARGUMENT_NAMES = /([^\s,]+)/g;

  // Optional modifier of the input URL
  private urlModifier: (url: string) => string | RegExp = (url) => url;

  /**
   * Inject an optional url modifier
   * @param urlModifier
   */
  withUrlModifier(urlModifier: (url: string) => string | RegExp): this {
    this.urlModifier = urlModifier;

    return this;
  }

  /**
   * Get the list of parameter names from a function. Used when introspecting generated client's endpoint method
   * @param func
   * @private
   */
  private getParamNames(func: (...t: IN) => unknown) {
    const fnStr = func.toString().replace(Endpoint.STRIP_COMMENTS, '');
    let result: string[] | null = fnStr
      .slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
      .match(Endpoint.ARGUMENT_NAMES);
    if (result === null) {
      result = [];
    }
    return result;
  }

  constructor(
    private readonly spyHttpClient: SpyHttpClient,
    private readonly actualClient: C,
    private readonly actualEndpoint: (...params: IN) => Observable<OUT>,
    parentName: string,
    public statusCode: number,
    public fixtureOrFixtureBuilder: OUT | ((req: CyHttpMessages.IncomingHttpRequest) => OUT),
    headers: Headers = {}
  ) {
    super(parentName, headers);
  }

  /**
   * Get the fixture object (if endpoint was stubbed with a fixture),
   * or throw an error (if endpoint was stubbed with a fixture builder function)
   */
  public get fixture(): OUT {
    if (this.fixtureOrFixtureBuilder instanceof Function) {
      throw new TypeError('Cannot get fixture, endpoint was stubbed with a fixture builder function');
    } else {
      return this.fixtureOrFixtureBuilder;
    }
  }

  /**
   * Get the fixture builder function (if endpoint was stubbed with a fixture builder),
   * or throw an error (if endpoint was stubbed with a fixture object)
   */
  public get fixtureBuilder(): (req: CyHttpMessages.IncomingHttpRequest) => OUT {
    if (this.fixtureOrFixtureBuilder instanceof Function) {
      return this.fixtureOrFixtureBuilder;
    } else {
      throw new TypeError('Cannot get fixture builder, endpoint was stubbed with a fixture object');
    }
  }

  defaultConfig(...userParams: Partial<IN> | []): RouteConfig<OUT> {
    // Inject url modifier if needed
    this.spyHttpClient.urlModifier = this.urlModifier;

    const expectedParams = this.getParamNames(this.actualEndpoint);

    // Use provided params in priority
    const params = expectedParams.map((paramName, index: number) => {
      let paramPlaceholder: string;
      if (userParams[index]) {
        paramPlaceholder = userParams[index] as string;
      } else {
        paramPlaceholder = SpyHttpClient.addPlaceholder(paramName);
      }

      // If any expected param is an array convert the placeholder to an array
      const isParamArray = new RegExp(`${paramName}\\.forEach`);
      if (this.actualEndpoint.toString().match(isParamArray)) {
        return [paramPlaceholder];
      }
      return paramPlaceholder;
    }) as IN;

    try {
      this.actualEndpoint.call(this.actualClient, ...params);
    } catch (e) {
      // This happens in particular on CampaignBidStrategyClient.getRecommendations that expects an array of ids
      // For the moment the easy fix is to not try to provide params...
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: Not providing any params to the endpoint
      this.actualEndpoint.call(this.actualClient);
    }

    const { url, method, _originalUrlForSmokeJS } = this.spyHttpClient.lastRequestedRoute;

    return new RouteConfig(
      this.routeName,
      method,
      url,
      _originalUrlForSmokeJS,
      this.statusCode,
      this.prepareFixtureOrFixtureBuilder(this.fixtureOrFixtureBuilder),
      this.headers
    );
  }
}

/**
 * Endpoint configured manually, not based on a generated client
 */
export class ManualEndpoint<IN extends unknown[], OUT> extends AbstractEndpoint<IN, OUT> {
  method: Method;

  url: string | RegExp;

  originalUrlForSmokeJS: string;

  statusCode: number;

  fixtureOrFixtureBuilder: OUT | ((req: CyHttpMessages.IncomingHttpRequest) => OUT);

  constructor(
    parentName: string,
    method: Method,
    url: string | RegExp,
    originalUrlForSmokeJS: string,
    statusCode: number,
    fixtureOrFixtureBuilder: OUT | ((req: CyHttpMessages.IncomingHttpRequest) => OUT),
    headers: Headers = {}
  ) {
    super(parentName, headers);
    this.method = method;
    this.url = url;
    this.originalUrlForSmokeJS = originalUrlForSmokeJS;
    this.statusCode = statusCode;
    this.fixtureOrFixtureBuilder = fixtureOrFixtureBuilder;
  }

  /**
   * Get the fixture (if endpoint was stubbed with a fixture object),
   * or throw an error (if endpoint was stubbed with a fixture builder function)
   */
  public get fixture(): OUT {
    if (this.fixtureOrFixtureBuilder instanceof Function) {
      throw new TypeError('Cannot get fixture, endpoint was stubbed with a fixture builder function');
    } else {
      return this.fixtureOrFixtureBuilder;
    }
  }

  /**
   * Get the fixture builder (if endpoint was stubbed with a fixture builder function),
   * or throw an error (if endpoint was stubbed with a fixture object)
   */
  public get fixtureBuilder(): (req: CyHttpMessages.IncomingHttpRequest) => OUT {
    if (this.fixtureOrFixtureBuilder instanceof Function) {
      return this.fixtureOrFixtureBuilder;
    } else {
      throw new TypeError('Cannot get fixture builder, endpoint was stubbed with a fixture object');
    }
  }

  defaultConfig(): RouteConfig<OUT> {
    return new RouteConfig<OUT>(
      this.routeName,
      this.method,
      this.url,
      this.originalUrlForSmokeJS,
      this.statusCode,
      this.prepareFixtureOrFixtureBuilder(this.fixtureOrFixtureBuilder),
      this.headers
    );
  }
}
