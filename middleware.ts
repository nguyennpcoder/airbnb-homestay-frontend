import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const token = request.cookies.get('jwt')?.value
    const { pathname } = request.nextUrl

    if (pathname.startsWith('/profile') && !token) {
        const url = new URL('/login', request.url)
        url.searchParams.set('callbackUrl', pathname + request.nextUrl.search)
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/profile/:path*'],
}
