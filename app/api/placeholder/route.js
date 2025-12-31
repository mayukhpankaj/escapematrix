import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const width = searchParams.get('width') || '64'
  const height = searchParams.get('height') || '64'
  const bgColor = searchParams.get('bgColor') || '9333ea'
  const textColor = searchParams.get('textColor') || 'FFFFFF'
  const text = searchParams.get('text') || '🎉'

  // Create a simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#${bgColor}"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
            fill="#${textColor}" font-size="24" font-family="Arial, sans-serif">
        ${text}
      </text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
