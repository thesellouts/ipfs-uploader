import express, { Request, Response } from 'express'
import multer from 'multer'
import dotenv from 'dotenv'
import pinataSDK from '@pinata/sdk'
import { Readable } from 'stream'
import cors from 'cors'

dotenv.config()

const app = express()
const port = process.env.PORT || 4000

const upload = multer({ limits: { fileSize: 2000 * 1024 * 1024 } }) // Set the file size limit to 2GB

const pinata = new pinataSDK(
  process.env.PINATA_API_KEY!,
  process.env.PINATA_SECRET_API_KEY!
)

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

async function uploadToIPFS(buffer: Buffer, filename: string): Promise<string> {
  const fileStream = bufferToStream(buffer)
  const options = {
    pinataMetadata: { name: filename },
    pinataOptions: { cidVersion: 1 as const },
  }

  try {
    const result = await pinata.pinFileToIPFS(fileStream, options)
    return `ipfs://${result.IpfsHash}`
  } catch (error) {
    console.error('Failed to upload to IPFS:', error)
    throw new Error('Failed to upload file.')
  }
}

// Use CORS middleware
app.use(cors())

app.post(
  '/upload-to-ipfs',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded.' })
      }

      const ipfsUrl = await uploadToIPFS(file.buffer, file.originalname)
      res.status(200).json({ url: ipfsUrl })
    } catch (error) {
      console.error('Error uploading file:', error)
      res.status(500).json({ error: 'Failed to upload file to IPFS.' })
    }
  }
)

app.listen(port, () => {
  console.log(`IPFS Uploader service running at http://localhost:${port}`)
})
