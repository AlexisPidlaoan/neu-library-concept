
"use client"

import { useAuthContext } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { History, LogIn, LogOut, GraduationCap, LayoutDashboard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Priority: Let the UI render as soon as 'user' is present, even if 'profile' is still loading.
  if (loading || (!user && !pathname.includes('/check-in'))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  const menuItems = [
    { label: 'Check-in', icon: LogIn, href: '/dashboard/check-in', color: 'text-success' }, 
    { label: 'My History', icon: History, href: '/dashboard/history', color: 'text-accent' }, 
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r shadow-sm">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-primary group-data-[collapsible=icon]:hidden">NEU Library</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <SidebarMenu>
            <div className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">
              Services
            </div>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {isAdmin && (
              <div className="mt-4 px-4">
                <Button variant="outline" size="sm" asChild className="w-full text-xs gap-2">
                  <Link href="/admin/dashboard">
                    <LayoutDashboard className="h-3 w-3 text-primary" />
                    Admin View
                  </Link>
                </Button>
              </div>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || ''} />
                  <AvatarFallback className="bg-primary text-white">
                    {profile?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left group-data-[collapsible=icon]:hidden ml-3">
                  <span className="text-sm font-bold truncate text-primary">{profile?.displayName || 'Loading...'}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {profile?.studentId || user?.email}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Admin Portal
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="h-16 border-b flex items-center px-6 sticky top-0 bg-primary text-white z-40 justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h2 className="font-semibold text-lg hidden md:block text-white">Library Services</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.displayName || 'Welcome'}</p>
              <p className="text-xs text-white/70 capitalize">{profile?.role || 'Guest'}</p>
            </div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
