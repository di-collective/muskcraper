class RevisionCache {}

const cache = new Map<string, any>();

const set = function <T>(key: string, value: T): Map<string, any> {
  return cache.set(key, value);
};

const get = function (key: string): any {
  if (cache.has(key)) return cache[key];
};
