import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient()

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUD_NAME, 
        api_key: '416841867964521', 
        api_secret: '<your_api_secret>' // Click 'View API Keys' above to copy your API secret
    });


interface CloudinaryUploadResult{
    public_id : string,
    bytes : number,
    duration? : number,
    [key : string] : any
}

export async function POST(request : NextRequest){
    const {userId} = auth()

    if(!userId){
       return NextResponse.json({error :"Unauthorized"} , {status : 401})
    }
    try {
        const formdata = await request.formData()
        const file = formdata.get("file") as File | null
        const title = formdata.get("title") as string
        const description = formdata.get("description") as string
        const originalSize = formdata.get("originalSize") as string
        
        if(!file){
            return NextResponse.json({error :"File not found"} , {status : 400})
        }

       const bytes = await file.arrayBuffer()
       const buffer = Buffer.from(bytes)

       const result = await new Promise<CloudinaryUploadResult>(
         (resolve,reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {folder : "video-uploads"},
                (error, result) => {
                    if(error) reject (error)
                        else resolve(result as CloudinaryUploadResult)
                }
               )
               uploadStream.end(buffer)
         }
       )

       const video = await prisma.video.create({
        data : {
            title,
            description,
            publicId : result.public_id,
            originalSize : originalSize,
            compressedSize : String(result.bytes),
            duration : result.duration || 0
        }
       })
       
       return NextResponse.json(
          video
       )
    } catch (error) {
        console.log("Upload video failed", error)
        return NextResponse.json({error : "Upload video failed"}, {status : 500})
    }finally {
        await prisma.$disconnect()
    }
}