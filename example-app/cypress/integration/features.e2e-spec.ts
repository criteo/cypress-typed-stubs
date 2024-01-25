import { EndpointHelper } from '../../../src';
import { AdSetsStub } from '../support/ad-sets.stub';

describe('Features', () => {
  const stub = new AdSetsStub().init();
  const getById = stub.endpoints.getById;
  const getByIdWithFixtureBuilder = stub.endpoints.getByIdWithFixtureBuilder;

  it('should support cy.wait with a number', () => {
    cy.wait(3000);
  });

  it('should FAIL when request is not awaited', () => {
    // Prepare
    EndpointHelper.stub(getById.defaultConfig());

    // Act
    cy.visit('http://localhost:4200');

    // Assert
    cy.get('h1').contains('This is my ad set');
  });

  it('should handle fixture builder', () => {
    // Prepare
    // Get the default config with fixture builder
    EndpointHelper.stub(getByIdWithFixtureBuilder.defaultConfig());

    // Visit page
    cy.visit('http://localhost:4200');
    // Make sure the ad set is loaded
    cy.wait(getByIdWithFixtureBuilder.alias);

    // Assert ad set was loaded with english text
    cy.get('h1').contains('This is my ad set');
    cy.get('select').should('have.value', 'en-US');
    cy.get('select option:selected').should('have.text', 'English');

    // Change language selection to french
    cy.get('select').select('Français');
    // Make sure the ad set is loaded
    cy.wait(getByIdWithFixtureBuilder.alias);

    // Assert ad set was loaded with french text
    cy.get('h1').contains("Ceci est mon ensemble d'annonce");
    cy.get('select').should('have.value', 'fr-FR');
    cy.get('select option:selected').should('have.text', 'Français');
  });
});
