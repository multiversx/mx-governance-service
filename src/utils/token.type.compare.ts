import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

export function isEsdtToken(
    token: EsdtToken,
): token is EsdtToken {
    return (token as EsdtToken).identifier !== undefined;
}

export function isEsdtTokenValid(token: EsdtToken): boolean {
    if (
        !token.identifier ||
        !token.decimals ||
        token.identifier === undefined ||
        token.decimals === undefined ||
        token.decimals === 0
    ) {
        return false;
    }
    return true;
}
