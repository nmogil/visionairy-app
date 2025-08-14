import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { Input } from "@/components/ui/8bit/input";
import { Label } from "@/components/ui/8bit/label";
import { Link } from "react-router-dom";

const Signup = () => {
  const canonical =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup`
      : "/signup";

  return (
    <>
      <Helmet>
        <title>Sign Up | AI Image Party</title>
        <meta
          name="description"
          content="Create your AI Image Party account to start hosting and joining rooms. Retro 8-bit sign up form with accessible design."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <main className="container mx-auto max-w-md px-4 py-16">
        <section aria-labelledby="signup-title">
          <div className="flex flex-col gap-6 font-display">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Create an account</CardTitle>
                <CardDescription className="text-xs">Join AI Image Party in seconds</CardDescription>
              </CardHeader>
              <CardContent>
                <form>
                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="m@example.com" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm">Confirm password</Label>
                      <Input id="confirm" type="password" required />
                    </div>
                    <Button type="submit" className="w-full">Sign up</Button>
                    <div className="text-center text-xs">
                      Already have an account?{" "}
                      <Link to="/login" className="underline underline-offset-4">Log in</Link>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </>
  );
};

export default Signup;
