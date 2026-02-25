import prod from './env.prod';

export type EnvConfig = typeof prod;

export const env: EnvConfig = prod;

export default env;
