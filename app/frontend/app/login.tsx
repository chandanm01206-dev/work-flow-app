import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { colors, fontFamily } from "@/src/theme";

export default function LoginScreen() {
    const { login } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!username || !password) {
            Alert.alert("Error", "Please enter username and password");
            return;
        }

        setIsLoading(true);
        try {
            const endpoint = isRegistering ? "/auth/register" : "/auth/login";
            const res = await api.post<{ token: string }>(endpoint, { username, password });
            await login(res.token);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Authentication failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.iconBox}>
                        <Feather name="layers" size={32} color={colors.onBrand} />
                    </View>
                    <Text style={styles.title}>Too do</Text>
                    <Text style={styles.subtitle}>{isRegistering ? "Create an account" : "Welcome back"}</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Enter username"
                        placeholderTextColor={colors.onSurfaceSecondary}
                        autoCapitalize="none"
                        editable={!isLoading}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter password"
                        placeholderTextColor={colors.onSurfaceSecondary}
                        secureTextEntry
                        editable={!isLoading}
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.button, isLoading && styles.buttonDisabled]} 
                    onPress={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.onBrand} />
                    ) : (
                        <Text style={styles.buttonText}>{isRegistering ? "Register" : "Sign In"}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.toggleButton} 
                    onPress={() => setIsRegistering(!isRegistering)}
                    disabled={isLoading}
                >
                    <Text style={styles.toggleText}>
                        {isRegistering ? "Already have an account? Sign In" : "Need an account? Register"}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
        justifyContent: "center",
        padding: 20,
    },
    card: {
        backgroundColor: colors.surfaceSecondary,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontFamily: fontFamily.displayBold,
        fontSize: 32,
        color: colors.onSurface,
        textAlign: "center",
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: fontFamily.text,
        fontSize: 16,
        color: colors.onSurfaceSecondary,
        textAlign: "center",
        marginBottom: 32,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontFamily: fontFamily.textMedium,
        fontSize: 14,
        color: colors.onSurface,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 16,
        color: colors.onSurface,
        fontFamily: fontFamily.text,
        fontSize: 16,
    },
    button: {
        backgroundColor: colors.brand,
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: colors.onBrand,
        fontFamily: fontFamily.textBold,
        fontSize: 16,
    },
    toggleButton: {
        marginTop: 24,
        alignItems: "center",
    },
    toggleText: {
        color: colors.brand,
        fontFamily: fontFamily.textMedium,
        fontSize: 14,
    },
});
