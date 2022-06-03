let requestAliases: { [key: string]: { awaited: number; requested: number } } = {};

export const ResetStubbedRequests = () => {
  requestAliases = {};
};

export const AddRequestedUrl = (alias: string) => {
  addRequestedUrl(alias);
};

export const AddAwaitedRequest = (aliases: string[]) => {
  if (!aliases) {
    return;
  }
  aliases.forEach((alias) => {
    // Removing @
    addAwaitedUrl(alias.substring(1));
  });
};

export const CheckEmptiedStubRequests = () => {
  const notAwaited = notAwaitedRequests();
  // Check that the set is first empty and throw if not because all request previously tested have not been awaited
  if (notAwaited.length !== 0) {
    throw `You have not awaited all urls in the previous test. Not awaited requests: ${Array.from(notAwaited).join(
      ', '
    )}`;
  }
};

function addRequestedUrl(url: string) {
  if (url in requestAliases) {
    requestAliases[url].requested++;
  } else {
    requestAliases[url] = { requested: 1, awaited: 0 };
  }
}

function addAwaitedUrl(url: string) {
  if (url in requestAliases) {
    requestAliases[url].awaited++;
  } else {
    requestAliases[url] = { requested: 0, awaited: 1 };
  }
}

function notAwaitedRequests() {
  const notAwaited = [];
  for (const url of Object.keys(requestAliases)) {
    const urlStats = requestAliases[url];
    if (urlStats.awaited < urlStats.requested) {
      notAwaited.push(url);
    }
  }
  return notAwaited;
}
