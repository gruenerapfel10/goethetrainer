import { cookies } from 'next/headers'
import { adminAuth } from './admin'

export async function getServerSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')
    
    if (!token) {
      return null
    }

    const decodedToken = await adminAuth.verifyIdToken(token.value)
    
    return {
      user: {
        id: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || decodedToken.email?.split('@')[0] || '',
        image: decodedToken.picture || null,
      },
      expires: new Date(decodedToken.exp * 1000).toISOString()
    }
  } catch (error) {
    console.error('Failed to verify token:', error)
    return null
  }
}