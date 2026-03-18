
"use client"

import { useAuthContext } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { LayoutDashboard, LogOut, GraduationCap, Users, BookMarked, UserCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!loading && !isLoginPage) {
      if (!user) {
        router.push('/admin/login');
      } else if (profile && profile.role !== 'admin') {
        router.push('/dashboard/check-in');
      }
    }
  }, [user, profile, loading, router, isLoginPage]);

  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!user || (profile && profile.role !== 'admin')) {
    return null;
  }

  const adminItems = [
    { label: 'Analytics Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', color: 'text-success' }, 
    { label: 'College Records', icon: BookMarked, href: '/admin/colleges', color: 'text-accent' }, 
    { label: 'System Users', icon: Users, href: '/admin/users', color: 'text-destructive' }, 
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r shadow-sm">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-primary group-data-[collapsible=icon]:hidden">Staff Portal</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <SidebarMenu>
            <div className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase group-data-[collapsible=icon]:hidden">
              Management
            </div>
            {adminItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <div className="mt-4 px-4">
              <Button variant="outline" size="sm" asChild className="w-full text-xs gap-2">
                <Link href="/dashboard/check-in">
                  <UserCircle className="h-3 w-3 text-primary" />
                  Terminal Mode
                </Link>
              </Button>
            </div>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || ''} />
                  <AvatarFallback className="bg-primary text-white">
                    {profile?.displayName?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left group-data-[collapsible=icon]:hidden ml-3">
                  <span className="text-sm font-bold truncate text-primary">{profile?.displayName || 'Admin'}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56">
              <DropdownMenuLabel>Session Details</DropdownMenuLabel>
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
        <header className="h-16 border-b flex items-center px-6 sticky top-0 bg-primary text-white z-40 justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h2 className="font-semibold text-lg hidden md:block text-white">Administrative Backend</h2>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
