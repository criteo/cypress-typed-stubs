import { AdSetStatus, AudienceType, GetAdSetDetailsResponse } from '../../src/client-generated-by-nswag';

export const adSetEnglish: GetAdSetDetailsResponse = {
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
};

export const adSetFrench: GetAdSetDetailsResponse = {
  adSet: {
    id: 5,
    partnerId: 5855,
    name: "Ceci est mon ensemble d'annonce",
    description: "La description de l'ensemble d'annonce est ici",
    startDate: new Date('2020-10-20T22:08:46.683'),
    conflictDetectionToken: 1607941414927,
    status: AdSetStatus.Draft,
    audienceType: AudienceType.Custom,
  },
};