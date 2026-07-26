export function createCallableOptions(env = process.env) {
  return {
    region: 'europe-west1',
    enforceAppCheck: env.FUNCTIONS_EMULATOR !== 'true',
  }
}
