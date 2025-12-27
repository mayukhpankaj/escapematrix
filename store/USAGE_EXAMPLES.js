/**
 * Global User Store - Usage Examples
 * 
 * This store uses Zustand with persist middleware to store user data
 * Data persists in localStorage and survives page refreshes
 */

// ============================================
// EXAMPLE 1: Accessing User Data in Components
// ============================================

import useUserStore from '@/store/userStore'

function MyComponent() {
  // Get specific user fields
  const { userId, email, fullName } = useUserStore()
  
  // Or get all user data at once
  const getUser = useUserStore((state) => state.getUser)
  const userData = getUser()
  
  return (
    <div>
      <p>User ID: {userId}</p>
      <p>Email: {email}</p>
      <p>Name: {fullName}</p>
    </div>
  )
}

// ============================================
// EXAMPLE 2: Updating User Data
// ============================================

function UpdateUserComponent() {
  const { updateUser } = useUserStore()
  
  const handleUpdate = () => {
    updateUser({
      firstName: 'John',
      lastName: 'Doe'
    })
  }
  
  return <button onClick={handleUpdate}>Update User</button>
}

// ============================================
// EXAMPLE 3: Setting Complete User Data (After Login)
// ============================================

function LoginComponent() {
  const { setUser } = useUserStore()
  const { user } = useUser() // From Clerk
  
  useEffect(() => {
    if (user) {
      setUser({
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        username: user.username,
      })
    }
  }, [user, setUser])
  
  return <div>Login Component</div>
}

// ============================================
// EXAMPLE 4: Clearing User Data (On Logout)
// ============================================

function LogoutButton() {
  const { clearUser } = useUserStore()
  const { signOut } = useClerk()
  
  const handleLogout = async () => {
    await signOut()
    clearUser() // Clear global state
  }
  
  return <button onClick={handleLogout}>Logout</button>
}

// ============================================
// EXAMPLE 5: Checking if User is Loaded
// ============================================

function ProtectedComponent() {
  const isUserLoaded = useUserStore((state) => state.isUserLoaded())
  
  if (!isUserLoaded) {
    return <div>Loading user data...</div>
  }
  
  return <div>Protected content</div>
}

// ============================================
// EXAMPLE 6: Using User Data for API Calls
// ============================================

function ApiComponent() {
  const { userId } = useUserStore()
  
  const fetchUserTasks = async () => {
    const response = await fetch(`/api/tasks?userId=${userId}`)
    const data = await response.json()
    return data
  }
  
  return <div>API Component</div>
}

// ============================================
// Available User Fields in Store:
// ============================================
/**
 * - userId: string | null - Clerk user ID
 * - email: string | null - User's primary email
 * - firstName: string | null - User's first name
 * - lastName: string | null - User's last name
 * - fullName: string | null - Full name (first + last)
 * - imageUrl: string | null - Profile image URL
 * - username: string | null - Username
 */

// ============================================
// Available Methods:
// ============================================
/**
 * - setUser(userData) - Set complete user data
 * - updateUser(updates) - Update specific fields
 * - clearUser() - Clear all user data
 * - getUser() - Get all user data as object
 * - isUserLoaded() - Check if user data exists
 */
