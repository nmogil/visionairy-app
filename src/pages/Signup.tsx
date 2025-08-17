import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const Signup = () => {
  const navigate = useNavigate();
  
  const canonical =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup`
      : "/signup";

  useEffect(() => {
    // Redirect to login page since we use the same OTP flow for both login and signup
    navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <>
      <Helmet>
        <title>Sign Up | AI Image Party</title>
        <meta
          name="description"
          content="Create your AI Image Party account to start hosting and joining rooms. Secure sign-in with OTP email verification."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </div>
    </>
  );
};

export default Signup;
