// app/auth/confirm/route.ts
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (error) {
      return NextResponse.redirect(new URL(`/error?message=${encodeURIComponent(error.message)}`, request.url))
    }
    return NextResponse.redirect(`${origin}${next}`)
  }
  
  return NextResponse.redirect(new URL(`${origin}/error?message=Invalid auth parameters`, request.url))
}
