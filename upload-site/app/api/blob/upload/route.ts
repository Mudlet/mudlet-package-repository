import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Authenticate users before generating token
        const session = await getServerSession();
        if (!session) {
          throw new Error('Unauthorized');
        }

        return {
          allowedContentTypes: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
          addRandomSuffix: true,
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB limit
          tokenPayload: JSON.stringify({
            userId: session.user?.email || 'unknown',
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Log completion - could add database tracking here later
        console.log('Package upload completed', blob.url, tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}