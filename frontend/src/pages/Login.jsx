import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";

const Login = () => {
  const { user, loading, login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const navigate = useNavigate();

  if (loading) return <PageLoader />;

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLoginSuccess = async (credentialResponse) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: credentialResponse.credential }),
        },
      );
      if (!res.ok) {
        throw new Error("Auth failed.");
      }
      const data = await res.json();
      login(data.access_token);
      navigate("/", { replace: true });
    } catch (err) {
      setIsLoggingIn(false);
      toast.error("Login error.");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      {isLoggingIn ? (
        <PageLoader />
      ) : (
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={() => toast.error("Login failed.")}
        />
      )}
    </div>
  );
};

export default Login;
