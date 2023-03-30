import { EndpointHelper } from '../../../src';
import { AdSetsStub } from '../support/ad-sets.stub';

describe('Features', () => {
  const stub = new AdSetsStub().init();
  const getById = stub.endpoints.getById;

  it('should support cy.wait with a number', () => {
    cy.wait(3000);
  });

  it('should FAIL when request is not awaited', () => {
    EndpointHelper.stub(getById.defaultConfig());

    // Act
    cy.visit('http://localhost:4200');

    // Assert
    cy.get('h1').contains('This is my ad set');
  });
});
