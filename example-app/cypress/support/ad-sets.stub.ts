import { ClientStub } from '../../../src';
import { AdSetsClient, AdSetStatus, AudienceType } from '../../src/client-generated-by-nswag';

export class AdSetsStub extends ClientStub<AdSetsClient> {
  constructor() {
    super(AdSetsClient);
  }

  endpoints = {
    getById: this.createEndpoint(
      this.client.getById,
      200,
      // Everything is typed
      {
        adSet: {
          id: 5,
          partnerId: 5855,
          name: 'This is my ad set',
          description: 'The ad set description is here',
          startDate: new Date('2020-10-20T22:08:46.683'),
          conflictDetectionToken: 1607941414927,
          status: AdSetStatus.Draft,
          audienceType: AudienceType.Custom,
        },
      }
    ),
  };
}
