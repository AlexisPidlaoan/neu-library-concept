"use client"

import { useAuthContext } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { LayoutDashboard, LogOut, GraduationCap, Users, BookMarked, LogIn } from 'lucide-react';
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

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/admin/login');
      } else if (profile?.role !== 'admin') {
        router.push('/dashboard/check-in');
      }
    }
  }, [user, profile, loading, router]);

  if (loading || !user || profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const adminItems = [
    { label: 'Visitor Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', color: 'text-[#00A859]' }, 
    { label: 'College Management', icon: BookMarked, href: '/admin/colleges', color: 'text-[#FFD54F]' }, 
    { label: 'User Management', icon: Users, href: '/admin/users', color: 'text-[#ED1C24]' }, 
  ];

  const isAlsoStudent = !!profile?.studentId;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r shadow-sm">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-primary group-data-[collapsible=icon]:hidden">NEU Admin</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <SidebarMenu>
            <div className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
              Management
            </div>
            {adminItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {isAlsoStudent && (
              <div className="mt-4 px-4">
                <Button variant="outline" size="sm" asChild className="w-full text-xs gap-2 border-primary/20 hover:bg-primary/5">
                  <Link href="/dashboard/check-in">
                    <LogIn className="h-3 w-3 text-primary" />
                    Student View
                  </Link>
                </Button>
              </div>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent w-full justify-start p-2">
                <Avatar className="h-8 w-8 border border-primary/10 shrink-0">
                  <AvatarImage src={user.photoURL || ''} />
                  <AvatarFallback className="bg-primary text-white uppercase">
                    {profile?.displayName?.charAt(0) || user.displayName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden overflow-hidden ml-3">
                  <span className="text-sm font-bold truncate w-full text-primary">
                    {profile?.displayName || user.displayName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-full">
                    {user.email || profile?.email}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56">
              <DropdownMenuLabel>Admin Session</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAlsoStudent && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/check-in" className="cursor-pointer">
                    <LogIn className="mr-2 h-4 w-4 text-primary" />
                    Student Check-in
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={logout} className="text-[#ED1C24] cursor-pointer font-semibold">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="h-16 border-b flex items-center px-6 sticky top-0 bg-primary text-white z-40 justify-between shadow-md">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-white hover:bg-white/10" />
            <div className="h-4 w-[1px] bg-white/20 hidden md:block" />
            <h2 className="font-semibold text-lg hidden md:block">
              Administrative Services
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.displayName}</p>
              <p className="text-xs text-white/70 capitalize">{profile?.role}</p>
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
