import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail, CheckCircle2, KeyRound } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import api from '../services/api';
import { supabase } from '../services/supabaseClient';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [serverMessage, setServerMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setError('');
      setServerMessage('');
      const cleanEmail = data.email.trim().toLowerCase();

      // First attempt via server API
      try {
        const response = await api.post('/auth/forgot-password', { email: cleanEmail });
        if (response.data.success) {
          setSubmittedEmail(cleanEmail);
          setServerMessage(response.data.message || 'Password reset email sent successfully!');
          return;
        }
      } catch (apiErr: any) {
        console.warn('Server forgot-password attempt:', apiErr.response?.data?.error || apiErr.message);
      }

      // Fallback: direct Supabase Client reset password
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetErr) {
        setError(resetErr.message || 'Failed to send reset email. Please verify your email address.');
      } else {
        setSubmittedEmail(cleanEmail);
        setServerMessage('A password reset link has been dispatched to your email address.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while requesting password reset.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle showLabel={true} />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-xs">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-400">
          Enter your registered email address and we will send you a recovery link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-gray-100 dark:border-slate-800">
          {submittedEmail ? (
            <div className="text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Check your email</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                  We've sent a password reset link to <strong className="text-gray-900 dark:text-white">{submittedEmail}</strong>.
                  Click the link in the email to set a new password.
                </p>
                {serverMessage && (
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900">
                    {serverMessage}
                  </p>
                )}
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={() => setSubmittedEmail(null)}
                  className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  Try another email address
                </button>

                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 p-3 rounded-md text-sm border border-red-100 dark:border-red-900">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@company.com"
                    autoFocus
                    className="block w-full appearance-none rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full justify-center rounded-lg border border-transparent bg-blue-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    'Send Password Reset Link'
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
