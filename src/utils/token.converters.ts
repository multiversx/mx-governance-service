import BigNumber from 'bignumber.js';

export function decimalToHex(d: number | BigNumber): string {
    const h = d.toString(16);
    return h.length % 2 ? '0' + h : h;
}

export const tokenIdentifier = (
    tokenID: string,
    tokenNonce: number,
): string => {
    return `${tokenID}-${decimalToHex(tokenNonce)}`;
};
