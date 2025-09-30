// // src/components/shared/UserDropdown.tsx
// 'use client';

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import { useProfile } from '@/hooks/useProfile';
// import { useRoleAccess } from '@/hooks/useRoleAccess';
// import { ChevronDown, Loader2, Shield, User, Users } from 'lucide-react';
// import { useRouter } from 'next/navigation';

// export const UserDropdown = () => {
//   const { data: profile, isLoading, error } = useProfile();
//   const { isAdmin } = useRoleAccess();
//   const router = useRouter();

//   // Função para renderizar o trigger do dropdown
//   const renderTrigger = () => {
//     if (isLoading) {
//       return (
//         <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-yellow-400/10 transition-all duration-200 cursor-pointer">
//           <User className="h-4 w-4 text-yellow-400 flex-shrink-0" />
//           <div className="flex items-center space-x-1">
//             <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />
//             <span className="text-gray-400 text-sm">Carregando...</span>
//           </div>
//         </div>
//       );
//     }

//     if (error) {
//       return (
//         <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-yellow-400/10 transition-all duration-200 cursor-pointer">
//           <User className="h-4 w-4 text-yellow-400 flex-shrink-0" />
//           <span className="text-gray-400 text-sm">Usuário</span>
//           <ChevronDown className="h-3 w-3 text-gray-400" />
//         </div>
//       );
//     }

//     const displayName = profile?.fullName || profile?.username || 'Usuário';
//     const isAdminUser = isAdmin();

//     return (
//       <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-yellow-400/10 transition-all duration-200 cursor-pointer group">
//         <div className="flex items-center space-x-2">
//           {isAdminUser ? (
//             <Shield className="h-4 w-4 text-yellow-400 flex-shrink-0" />
//           ) : (
//             <User className="h-4 w-4 text-yellow-400 flex-shrink-0" />
//           )}
//           <div className="flex flex-col">
//             <span className="text-white font-medium text-sm leading-tight">{displayName}</span>
//             {isAdminUser && (
//               <span className="text-yellow-400 text-xs leading-tight">Administrador</span>
//             )}
//           </div>
//         </div>
//         <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-yellow-400 transition-colors duration-200" />
//       </div>
//     );
//   };

//   const handleAdminAccess = () => {
//     router.push('/admin/users');
//   };

//   const handleProfileSettings = () => {
//     router.push('/profile'); // ou onde for a página de perfil
//   };

//   return (
//     <div className="hidden md:block">
//       <DropdownMenu>
//         <DropdownMenuTrigger asChild>
//           <button className="focus:outline-none focus:ring-2 focus:ring-yellow-400/50 rounded-lg">
//             {renderTrigger()}
//           </button>
//         </DropdownMenuTrigger>

//         <DropdownMenuContent
//           className="w-56 bg-gray-900/95 backdrop-blur-md border-gray-700 shadow-xl"
//           align="end"
//           sideOffset={8}
//         >
//           {/* Header do Menu */}
//           <DropdownMenuLabel className="text-gray-300">
//             <div className="flex flex-col space-y-1">
//               <span className="font-medium text-white">
//                 {profile?.fullName || profile?.username || 'Usuário'}
//               </span>
//               <span className="text-xs text-gray-400 font-normal">
//                 {profile?.email || 'email@exemplo.com'}
//               </span>
//             </div>
//           </DropdownMenuLabel>

//           <DropdownMenuSeparator className="bg-gray-700" />

//           {/* Opções do Menu */}
//           {/* <DropdownMenuItem
//             onClick={handleProfileSettings}
//             className="text-gray-300 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white cursor-pointer"
//           >
//             <UserCog className="h-4 w-4 mr-3" />
//             <span>Meu Perfil</span>
//           </DropdownMenuItem> */}

//           {/* Opção Admin - só aparece para administradores */}
//           {isAdmin() && (
//             <>
//               <DropdownMenuSeparator className="bg-gray-700" />
//               <DropdownMenuItem
//                 onClick={handleAdminAccess}
//                 className="text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10 focus:bg-yellow-400/10 focus:text-yellow-400 cursor-pointer"
//               >
//                 <Users className="h-4 w-4 mr-3" />
//                 <span>Configurações</span>
//                 <div className="ml-auto">
//                   <Shield className="h-3 w-3 text-yellow-400" />
//                 </div>
//               </DropdownMenuItem>
//             </>
//           )}
//         </DropdownMenuContent>
//       </DropdownMenu>
//     </div>
//   );
// };
// src/components/shared/UserDropdown.tsx
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { ChevronDown, Loader2, Shield, User, UserCog, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const UserDropdown = () => {
  const { user, isLoading } = useAuth();
  const { isAdmin } = useRoleAccess();
  const router = useRouter();

  // Função para renderizar o trigger do dropdown
  const renderTrigger = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-yellow-400/10 transition-all duration-200 cursor-pointer">
          <User className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          <div className="flex items-center space-x-1">
            <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />
            <span className="text-gray-400 text-sm">Carregando...</span>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-yellow-400/10 transition-all duration-200 cursor-pointer">
          <User className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          <span className="text-gray-400 text-sm">Usuário</span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </div>
      );
    }

    const displayName = user.fullName || user.username || 'Usuário';
    const isAdminUser = isAdmin();

    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-yellow-400/10 transition-all duration-200 cursor-pointer group">
        <div className="flex items-center space-x-2">
          {isAdminUser ? (
            <Shield className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          ) : (
            <User className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          )}
          <div className="flex flex-col">
            <span className="text-white font-medium text-sm leading-tight">{displayName}</span>
            {isAdminUser && (
              <span className="text-yellow-400 text-xs leading-tight">Administrador</span>
            )}
          </div>
        </div>
        <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-yellow-400 transition-colors duration-200" />
      </div>
    );
  };

  const handleAdminAccess = () => {
    router.push('/admin/users');
  };

  const handleProfileSettings = () => {
    router.push('/profile');
  };

  // Não renderizar se não estiver carregado ainda
  if (isLoading) {
    return <div className="hidden md:block">{renderTrigger()}</div>;
  }

  return (
    <div className="hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none focus:ring-2 focus:ring-yellow-400/50 rounded-lg">
            {renderTrigger()}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-56 bg-gray-900/95 backdrop-blur-md border-gray-700 shadow-xl"
          align="end"
          sideOffset={8}
        >
          {/* Header do Menu */}
          <DropdownMenuLabel className="text-gray-300">
            <div className="flex flex-col space-y-1">
              <span className="font-medium text-white">
                {user?.fullName || user?.username || 'Usuário'}
              </span>
              <span className="text-xs text-gray-400 font-normal">
                {user?.email || 'email@exemplo.com'}
              </span>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-gray-700" />

          {/* Opções do Menu */}
          <DropdownMenuItem
            onClick={handleProfileSettings}
            className="text-gray-300 hover:text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white cursor-pointer"
          >
            <UserCog className="h-4 w-4 mr-3" />
            <span>Meu Perfil</span>
          </DropdownMenuItem>

          {/* Opção Admin - só aparece para administradores */}
          {isAdmin() && (
            <>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                onClick={handleAdminAccess}
                className="text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10 focus:bg-yellow-400/10 focus:text-yellow-400 cursor-pointer"
              >
                <Users className="h-4 w-4 mr-3" />
                <span>Configurações</span>
                <div className="ml-auto">
                  <Shield className="h-3 w-3 text-yellow-400" />
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
