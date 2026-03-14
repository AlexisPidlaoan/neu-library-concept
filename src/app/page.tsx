"use client"

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GraduationCap, BookOpen, LogIn, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-library');

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard/check-in');
    }
  }, [user, loading, router]);

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
        <div className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="font-bold text-2xl tracking-tight text-primary">StudyFlow</span>
        </div>
        <Button variant="ghost" onClick={login} className="text-primary hover:bg-primary/5">
          Login
        </Button>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[600px] flex items-center justify-center text-white text-center px-4 overflow-hidden">
          <div className="absolute inset-0 z-0">
            {heroImage && (
              <Image 
                src={heroImage.imageUrl} 
                alt={heroImage.description} 
                fill 
                className="object-cover brightness-[0.4]"
                priority
                data-ai-hint={heroImage.imageHint}
              />
            )}
          </div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 font-headline tracking-tight leading-tight">
              Optimize Your Library Experience at NEU
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-slate-200 max-w-2xl mx-auto">
              Efficient visit logging, smart suggestions, and personal study history for modern university life.
            </p>
            <Button 
              size="lg" 
              onClick={login} 
              className="bg-accent hover:bg-accent/90 text-white px-8 py-6 text-lg rounded-full shadow-lg transition-all hover:scale-105"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign in with Institutional ID
            </Button>
            <p className="mt-4 text-sm text-slate-400">Exclusively for @neu.edu.ph accounts</p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
            <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-white">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold">Fast Check-in</CardTitle>
                <CardDescription className="text-base">
                  Record your library visits in seconds with our streamlined flow.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-white">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-xl font-bold">Secure Access</CardTitle>
                <CardDescription className="text-base">
                  Strict domain enforcement ensures only active NEU students and staff have access.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-white">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                  <GraduationCap className="h-6 w-6 text-success" />
                </div>
                <CardTitle className="text-xl font-bold">Visit History</CardTitle>
                <CardDescription className="text-base">
                  Keep track of your study patterns and visit logs effortlessly.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-white">StudyFlow</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} New Era University Library. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}