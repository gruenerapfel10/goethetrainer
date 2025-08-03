// Compatibility layer for Firebase authentication
import { getServerSession } from '@/lib/firebase/auth-helpers'

export const auth = getServerSession

// Re-export for compatibility
export { signOut } from 'firebase/auth'