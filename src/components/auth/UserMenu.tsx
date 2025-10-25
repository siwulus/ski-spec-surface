import { useAuth } from '@/components/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

interface UserMenuProps {
  /** User email to display (passed from server-side) */
  userEmail?: string;
}

/**
 * Get user initials from email address
 * @param email - User email address
 * @returns Two-letter initials (e.g., "JD" for john.doe@example.com)
 */
const getUserInitials = (email: string): string => {
  const parts = email.split('@')[0].split('.');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
};

/**
 * UserMenu component
 *
 * Displays user dropdown menu with:
 * - Avatar with user initials
 * - User email display
 * - Logout action
 *
 * Used in Header for authenticated users.
 *
 * @example
 * ```tsx
 * <UserMenu userEmail={session.user.email} client:load />
 * ```
 */
export const UserMenu: React.FC<UserMenuProps> = ({ userEmail }) => {
  const { user, signOut, isAuthenticated, isLoading } = useAuth();

  // Use email from props (server-side) or from auth hook (client-side)
  const email = userEmail || user?.email || '';
  const initials = email ? getUserInitials(email) : 'U';

  const handleLogout = async (): Promise<void> => {
    try {
      await signOut();
      toast.success('Successfully logged out');

      // Redirect to landing page
      window.location.href = '/';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', error);
      toast.error('An error occurred while logging out. Please try again.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="User menu"
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:inline-block">{email}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Account</p>
            <p className="text-xs leading-none text-muted-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} disabled={!isAuthenticated || isLoading} className="cursor-pointer">
          <LogOut className="mr-2 size-4" />
          <span>{isLoading ? 'Logging out...' : 'Log out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
