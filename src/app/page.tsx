
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, ShieldCheck, Loader2, Lock } from 'lucide-react';

export default function LandingPage() {
  const { loginWithId, login, loading, pendingStudentId, continueAsGuest, cancelLinking } = useAuthContext();
  const [studentId, setStudentId] = useState('');

  const handleIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = studentId.replace(/-/g, '');
    if (cleanId.length === 10) {
      loginWithId(studentId);
    }
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Get only digits
    if (value.length > 10) value = value.slice(0, 10);
    
    let formatted = value;
    if (value.length > 2) {
      formatted = value.slice(0, 2) + '-' + value.slice(2);
    }
    if (value.length > 7) {
      formatted = value.slice(0, 2) + '-' + value.slice(2, 7) + '-' + value.slice(7);
    }
    setStudentId(formatted);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000&auto=format&fit=crop')" }}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
      
      <div className="w-full max-w-md relative z-10">
        <Card className="border-none shadow-2xl bg-white/95 overflow-hidden">
          <div className="bg-[#003399] p-8 text-center text-white relative">
            <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <Wifi className="h-8 w-8 text-white rotate-45" />
            </div>
            <h1 className="text-3xl font-bold mb-2">NEU Library Log</h1>
            <p className="text-blue-100/80">Institutional Entry Terminal</p>
          </div>

          <CardContent className="p-8">
            {pendingStudentId ? (
              <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-800">Account Not Linked</h3>
                  <p className="text-sm text-slate-500">
                    ID <span className="font-mono font-bold text-primary">{pendingStudentId}</span> is not yet associated.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    onClick={() => login(false)} 
                    className="w-full h-12 bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-3"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                     Link with Institutional Google
                  </Button>
                  <Button 
                    variant="link" 
                    onClick={continueAsGuest}
                    className="text-primary font-semibold"
                  >
                    Continue as Guest
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={cancelLinking}
                    className="w-full text-slate-400 text-xs"
                  >
                    Use different ID
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleIdSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="student-id" className="text-xs font-bold text-slate-400 uppercase tracking-wider">STUDENT ID</Label>
                  <Input 
                    id="student-id"
                    placeholder="YY-XXXXX-XXX"
                    value={studentId}
                    onChange={handleIdChange}
                    className="h-14 text-xl text-center font-mono border-2 border-slate-100 focus:border-primary transition-all"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || studentId.replace(/-/g, '').length < 10}
                  className="w-full h-12 bg-[#003399] hover:bg-[#002a7a] text-white font-bold text-lg"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'PROCEED TO CHECK-IN'}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                    <span className="bg-white px-3">Or Access Via</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  onClick={() => login(false)}
                  className="w-full h-12 bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-3"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Institutional Google Account
                </Button>

                <div className="pt-4 flex justify-center">
                  <Link 
                    href="/admin/login" 
                    className="text-slate-400 hover:text-primary text-xs flex items-center gap-1 transition-colors"
                  >
                    <Lock className="h-3 w-3" />
                    Staff Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-2 text-white/90 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Restricted to @neu.edu.ph Institutional IDs</span>
        </div>
      </div>
    </div>
  );
}
