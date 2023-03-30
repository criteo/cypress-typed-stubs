import { HttpClient, HttpEvent, HttpHandler, HttpResponse } from '@angular/common/http';
import { isString } from 'lodash';
import { Observable, of } from 'rxjs';
import { Method, Route, RouteWithOriginalUrl } from './routing';

class EmptyHttpHandler extends HttpHandler {
  handle(): Observable<HttpEvent<unknown>> {
    return of(new HttpResponse());
  }
}

export function urlRegex(urlForRegexp: string): RegExp {
  return new RegExp(`^${urlForRegexp}$`.replace(/\//g, '\\/'));
}

/**
 * Fake HttpClient to spy on caller and get URL that is called on request
 */
export class SpyHttpClient extends HttpClient {
  static readonly placeholders: { [placeholder: string]: string } = {};
  lastRequestedRoute!: RouteWithOriginalUrl;

  // Optional modifier of the input URL
  urlModifier: (url: string) => string | RegExp = (url) => url;

  constructor() {
    super(new EmptyHttpHandler());
  }

  /**
   * Instead of executing the request, will detect the URL and store it
   * @param method
   * @param url
   */
  // TODO for some reason I don't manage to find the right parent signature to override
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  request(method: Method, url: string): Observable<HttpResponse<unknown>> {
    const originalUrl = url;

    // Potential adaptation of the URL
    let modifiedUrl = this.urlModifier(url);

    const newRoute: Route = { url: modifiedUrl, method };

    if (isString(modifiedUrl)) {
      let foundMatch = false;

      // Ignore the URL params in the matching pattern ("/foo?bar=baz" and "/foo?qux=baz" is actually the same endpoint)
      const paramsIndex = modifiedUrl.indexOf('?');
      if (paramsIndex !== -1) {
        modifiedUrl = `${modifiedUrl.substring(0, paramsIndex)}(.*)`;
        foundMatch = true;
      }

      let urlForRegexp = modifiedUrl;

      // If any placeholder has been injected, that means a parameter value from the client endpoint
      // has been replaced in the URL. In other words, we need a regexp and we need to replace the placeholders
      // back with their original "parameter name" (ex: XXXADVERTISERIDXXX => advertiserId)
      Object.keys(SpyHttpClient.placeholders).forEach((capture) => {
        if (new RegExp(`${capture}`).test(modifiedUrl as string)) {
          foundMatch = true;

          // Named groups ar not working on some browsers, see https://stackoverflow.com/questions/5367369/named-capturing-groups-in-javascript-regex
          // urlForRegexp = urlForRegexp.replace(capture, `(?<${HttpClientSpy.placeholders[capture]}>[^?#/]+)`);

          urlForRegexp = urlForRegexp.replace(capture, '([^?#/]+)');
        }
      });

      if (foundMatch) {
        newRoute.url = urlRegex(urlForRegexp);
      }
    }

    this.lastRequestedRoute = { ...newRoute, _originalUrlForSmokeJS: originalUrl };

    return of(new HttpResponse());
  }

  static addPlaceholder(paramName: string): string {
    const placeholder = `XXX${paramName.toUpperCase()}XXX`;
    SpyHttpClient.placeholders[placeholder] = paramName;
    return placeholder;
  }

  /**
   * Get the "placeholder" for a specific parameter.
   * Example: "advertiserId" => "XXXADVERTISERIDXXX"
   * @param paramName
   */
  static getParameterPlaceholder(paramName: string): string {
    const flipped = Object.entries(this.placeholders).reduce(
      (obj, [key, value]) => ({
        ...obj,
        [value]: key,
      }),
      {}
    ) as { [paramName: string]: string };
    return flipped[paramName];
  }
}
