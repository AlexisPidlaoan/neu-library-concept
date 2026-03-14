
"use client"

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GraduationCap, ShieldCheck, Nfc, Link as LinkIcon, AlertCircle, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Home() {
  const { profile, login, loginWithId, loading, pendingStudentId, cancelLinking } = useAuth();
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-primary/20 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-primary/20 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="font-bold text-2xl tracking-tight text-primary">NEU Library</span>
        </Link>
        <Button variant="ghost" onClick={login} className="text-primary hover:bg-primary/5">
          Admin Login
        </Button>
      </nav>

      <main className="flex-1 flex flex-col">
        <section className="flex-1 relative flex items-center justify-center p-6 bg-slate-50">
          <div className="absolute inset-0 z-0">
             {heroImage && (
              <Image 
                src={heroImage.imageUrl} 
                alt={heroImage.description} 
                fill 
                className="object-cover opacity-20"
                priority
                data-ai-hint={heroImage.imageHint}
              />
            )}
          </div>
          
          <div className="relative z-10 w-full max-w-lg">
            <Card className="border-none shadow-2xl overflow-hidden">
              {pendingStudentId ? (
                <div className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center">
                    <div className="h-16 w-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LinkIcon className="h-8 w-8 text-accent" />
                    </div>
                    <h2 className="text-2xl font-bold text-primary">Link Your Account</h2>
                    <p className="text-muted-foreground mt-2">
                      Student ID <span className="font-mono font-bold text-accent">{pendingStudentId}</span> detected for the first time.
                    </p>
                  </div>

                  <Alert className="bg-slate-50 border-slate-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Registration Required</AlertTitle>
                    <AlertDescription>
                      Sign in with your official **@neu.edu.ph** Google account to link this ID permanently.
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
                      variant="ghost" 
                      onClick={cancelLinking} 
                      className="w-full h-10 text-slate-500 gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel and use another ID
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-primary p-8 text-white text-center">
                    <div className="h-20 w-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
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
                          className="h-16 text-2xl text-center font-mono tracking-widest border-2 focus:border-primary transition-all"
                          value={studentId}
                          onChange={handleIdChange}
                          autoFocus
                        />
                      </div>
                      <Button type="submit" className="w-full h-14 text-lg font-bold">
                        PROCEED TO CHECK-IN
                      </Button>
                    </form>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">Or access via</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={login} 
                      className="w-full h-14 text-lg gap-2 border-2"
                    >
                      <Image src="https://picsum.photos/seed/google/20/20" alt="G" width={20} height={20} className="rounded-full" />
                      Institutional Google Account
                    </Button>
                  </CardContent>
                </>
              )}
            </Card>
            
            <p className="text-center mt-8 text-slate-400 text-sm flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Strictly for NEU Students and Personnel
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-bold text-white">NEU Library</span>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} New Era University Library. Terminal #001</p>
        </div>
      </footer>
    </div>
  );
}
