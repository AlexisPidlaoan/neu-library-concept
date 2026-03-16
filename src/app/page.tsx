"use client"

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, ShieldCheck, Nfc, Link as LinkIcon, AlertCircle, X, UserPlus, User, Lock, Mail, Loader2, Info } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function Home() {
  const { profile, login, loginWithId, loginWithEmail, continueAsGuest, loading, pendingStudentId, cancelLinking } = useAuth();
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const idInputRef = useRef<HTMLInputElement>(null);
  
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-library');

  useEffect(() => {
    if (profile && !loading && !pendingStudentId) {
      if (profile.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard/check-in');
      }
    }
  }, [profile, loading, router, pendingStudentId]);

  const formatStudentId = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const truncated = digits.slice(0, 10);
    let formatted = truncated;
    if (truncated.length > 2) {
      formatted = `${truncated.slice(0, 2)}-${truncated.slice(2)}`;
    }
    if (truncated.length > 7) {
      formatted = `${truncated.slice(0, 2)}-${truncated.slice(2, 7)}-${truncated.slice(7)}`;
    }
    return formatted;
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentId(formatStudentId(e.target.value));
  };

  const handleIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const idPattern = /^\d{2}-\d{5}-\d{3}$/;
    if (!idPattern.test(studentId)) {
      alert('Please enter a valid Student ID: 12-34567-890');
      return;
    }
    loginWithId(studentId);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await loginWithEmail(adminEmail, adminPass);
      setAdminEmail('');
      setAdminPass('');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsAdminDialogOpen(open);
    if (!open) {
      setAdminEmail('');
      setAdminPass('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#D1C4B5]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-primary/20 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-primary/20 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#D1C4B5]">
      <nav className="border-b bg-primary px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <GraduationCap className="h-8 w-8 text-white" />
          <span className="font-bold text-2xl tracking-tight text-white">NEU Library</span>
        </Link>
        <Button 
          variant="ghost" 
          onClick={() => handleDialogOpenChange(true)} 
          className="text-white hover:bg-white/10"
        >
          Admin Login
        </Button>
      </nav>

      <main className="flex-1 flex flex-col">
        <section className="flex-1 relative flex items-center justify-center p-6">
          <div className="absolute inset-0 z-0 overflow-hidden">
             {heroImage && (
              <Image 
                src={heroImage.imageUrl} 
                alt={heroImage.description} 
                fill 
                className="object-cover opacity-60"
                priority
                data-ai-hint={heroImage.imageHint}
              />
            )}
            <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px]" />
          </div>
          
          <div className="relative z-10 w-full max-w-lg">
            <Card className="border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm">
              {pendingStudentId ? (
                <div className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center">
                    <div className="h-16 w-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LinkIcon className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-primary">ID Not Registered</h2>
                    <p className="text-muted-foreground mt-2">
                      Student ID <span className="font-mono font-bold text-[#ED1C24]">{pendingStudentId}</span> detected but not found in system.
                    </p>
                  </div>

                  <Alert className="bg-slate-50 border-primary/20">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <AlertTitle>Institutional Verification</AlertTitle>
                    <AlertDescription>
                      Link your account for faster check-ins, or continue as a guest for this visit.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Button 
                      onClick={login} 
                      className="w-full h-14 text-lg gap-3 bg-primary hover:bg-primary/90"
                    >
                      <Image src="https://picsum.photos/seed/google/20/20" alt="G" width={20} height={20} className="rounded-full" />
                      Link Institutional Account
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={continueAsGuest} 
                      className="w-full h-12 text-[#00A859] font-bold gap-2 border-[#00A859]/20 hover:bg-[#00A859]/5"
                    >
                      <User className="h-4 w-4" />
                      Continue as Guest
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={cancelLinking} 
                      className="w-full text-slate-500 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel and Try Different ID
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-primary p-8 text-white text-center">
                    <div className="h-20 w-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Nfc className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Welcome to NEU Library</h1>
                    <p className="text-white/80">Tap your RFID or enter Student ID below</p>
                  </div>
                  <CardContent className="p-8 space-y-6">
                    <form onSubmit={handleIdSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500 uppercase tracking-wider">Student ID</label>
                        <Input 
                          ref={idInputRef}
                          placeholder="12-34567-890" 
                          maxLength={12}
                          className="h-16 text-2xl text-center font-mono tracking-widest border-2 border-primary/20 focus:border-primary transition-all bg-white"
                          value={studentId}
                          onChange={handleIdChange}
                          autoFocus
                        />
                      </div>
                      <Button type="submit" className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90">
                        PROCEED TO CHECK-IN
                      </Button>
                    </form>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">Or access via</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={login} 
                      className="w-full h-14 text-lg gap-2 border-2 border-primary/10 hover:bg-primary/5 bg-white"
                    >
                      <Image src="https://picsum.photos/seed/google/20/20" alt="G" width={20} height={20} className="rounded-full" />
                      Institutional Google Account
                    </Button>
                  </CardContent>
                </>
              )}
            </Card>
            
            <p className="text-center mt-8 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 drop-shadow-sm">
              <ShieldCheck className="h-4 w-4 text-[#00A859]" />
              Strictly for NEU Students and Personnel
            </p>
          </div>
        </section>
      </main>

      <Dialog open={isAdminDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-[#ED1C24]" />
              Administrator Access
            </DialogTitle>
            <DialogDescription>
              Enter your institutional credentials to access the dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdminLogin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email or "admin"</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  id="admin-email" 
                  placeholder="student@neu.edu.ph" 
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  id="admin-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="off"
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-bold"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : 'Log In to System'}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={() => {
              setIsAdminDialogOpen(false);
              login();
            }} 
            className="w-full h-12 text-lg gap-2 border-2 border-primary/10 hover:bg-primary/5 bg-white"
          >
            <Image src="https://picsum.photos/seed/google/20/20" alt="G" width={20} height={20} className="rounded-full" />
            Institutional Google Account
          </Button>

          <div className="text-center text-xs text-slate-500 mt-4">
            Authorized Personnel Only
          </div>
        </DialogContent>
      </Dialog>

      <footer className="bg-primary text-white/70 py-6 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#FFD54F]" />
            <span className="font-bold text-white">NEU Library</span>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} New Era University Library. Terminal #001</p>
        </div>
      </footer>
    </div>
  );
}
