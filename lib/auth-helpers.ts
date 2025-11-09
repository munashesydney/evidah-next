import { auth } from './firebase';
import { User } from 'firebase/auth';

/**
 * Get the current authenticated user
 */
export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

/**
 * Get the user's custom claims (role, displayName, etc.)
 */
export const getUserClaims = async (): Promise<any> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  const idTokenResult = await user.getIdTokenResult();
  return idTokenResult.claims;
};

/**
 * Check if user has a specific role
 */
export const hasRole = async (role: string): Promise<boolean> => {
  const claims = await getUserClaims();
  return claims?.role === role;
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  await auth.signOut();
};
