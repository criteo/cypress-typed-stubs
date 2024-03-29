import { EndpointHelper } from '../../../src';
import { AdSetsStub } from '../support/ad-sets.stub';

describe('Main Page (without the library)', () => {
  it('should display ad set', () => {
    // Prepare
    cy.intercept(
      'GET', // Need to know the HTTP method
      /.*\/campaign-api\/ad-sets\/.*/, // Need to "guess" the appropriate URL regex
      {
        // Need to maintain a JSON object that matches the proper interface
        adSet: {
          id: 5,
          partnerId: 5855,
          unrelatedProperty: 'abcd',
          name: 'This is my ad set',
          startDate: new Date('2020-10-20T22:08:46.683'),
          conflictDetectionToken: 1607941414927,
          // /!\ missing "status" property
          audienceType: 'invalid type', // No check on enum value
        },
      }
    ).as('getAdSet'); // Need to define a name that makes sense and that is reused throughout the tests

    // Act
    cy.visit('http://localhost:4200');
    cy.wait('@getAdSet'); // Need to hardcode the alias

    // Assert
    cy.get('h1').contains('This is my ad set');
  });

  it('should handle ad set not found', () => {
    // Prepare
    cy.intercept('GET', /.*\/campaign-api\/ad-sets\/.*/, {
      statusCode: 404,
      body: { this: 'is not checked' }, // No type checking
    }).as('getAdSet');

    // Act
    cy.visit('http://localhost:4200');
    cy.wait('@getAdSet'); // Need to hardcode the alias

    // Assert
    cy.get('h1').contains('Ad set not found');
  });
});

describe('Main Page (with the library)', () => {
  // Create the stub _and initialize it_
  const stub = new AdSetsStub().init();

  // Endpoints
  const getById = stub.endpoints.getById;

  it('should display ad set', () => {
    // Prepare
    // Get the default config. Could be with override of status, fixture, etc
    EndpointHelper.stub(getById.defaultConfig());

    // Act
    cy.visit('http://localhost:4200');
    // Make sure the ad set is loaded
    cy.wait(getById.alias);

    // Assert
    cy.get('h1').contains('This is my ad set');
    // You might prefer to refer to the fixture directly
    if (getById.fixture?.adSet?.name) cy.get('h1').contains(getById.fixture?.adSet?.name);
    if (getById.fixture?.adSet?.description) cy.get('h2').contains(getById.fixture?.adSet?.description);
  });

  it('should handle ad set not found', () => {
    // Prepare
    EndpointHelper.stub(
      getById
        .defaultConfig()
        .withStatusCode(404)
        .withOverride({
          errors: ['ad set id 12 was not found'], // This is type checked
        })
    );

    // Act
    cy.visit('http://localhost:4200');
    cy.wait(getById.alias);

    // Assert
    cy.get('h1').contains('Ad set not found');
  });
});
