import { CheckEmptiedStubRequests, ResetStubbedRequests } from './request-manager';

before(ResetStubbedRequests);

beforeEach(ResetStubbedRequests);

after(CheckEmptiedStubRequests);

afterEach(CheckEmptiedStubRequests);
