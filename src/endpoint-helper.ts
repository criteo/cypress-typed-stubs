import { GenericStaticResponse, HttpRequestInterceptor } from 'cypress/types/net-stubbing';
import { AbstractEndpoint } from './endpoint';
import { AddRequestedUrl } from './request-manager';
import { RouteConfig } from './routing';
import Chainable = Cypress.Chainable;

/**
 * Helper class to help using the endpoints with Cypress
 */
export class EndpointHelper {
  /**
   * Intercept an endpoint
   * @param routeConfig
   */
  static stub<OUT>(routeConfig: RouteConfig<OUT>): void {
    const { route } = routeConfig;
    const interceptor: HttpRequestInterceptor = (req) => {
      AddRequestedUrl(routeConfig.name);
      const response: GenericStaticResponse<string, OUT> = {
        body: route.response,
        statusCode: route.status,
        headers: {
          ...route.headers,
          'content-type': 'application/json',
        },
      };
      if (route.onResponse) {
        req.on('response', (res) => route.onResponse?.(res.body));
      }
      req.reply(response);
    };
    cy.intercept(route.method, route.url, interceptor).as(routeConfig.name);
  }

  /**
   * Intercept a list of endpoints
   * @param routeConfigs
   */
  static stubMany(routeConfigs: RouteConfig<unknown>[]): void {
    routeConfigs.forEach(EndpointHelper.stub);
  }

  /**
   * Simply "watch" an endpoint without stubbing the response
   * @param config
   */
  static spy({ route, name }: RouteConfig<unknown>): void {
    cy.intercept(route.method, route.url).as(name);
  }

  /**
   * Simply "watch" endpoints without stubbing the response
   * @param spiesArray
   */
  static spyMany(spiesArray: RouteConfig<unknown>[]): void {
    spiesArray.forEach((config) => this.spy(config));
  }

  /**
   * Wait for a call and verify the request payload
   * @param endpoint
   * @param expectedRequest
   */
  static waitForCallAndCheck<RequestBody>(
    endpoint: AbstractEndpoint<unknown[], unknown>,
    expectedRequest: Partial<RequestBody>
  ): Chainable {
    return cy
      .wait(endpoint.alias)
      .its('request.body')
      .then((reqBody: RequestBody) => {
        for (const key in expectedRequest) {
          // eslint-disable-next-line no-prototype-builtins
          if (expectedRequest.hasOwnProperty(key)) {
            expect(reqBody[key]).to.eql(expectedRequest[key]);
          }
        }
      });
  }

  /**
   * Wait for a call and assert on the request payload
   * @param endpoint
   * @param assertion
   */
  static waitForCallAndAssert<RequestBody>(
    endpoint: AbstractEndpoint<unknown[], unknown>,
    assertion: (requestBody: RequestBody) => boolean
  ): Chainable {
    return cy
      .wait(endpoint.alias)
      .its('request.body')
      .then((reqBody: RequestBody) => {
        assert.isTrue(assertion(reqBody));
      });
  }
}
