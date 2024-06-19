const _Utils = (() => {
  const isObject = (obj) => obj === Object(obj);
  const isBlob = (blob) => isObject(blob) && blob.toString() === 'Blob'
  return {
    isObject,
    isBlob
  }
})()
