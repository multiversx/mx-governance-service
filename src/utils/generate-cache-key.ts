const DEFAULT_REGION = 'defaultregion';
const SEPARATOR = '.';

const isObject = input => {
    return input === Object(input);
};

export const generateCacheKeyFromParams = (...args: any[]): string => {
    let cacheKey = '';
    for (const arg of args) {
        if (isObject(arg)) {
            cacheKey += `${JSON.stringify(arg)}${SEPARATOR}`;
        } else {
            cacheKey += `${arg}${SEPARATOR}`;
        }
    }
    return cacheKey.slice(0, -1);
};
