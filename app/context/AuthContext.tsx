import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Simulate authentication with sample data
  async function signup(email: string, password: string) {
    // In a real app, we would validate and store the user
    setUser({ id: Date.now().toString(), email });
  }

  async function login(email: string, password: string) {
    // In a real app, we would validate credentials
    setUser({ id: Date.now().toString(), email });
  }

  async function logout() {
    setUser(null);
  }

  const value = {
    user,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
