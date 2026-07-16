import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me')
const adminPath = `/${process.env.ADMIN_PANEL_PATH || 'control-room'}`

async function validAdminSession(request: NextRequest) {
  const token = request.cookies.get('aphelion_session')?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'ADMIN'
  } catch {
    return false
  }
}

async function validAdminGate(request: NextRequest) {
  const token = request.cookies.get('aphelion_admin_access')?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.scope === 'admin-panel'
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPanel = pathname === adminPath || pathname.startsWith(`${adminPath}/`)
  const isAdminApi = pathname.startsWith('/api/admin')
  const isGateApi = pathname === '/api/admin/verify'
  if (!isPanel && !isAdminApi) return NextResponse.next()
  if (!(await validAdminSession(request))) return new NextResponse('Not found', { status: 404 })
  if (isGateApi || (await validAdminGate(request))) return NextResponse.next()
  if (isAdminApi) return NextResponse.json({ error: 'Admin access password required' }, { status: 401 })
  return NextResponse.next()
}

export const config = { matcher: ['/api/admin/:path*', '/:path*'] }
