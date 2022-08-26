import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AbstractEndpoint, Endpoint } from './endpoint';
import { Headers, RouteConfig } from './routing';
import { SpyHttpClient } from './spy-http-client';

/**
 * A client with a list of endpoints.
 * Can be used to implement your own specific client that is not based on a generated client.
 */
export abstract class AbstractClientStub {
  // AbstractEndpoint<never, unknown> needed for endpoints without parameter
  abstract endpoints: {
    [endpointName: string]: AbstractEndpoint<unknown[], unknown> | AbstractEndpoint<never, unknown>;
  };

  protected constructor(public name: string) {}

  /**
   * Automatically affect the name of each endpoint
   */
  init(): this {
    Object.keys(this.endpoints).forEach((endpointName) => (this.endpoints[endpointName].endpointName = endpointName));
    return this;
  }

  get allDefaultConfigs(): RouteConfig<unknown>[] {
    return Object.values(this.endpoints).map((r) => r.defaultConfig());
  }
}

/**
 * A client with endpoints based on generated client's endpoints
 */
export abstract class ClientStub<C> extends AbstractClientStub {
  protected readonly spyHttpClient = new SpyHttpClient();
  protected readonly client: C;

  protected constructor(clientConstructor: new (http: HttpClient, baseUrl?: string) => C) {
    super(clientConstructor.name);
    this.client = new clientConstructor(this.spyHttpClient as unknown as HttpClient);
  }

  protected createEndpoint<IN extends unknown[], OUT>(
    actualEndpoint: (...otherParams: IN) => Observable<OUT>,
    status: number,
    fixture: OUT,
    headers: Headers = {}
  ): Endpoint<C, IN, OUT> {
    return new Endpoint(this.spyHttpClient, this.client, actualEndpoint, this.name, status, fixture, headers);
  }
}
