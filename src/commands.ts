import { AddAwaitedRequest } from './request-manager';

Cypress.Commands.overwrite<'wait', 'optional'>('wait', (originalFn, alias, options) => {
  const optionList = typeof options === 'string' ? [options] : options;
  AddAwaitedRequest(optionList);
  return originalFn(alias, options);
});
