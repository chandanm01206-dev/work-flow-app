import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setApiToken } from "@/src/api/client";

interface AuthContextType {
    token: string | null;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    token: null,
    login: async () => {},
    logout: async () => {},
    isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem("auth_token").then((val) => {
            if (val) {
                setToken(val);
                setApiToken(val);
            }
            setIsLoading(false);
        });
    }, []);

    const login = async (newToken: string) => {
        await AsyncStorage.setItem("auth_token", newToken);
        setToken(newToken);
        setApiToken(newToken);
    };

    const logout = async () => {
        await AsyncStorage.removeItem("auth_token");
        setToken(null);
        setApiToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
