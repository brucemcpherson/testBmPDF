// polyfills required for import from https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js
// set timeout is required as it's not defined  in appsscript but needed by pdf-lib
// note - since Apps script is blocking - this will block execution during sleep ie. not asynchronous like setTimeout which is not implemented in apps script
const setTimeout = (func, ms, ...params) => {
  Utilities.sleep(ms)
  return func.apply(null, params)
}
