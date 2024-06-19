const helloworldsplit = async () => {
  const id = "1-bOAhC0riDmlLFb7Kc_ypBJV6K8K8RZN"
  const blob = DriveApp.getFileById(id).getBlob()

  // get an instance
  const pf = await bmPDF.Exports.PdfFiddler.build({
    blobs: blob, 
    name: "helloworld-split"
  })

  // split them up into separate blobs
  const results = await pf.splitBlob()

  // now write these blobs to drive
  const files = results.splits.map(f => DriveApp.createFile(f.blob))

  files.forEach(f =>
    console.log('...created file', f.getName())
  )

}
const helloworldcombine = async () => {

  const ids = [
    "1v5kJ5SOY2nu3DI1LKwALb3seaBpF3kWu",
    "1rYYtwARFe9X9nZWxkaTpsFoI-zKouPus"
  ]
  const blobs = ids.map(id=>DriveApp.getFileById(id).getBlob())


  // get an instance - this will combine all the blobs provided
  const pf = await bmPDF.Exports.PdfFiddler.build({
    blobs, 
    name: "helloworld-combine.pdf"
  })


  // now write these blobs to drive
  const file = DriveApp.createFile(pf.blob)
  console.log('...created file', file.getName())
  
}
const helloworldrearrange = async () => {

  const ids = [
    "1v5kJ5SOY2nu3DI1LKwALb3seaBpF3kWu",
    "1rYYtwARFe9X9nZWxkaTpsFoI-zKouPus"
  ]
  const blobs = ids.map(id=>DriveApp.getFileById(id).getBlob())

  // first combine them
  const pf = await bmPDF.Exports.PdfFiddler.build({
    blobs, 
    name: "helloworld-combine.pdf"
  })

  // now we can split them into single pages
  const {splits} = await pf.splitBlob()

  // and combine the ones we want 
  const odds = await  bmPDF.Exports.PdfFiddler.build({
    blobs: splits.filter((_,i)=> i % 2).map(f=>f.blob), 
    name: "helloworld-odds.pdf"
  })

  const evens = await  bmPDF.Exports.PdfFiddler.build({
    blobs: splits.filter((_,i)=> !(i % 2)).map(f=>f.blob),  
    name: "helloworld-evens.pdf"
  })


  // now write these blobs to drive
  const evenFile = DriveApp.createFile(evens.blob)
  console.log('...created file', evenFile.getName())
  const oddFile = DriveApp.createFile(odds.blob)
  console.log('...created file', oddFile.getName())
  
}

const helloworldvarious= async () => {
  const id = "1-bOAhC0riDmlLFb7Kc_ypBJV6K8K8RZN"
  const blob = DriveApp.getFileById(id).getBlob()

  // get an instance
  const pf = await bmPDF.Exports.PdfFiddler.build({
    blobs: blob, 
    name: "helloworld-various"
  })

  // the pdf file is in the doc property
  pf.doc.setAuthor ("Bruce Mcpherson")
  pf.doc.setTitle ("Testing various pdf properties")

  // we've changed the document, so get a new blob 
  const newBlob = await pf.getBlob()


  // get it back and check the other
  const withprops = await bmPDF.Exports.PdfFiddler.build({
    blobs: newBlob,
    name: "helloworld-various-withprops.pdf"
  })

  console.log ('author:', withprops.doc.getAuthor())
  console.log ('title:', withprops.doc.getTitle())
}

const bulk = async () => {

  // this sets up the dependencies the drv library (which is dependency free will need)
  // you should have these scopes in appsscript.json
  // you'll also need to enable the drive api - simplest way is to enable the Drive advacned Services
  /*
    "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/drive"
  ],
  */
  Exports.Deps.init({
    tokenService: ScriptApp.getOAuthToken,
    fetch: UrlFetchApp.fetch
  })

  // this is an enhanced drv client with built in caching and support for unix style paths on drive
  const drv = Exports.newDrv()

  // test samples were downloaded from https://www.princexml.com/samples/
  // you can take a copy to your drive from
  // https://drive.google.com/drive/folders/1-ULuWEBn0ywN7yBVQaK0p3Fhegyx_fnz?usp=drive_link
  // put them in some folder of your choosing and put the path below

  const inputPath = '/public/samplepdfs'
  const outputPath = '/public/splitpdfs'

  // limit list to just pdf files
  // you could add additional drive queries here - for example "and name = 'my.pdf'"
  const mime = "application/pdf"
  const query = `mimeType = '${mime}'`

  // get all the pdf files in the given directory
  const inputs = drv.getFilesInFolder({ path: inputPath, query })

  // we'll just put the split files in a subfolder
  // if it's not there we'll create it
  const outputFolder = drv.getFolder({
    path: outputPath,
    createIfMissing: true
  })

  // do the whole thing - these will be the blobs for each of the input files
  const inputFiles = inputs.data.files.map(file => drv.download(file))

  // the pdfs they create will be quasi async
  const inputPdfs = await Promise.all(inputFiles.map(f => Exports.PdfFiddler.build({ blobs: f.blob, name: f.data.name})))

  // now split each of those into single page pdfs
  const singlePages = await Promise.all(inputPdfs.map(f => f.splitBlob()))

  // now upload everything
  const outputs = singlePages.map(input => {
    const uploads = input.splits.map(f => drv.upload({
      blob: f.blob,
      parentId: outputFolder.data.id
    }))
    return {
      input,
      uploads
    }
  })


  console.log('Finished:uploaded these files in', outputFolder.data.name)
  outputs.forEach(f => {
    console.log('...from', f.input.source.name)
    f.uploads.forEach(s => console.log('.... ', s.data.name, 'size', s.data.size))
  })

  // now get all the thumnails
  const imagePath = '/public/splitimages'
  // if it's not there we'll create it
  const imageFolder = drv.getFolder({
    path: imagePath,
    createIfMissing: true
  })
  const files = outputs
    .map(f=>f.uploads)
    .flat(Infinity)
    .map(f=>drv.get({id: f.data.id}, [{fields: 'thumbnailLink'}]))
  
  const images = UrlFetchApp
    .fetchAll(files.map(file=>({
      url: file.data.thumbnailLink
    })))
    .map ((f,i)=>f.getBlob().setName(`${files[i].data.name}.png`))
    .map (blob=>drv.upload ({
      blob,
      parentId: imageFolder.data.id
    }))
  
  console.log ('Finished:created this images in', imageFolder.data.name)
  images.forEach(f=>console.log('...',f.data.name))

}
