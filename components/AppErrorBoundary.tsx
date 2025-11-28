import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import colors from "@/constants/colors";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    console.error("[AppErrorBoundary] Derived error state", error);
    return {
      hasError: true,
      errorMessage: error.message || "Unexpected error occurred",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[AppErrorBoundary] Caught error", { error, errorInfo });
  }

  private handleReset = () => {
    console.log("[AppErrorBoundary] Resetting error state");
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer} testID="app-error-boundary-fallback">
          <View style={styles.iconWrapper}>
            <AlertTriangle color={colors.error} size={48} />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.errorMessage}</Text>
          <TouchableOpacity
            onPress={this.handleReset}
            style={styles.retryButton}
            activeOpacity={0.9}
            testID="app-error-boundary-retry-button"
          >
            <RefreshCw color={colors.white} size={18} />
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 24,
    gap: 16,
  },
  iconWrapper: {
    backgroundColor: colors.error + "15",
    padding: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.error + "30",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.text,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
});

export default AppErrorBoundary;
