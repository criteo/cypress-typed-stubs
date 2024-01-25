import { ClientStub } from '../../../src';
import { AdSetsClient } from '../../src/client-generated-by-nswag';
import { adSetEnglish, adSetFrench } from '@cypress/fixtures/ad-sets';

export class AdSetsStub extends ClientStub<AdSetsClient> {
  constructor() {
    super(AdSetsClient);
  }

  endpoints = {
    getById: this.createEndpoint(
      this.client.getById,
      200,
      adSetEnglish // fixture is typed
    ),
    getByIdWithFixtureBuilder: this.createEndpoint(
      this.client.getById,
      200,
      // No static fixture provided
      undefined,
      {},
      // Fixture builder function -> builds the fixture depending on the request
      // (here depending on 'language' query parameter).
      (req) => (req.query['language'] === 'fr-FR' ? adSetFrench : adSetEnglish)
    ),
  };
}
