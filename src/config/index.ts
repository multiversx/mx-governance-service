import { GithubConfig } from 'src/modules/governance/models/github.config.model';
import { envload } from './env_load';
envload();
import config from 'config';
import { FAQItem } from 'src/modules/governance/models/faq.model';

/**
 * Wallet object configuration.
 * Has 3rd party API hosts and other configurations
 */
export const mxConfig = config.get('multiversx');
/**
 * Caching time config.
 * The values are in seconds
 */
export const cacheConfig = config.get('caching');

export const scAddress = config.get('scAddress');

export const gasConfig = config.get('gasLimits');

export const abiConfig = config.get('abi');

export const governanceConfig = config.get('governance');

export const requestExplicitContracts = config.get('requestExplicit');

export const constantsConfig = config.get('constants');

export const delegateStakingProviders = config.get('delegateStakingProviders');

export const githubConfig: GithubConfig = config.get('github');

export const systemContracts = config.get('systemContracts');

export const onChainConfig: { onChainId: number, faq: FAQItem[], excludedAddresses: {name: string, address: string}[] }[]= config.get('onChainConfig');
