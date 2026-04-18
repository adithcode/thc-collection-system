import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and PWA files
     */
    '/((?!_next/static|_next/image|favicon.ico|api|manifest|sw|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
