import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const createSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase environment variables are not configured')
    return null
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

export async function GET(req) {
  try {
    console.log('[pro-status] env check', {
      clerkSecretKey: process.env.CLERK_SECRET_KEY?.slice(0, 7) + '...',
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.slice(0, 7) + '...',
    })
    const supabase = createSupabase()

    console.log('[pro-status] request', {
      url: req?.url,
      hasCookieHeader: Boolean(req?.headers?.get?.('cookie')),
      cookieLength: (req?.headers?.get?.('cookie') || '').length,
      host: req?.headers?.get?.('host'),
      origin: req?.headers?.get?.('origin'),
      referer: req?.headers?.get?.('referer'),
      userAgent: req?.headers?.get?.('user-agent'),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      hasClerkSecretKey: Boolean(process.env.CLERK_SECRET_KEY),
      hasClerkPublishableKey: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
      clerkSecretKeyPrefix: process.env.CLERK_SECRET_KEY?.slice(0, 7) + '...',
      clerkPublishableKeyPrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.slice(0, 7) + '...',
    })

    // Temporary: log cookie names (not values) to diagnose domain mismatch
    const cookieHeader = req?.headers?.get?.('cookie') || ''
    const cookieNames = cookieHeader.split(';').map(c => c.trim().split('=')[0]).filter(Boolean)
    console.log('[pro-status] cookie names', cookieNames)

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    // Get authenticated user
    const { userId } = await auth()
    console.log('[pro-status] auth', { userId })

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    // Check user pro status
    const { data, error } = await supabase
      .from('user_pro_status')
      .select('is_pro')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error checking pro status:', error)
      return NextResponse.json(
        { error: 'Failed to check pro status' },
        { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    // If no record found, user is not pro
    const isPro = data?.is_pro || false

    console.log('[pro-status] lookup', { userId, isPro, hasRow: Boolean(data) })

    return NextResponse.json(
      { isPro },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('Error in pro-status API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }
}
