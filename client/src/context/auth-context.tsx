import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await api.get("/api/auth/me");
      setUser(response.user);
      setProfile(response.profile);
    } catch (error: any) {
      // Handle account deactivation specifically
      if (error.status === 401 && error.message?.includes("deactivated")) {
        console.log("Account deactivated during session check");
        // Don't show alert here as it will be handled by the API client
      }
      localStorage.removeItem("token");
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/api/auth/login", { email, password });
      
      localStorage.setItem("token", response.token);
      setUser(response.user);
      
      // Fetch profile after login
      const profileResponse = await api.get("/api/auth/me");
      setProfile(profileResponse.profile);
    } catch (error: any) {
      // Provide specific error messages based on the error
      if (error.status === 401) {
        if (error.message?.includes("deactivated")) {
          throw new Error("Account is deactivated. Please contact support for assistance.");
        } else {
          throw new Error("Invalid email or password. Please check your credentials.");
        }
      } else if (error.status === 404) {
        throw new Error("User not found. Please check your email address.");
      } else if (error.status === 0) {
        throw new Error("Network error. Please check your internet connection.");
      } else {
        throw new Error(error.message || "Login failed. Please try again.");
      }
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await api.post("/api/auth/register", userData);
      
      localStorage.setItem("token", response.token);
      setUser(response.user);
      
      // Fetch profile after registration
      const profileResponse = await api.get("/api/auth/me");
      setProfile(profileResponse.profile);
    } catch (error: any) {
      // Provide specific error messages based on the error
      if (error.status === 400) {
        if (error.message?.includes("already exists")) {
          throw new Error("An account with this email already exists. Please use a different email or try logging in.");
        } else {
          throw new Error("Invalid registration data. Please check your information.");
        }
      } else if (error.status === 0) {
        throw new Error("Network error. Please check your internet connection.");
      } else {
        throw new Error(error.message || "Registration failed. Please try again.");
      }
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await api.post("/api/auth/forgot-password", { email });
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error("No account found with this email address. Please check your email or create a new account.");
      } else if (error.status === 400 && error.message?.includes("inactive")) {
        throw new Error("This account is currently inactive. Please contact support for assistance.");
      } else if (error.status === 0) {
        throw new Error("Network error. Please check your internet connection.");
      } else {
        throw new Error(error.message || "Failed to send password reset email. Please try again.");
      }
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      await api.post("/api/auth/reset-password", { token, newPassword });
    } catch (error: any) {
      if (error.status === 400) {
        throw new Error("Invalid or expired reset token. Please request a new password reset.");
      } else if (error.status === 0) {
        throw new Error("Network error. Please check your internet connection.");
      } else {
        throw new Error(error.message || "Failed to reset password. Please try again.");
      }
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    
    try {
      // Clear welcome flag for this user when logging out
      if (user?.id) {
        localStorage.removeItem(`welcome-shown-${user.id}`);
      }
      
      // Clear all user-related data
      localStorage.removeItem("token");
      
      // Clear any theme-related localStorage items
      localStorage.removeItem("theme");
      localStorage.removeItem("theme-preference");
      
      // Add a delay to show the logout process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This will be handled by the theme context and other contexts
      // that listen to user authentication changes
      
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoading,
      isLoggingOut,
      setUser,
      login,
      register,
      forgotPassword,
      resetPassword,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
