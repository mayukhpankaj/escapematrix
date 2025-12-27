import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Global User Store
 * Stores user data accessible throughout the application
 */
const useUserStore = create(
  persist(
    (set, get) => ({
      // User data
      userId: null,
      email: null,
      firstName: null,
      lastName: null,
      fullName: null,
      imageUrl: null,
      username: null,
      
      // Set user data
      setUser: (userData) => set({
        userId: userData.userId || userData.id,
        email: userData.email || userData.primaryEmailAddress?.emailAddress,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        imageUrl: userData.imageUrl,
        username: userData.username,
      }),
      
      // Update partial user data
      updateUser: (updates) => set((state) => ({
        ...state,
        ...updates,
      })),
      
      // Clear user data (on logout)
      clearUser: () => set({
        userId: null,
        email: null,
        firstName: null,
        lastName: null,
        fullName: null,
        imageUrl: null,
        username: null,
      }),
      
      // Get user data
      getUser: () => {
        const state = get()
        return {
          userId: state.userId,
          email: state.email,
          firstName: state.firstName,
          lastName: state.lastName,
          fullName: state.fullName,
          imageUrl: state.imageUrl,
          username: state.username,
        }
      },
      
      // Check if user is loaded
      isUserLoaded: () => {
        const state = get()
        return !!state.userId
      },
    }),
    {
      name: 'user-storage', // localStorage key
      partialize: (state) => ({
        userId: state.userId,
        email: state.email,
        firstName: state.firstName,
        lastName: state.lastName,
        fullName: state.fullName,
        imageUrl: state.imageUrl,
        username: state.username,
      }),
    }
  )
)

export default useUserStore
