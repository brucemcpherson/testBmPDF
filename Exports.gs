var Exports = {

  /**
   * @param {object} p params
   * @param {function} tokenService how to get a token
   * @param {function} fetch how to fetch
   */
  Init(...args) {
    return this.Deps.init(...args)
  },

  get ApiCentral() {
    return bmApiCentral.Exports
  },

  get Deps() {
    return this.ApiCentral.Deps
  },

  get pdfLibImport () {
    return bmPDF.Exports
  },

  get PdfFiddler() {
    return this.pdfLibImport.PdfFiddler
  },

  get PDFLib() {
    return this.pdfLibImport.PDFLib
  },

  get PDFDocument() {
    return this.PDFLib.PDFDocument
  },


  get libExports() {
    return bmApiCentral.Exports
  },

  get Deps() {
    return this.libExports.Deps
  },



  /**
   * Drv instance with validation
   * @param {...*} args
   * @return {Drv} a proxied instance of Drv with property checking enabled
   */
  newDrv(...args) {
    return this.ApiCentral.newDrv(...args)
  },

  /**
   * Utils namespace
   * @return {Utils} 
   */
  get Utils() {
    return this.ApiCentral.Utils
  },

  // used to trap access to unknown properties
  guard(target) {
    return new Proxy(target, this.validateProperties)
  },

  /**
   * for validating attempts to access non existent properties
   */
  get validateProperties() {
    return {
      get(target, prop, receiver) {
        // typeof and console use the inspect prop
        if (
          typeof prop !== 'symbol' &&
          prop !== 'inspect' &&
          !Reflect.has(target, prop)
        ) throw `guard detected attempt to get non-existent property ${prop}`

        return Reflect.get(target, prop, receiver)
      },

      set(target, prop, value, receiver) {
        if (!Reflect.has(target, prop)) throw `guard attempt to set non-existent property ${prop}`
        return Reflect.set(target, prop, value, receiver)
      }
    }
  }

}





