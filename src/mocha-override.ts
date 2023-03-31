import { CheckEmptiedStubRequests, ResetStubbedRequests } from './request-manager';

const checkAwaitedRequests = Cypress.config('checkAwaitedRequests' as unknown as Cypress.Config);

if (checkAwaitedRequests == null || checkAwaitedRequests === true) {
  before(ResetStubbedRequests);
  beforeEach(ResetStubbedRequests);
  after(CheckEmptiedStubRequests);
  afterEach(CheckEmptiedStubRequests);
}
