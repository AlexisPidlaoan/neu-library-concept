"use client"

import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { LayoutDashboard, History, LogIn, LogOut, GraduationCap, Settings, Users, BookMarked, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  const menuItems = [
    { label: 'Check-in', icon: LogIn, href: '/dashboard/check-in' },
    { label: 'My History', icon: History, href: '/dashboard/history' },
  ];

  const adminItems = [
    { label: 'Visit Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    { label: 'College Management', icon: BookMarked, href: '/admin/colleges' },
    { label: 'User Management', icon: Users, href: '/admin/users' },
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r shadow-sm">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              < GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-primary group-data-[collapsible=icon]:hidden">NEU Library</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <SidebarMenu>
            <div className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
              Student Panel
            </div>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {isAdmin && (
              <>
                <div className="mt-8 mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                  Admin Panel
                </div>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary uppercase">
                    {user.displayName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden overflow-hidden">
                  <span className="text-sm font-medium truncate w-full">{user.displayName}</span>
                  <span className="text-xs text-muted-foreground truncate w-full">{user.email}</span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="h-16 border-b flex items-center px-6 sticky top-0 bg-white/80 backdrop-blur-md z-40 justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div className="h-4 w-[1px] bg-border hidden md:block" />
            <h2 className="font-semibold text-lg hidden md:block">
              {isAdmin && pathname.startsWith('/admin') ? 'Administration' : 'Library Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.displayName}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
            </div>
          </div>
        </header>
        <main className="p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
