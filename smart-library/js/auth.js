// ============================================================
// AUTH.JS — Supabase Authentication logic
// Depends on: supabase-config.js
// ============================================================

import { supabase, showToast, logActivity } from './supabase-config.js';

const ADMIN_EMAIL = 'ratanjinagi999@gmail.com';

// -------------------------------------------------------------
// LOGIN
// -------------------------------------------------------------
export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

  if (error) {
    showToast('Invalid login credentials.', 'error');
    throw error;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    showToast('Unable to load your profile. Contact the library admin.', 'error');
    throw profileError || new Error('Profile not found');
  }

  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    showToast('Your account is inactive. Contact the library admin.', 'error');
    throw new Error('Inactive account');
  }

  await logActivity(profile.id, 'Logged In', 'auth', `${profile.role} login`);

  // dashboard.html selects the admin/librarian or member view from this role.
  window.location.href = 'dashboard.html';

  return profile;
}

// -------------------------------------------------------------
// SIGN UP (members self-register; librarians/admins are created by an admin)
// -------------------------------------------------------------
export async function signUpMember({ email, password, fullName, phone, registrationNumber, department, semester }) {
  if (email.trim().toLowerCase() === ADMIN_EMAIL) {
    const error = new Error('This email is reserved for the library administrator.');
    showToast(error.message, 'error');
    throw error;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: 'member' },
    },
  });

  if (error) {
    showToast(error.message, 'error');
    throw error;
  }

  // profiles row is created automatically by the on_auth_user_created
  // trigger (see database/schema.sql), but the trigger only sets
  // full_name/email/role - phone needs a follow-up update.
  if (phone) {
    await supabase.from('profiles').update({ phone }).eq('id', data.user.id);
  }

  // Create the matching members row.
  const { error: memberError } = await supabase.from('members').insert({
    user_id: data.user.id,
    registration_number: registrationNumber,
    department,
    semester,
  });

  if (memberError) {
    if (memberError.message.includes('duplicate')) {
      showToast('This registration number is already in use.', 'error');
    } else {
      showToast('Unable to complete registration.', 'error');
    }
    throw memberError;
  }

  showToast('Account created. You can now log in.', 'success');
  return data.user;
}

// -------------------------------------------------------------
// LOGOUT
// -------------------------------------------------------------
export async function logoutUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await logActivity(session.user.id, 'Logged Out', 'auth');
  }
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

// -------------------------------------------------------------
// FORGOT PASSWORD
// -------------------------------------------------------------
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password.html',
  });
  if (error) {
    showToast('Unable to send reset email.', 'error');
    throw error;
  }
  showToast('Password reset email sent. Check your inbox.', 'success');
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    showToast('Unable to update password.', 'error');
    throw error;
  }
  showToast('Password updated successfully.', 'success');
}
