import dev from './env.dev';
import prod from './env.prod';

export type EnvConfig = typeof dev;

export const env: EnvConfig = __DEV__ ? dev : prod;

export default env;
