import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname.startsWith('/login')
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
  const isPublicFile = request.nextUrl.pathname.includes('.')

  // 1. If not logged in and not on login page, REDIRECT to login
  if (!user && !isLoginPage && !isPublicFile) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Fetch profile and approval status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved, role')
      .eq('id', user.id)
      .single()

    // 2. If logged in but NOT approved (and not the admin user), REDIRECT to a waiting page (or login with error)
    if (!isLoginPage && !isPublicFile && profile?.role !== 'admin' && !profile?.is_approved) {
      // For now, redirect to login with a special query param
      const url = new URL('/login', request.url)
      url.searchParams.set('status', 'pending')
      return NextResponse.redirect(url)
    }

    // 3. Protect Admin page
    if (isAdminPage && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 4. Redirect logged-in users away from login
    if (isLoginPage) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}
