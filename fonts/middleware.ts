import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  console.log('Middleware - Request URL:', request.url)
  console.log('Middleware - Host:', host)
  console.log('Middleware - Cookie header:', request.headers.get('cookie'))
  console.log('Middleware - Cookies:', request.cookies.getAll())

  const response = NextResponse.next()

  // Forward cookies
  const cookie = request.headers.get('cookie')
  if (cookie) {
    response.headers.set('cookie', cookie)
  }

  return response
}

export const config = {
  matcher: '/api/:path*',
}