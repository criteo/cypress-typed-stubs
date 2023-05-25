import { cloneDeep } from 'lodash';
import { Observable } from 'rxjs';
import { Headers, Method, RouteConfig } from './routing';
import { SpyHttpClient } from './spy-http-client';

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
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(Endpoint.ARGUMENT_NAMES);
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
    public fixture: OUT,
    headers: Headers = {}
  ) {
    super(parentName, headers);
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
      // Make sure each call to RouteConfig is "pure"
      // in the sense each call to defaultConfig always return the original fixture,
      // not one that has been modified by a previous call (if it were using the same reference)
      cloneDeep(this.fixture),
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

  fixture: OUT;

  constructor(
    parentName: string,
    method: Method,
    url: string | RegExp,
    originalUrlForSmokeJS: string,
    statusCode: number,
    fixture: OUT,
    headers: Headers = {}
  ) {
    super(parentName, headers);
    this.method = method;
    this.url = url;
    this.originalUrlForSmokeJS = originalUrlForSmokeJS;
    this.statusCode = statusCode;
    this.fixture = fixture;
  }

  defaultConfig(): RouteConfig<OUT> {
    return new RouteConfig<OUT>(
      this.routeName,
      this.method,
      this.url,
      this.originalUrlForSmokeJS,
      this.statusCode,
      // Make sure each call to RouteConfig is "pure"
      // in the sense each call to defaultConfig always return the original fixture,
      // not one that has been modified by a previous call (if it were using the same reference)
      cloneDeep(this.fixture),
      this.headers
    );
  }
}
