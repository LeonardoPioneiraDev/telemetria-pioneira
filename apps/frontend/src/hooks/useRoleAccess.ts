// // src/hooks/useRoleAccess.ts
// import { useProfile } from './useProfile';

// type UserRole = 'admin' | 'user' | 'moderator'; // Expandível para futuras roles

// export const useRoleAccess = () => {
//   const { data: profile, isLoading } = useProfile();

//   const hasRole = (requiredRole: UserRole): boolean => {
//     if (isLoading || !profile) return false;
//     return profile.role === requiredRole;
//   };

//   const hasAnyRole = (requiredRoles: UserRole[]): boolean => {
//     if (isLoading || !profile) return false;
//     return requiredRoles.includes(profile.role as UserRole);
//   };

//   const isAdmin = (): boolean => hasRole('admin');
//   const isModerator = (): boolean => hasRole('moderator');
//   const isUser = (): boolean => hasRole('user');

//   return {
//     profile,
//     isLoading,
//     hasRole,
//     hasAnyRole,
//     isAdmin,
//     isModerator,
//     isUser,
//     currentRole: profile?.role as UserRole,
//   };
// };
// src/hooks/useRoleAccess.ts
import { useAuth } from '@/contexts/AuthContext';

type UserRole = 'admin' | 'user' | 'moderator';

export const useRoleAccess = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  const hasRole = (requiredRole: UserRole): boolean => {
    if (isLoading || !isAuthenticated || !user) return false;
    return user.role === requiredRole;
  };

  const hasAnyRole = (requiredRoles: UserRole[]): boolean => {
    if (isLoading || !isAuthenticated || !user) return false;
    return requiredRoles.includes(user.role as UserRole);
  };

  const isAdmin = (): boolean => hasRole('admin');
  const isModerator = (): boolean => hasRole('moderator');
  const isUser = (): boolean => hasRole('user');

  return {
    user,
    isLoading,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    isUser,
    currentRole: user?.role as UserRole,
  };
};
