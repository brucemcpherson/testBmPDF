var Exports = {

  get PDFLib() {
    return this.guard(PDFLib)
  },

  get PDFDocument() {
    return this.guard(this.PDFLib.PDFDocument)
  },

  get pdfLibProperties () {
    return Reflect.ownKeys (this.PDFLib)
  },


  get pdfDocumentProperties () {
    return Reflect.ownKeys (this.PDFDocument)
  },

  /**
   * shouldn't be used directty - instead use pf.build(...args)
   * @return {_PdfFiddler} instance of _PdfFiddler
   * 
   */
  get PdfFiddler() {
    return _PdfFiddler
  },

  get Utils () {
    return this.guard(_Utils)
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





