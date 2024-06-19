/**
 * all about getting a series of thumbnails from a pdf, 1 per page
 * uses the drv object from bmApiCentral
 * although apps script is not async, the imported pdf-lib https://pdf-lib.js.org/
 * will return promises all of which need to be awaited
 * the constructor actually returns a promise so use the newPdfFiddler definition
 */



class _PdfFiddler {
  /**
   * blobs are combined to single doc
   * @param {object} p the params
   * @param {Blob||Blob[]} p.blobs the doc pdf as a blob
   * @param {function} [p.renamer] how to rename the created blobs
   * @param {boolean} [p.noisy=false] whether to log stuff
   * @param {function} [p.logger] if noisy. how to log stuff  default is (...args)=> console.log (...args)
   * @param {function} [p.name] name of blob - default is to take it from the blob content
   * @return {PdfFiddler} instance
   */
  constructor({ blobs, renamer, name, noisy = false, logger = (...args) => console.log(...args) }) {

    const c = this.constructor
    this.PDFLib = Exports.PDFLib
    this.PDFDoc = Exports.PDFLib.PDFDocument
    if (!Array.isArray(blobs)) blobs = [blobs]
    this.blobs = blobs
    this.ext = ".pdf"

    if (this.blobs.some(b => !Exports.Utils.isBlob(b))) {
      throw `blobs argument to PdfFiddler constructor were not all blobs`
    }
    if (this.blobs.some(b => b.getContentType() !== c.pdfMime)) {
      throw `blobs argument to PdfFiddler constructor were not all ${c.pdfMime}`
    }
    // used if noisy is set to log progress
    this.logger = logger
    this.noisy = noisy
    // use the first blob name if none is given
    this.name = name || this.blobs[0]?.getName()

    // used to rename if doc is split into 2
    this.renamer = renamer
      || ((docName, index, ext) => `${docName}-${index}${ext}`)
    // we can't execute async in a constructor, we'll use an factory function

  }

  /**
   * builder to use instead of new PdfFiddler
   * @return {_PdfFiddler} instance of _PdfFiddler
   */
  static async build(...args) {
    const npf = new _PdfFiddler(...args)
    const instance = await npf.factory()
    return instance
  }
  /**
   * create an empty pdf-lib doc
   */
  static async createPdf() {
    return Exports.PDFLib.PDFDocument.create()
  }

  static async appendPages(source, target, indices) {
    indices = indices || source.getPageIndices()
    const pages = await target.copyPages(source, indices)
    return Promise.all(
      pages.map(page => target.addPage(page))
    )

  }

  /**
   * combines multiple pdfdocs into 1
   */
  static async combine(docs) {

    // create a single new pdf
    const [firstDoc] = docs
    const target = await firstDoc.copy()

    // if there are more then we need to append their pages
    return Promise.all(
      docs.slice(1).map(source => this.appendPages(source, target))
    ).then(() => target)

  }

  static get pdfMime() {
    return "application/pdf"
  }

  static async makeBlob (doc , name) {
    const bytes = await doc.save()
    const blob = Utilities.newBlob(bytes, "application/pdf", name)
    return blob
  }

  /**
   * combine all the blobs are return an instance of PdfFiddler
   */
  async factory() {

    const c = this.constructor
    // first make docs of each blob
    const docs = await Promise.all(
      this.blobs.map(b => this.PDFDoc.load(new Uint8Array(b.getBytes())))
    )

    // now combine each of the docs into a single doc 
    this.noise('...building', this.name, 'from', this.blobs.length, 'input blobs')

    this.doc = await c.combine(docs)
    this.blob = await this.getBlob()
    this.noise('...loaded pdf doc containing', this.name)

    return this

  }

  noise(...args) {
    if (this.noisy) {
      this.logger(...args)
    }
  }

  /**
   * create an empty pdf-lib doc
   */
  static async createPdf() {
    return Exports.PDFLib.PDFDocument.create()
  }

  async getBlob (name) {
    return this.constructor.makeBlob (this.doc, name || this.name)
  }

  /**
   * extracts a page from the doc pdf
   * creates a new pdf, and adds the page
   * @param {number} index the page number (0 based)
   * @return {object} the new pdf plus the the extracted bytes {pdf, bytes}
   */
  async getPageAsPdf(index) {
    const c = this.constructor
    this.noise('...extracting page', index, 'from', this.name)
    // create a single pdf
    const pdf = await c.createPdf()
    // copy page over
    const [p] = await pdf.copyPages(this.doc, [index])
    // add to new pdf
    await pdf.addPage(p)
    // get the new byes for this page
    const bytes = await pdf.save()
    this.noise('...extracted bytes from page', index, 'from', this.name)
    return {
      pdf,
      bytes
    }
  }

  /**
   * splits the doc pdf into seperate pages
   * @return {object[]} an array of new pdf blobs, plus the pdf-lib objects [{blob, pdf},..]
   * 
   */
  async splitBlob() {

    // make multiple pdfs of the doc
    const c = this.constructor
    const length = this.doc.getPageCount()
    this.noise('...splitting', this.name, 'into', length, 'parts')

    // now make a series of pdfs, one for each page
    const pages = await Promise.all(Array.from({ length }, (_, pageNumber) => this.getPageAsPdf(pageNumber)))
    this.noise('...extracted', pages.length, 'pages from', this.name)

    // now make blobs of them all
    const splits = pages.map(({ pdf, bytes }, pageNumber) => {
      const splitName = this.renamer(this.name, pageNumber, this.ext)
      const blob = Utilities.newBlob(bytes, c.pdfMime, splitName)
      this.noise('...split page', pageNumber, 'of', this.name, 'into', splitName)
      return {
        pdf,
        blob,
        pageNumber,
        name: splitName
      }
    })

    return {
      splits,
      source: {
        name: this.name,
        blob: this.blob
      }
    }
  }

}


