import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Building, FileText, Check } from "lucide-react";
import { FaGoogle, FaFacebook } from "react-icons/fa";

interface LoginProps {
  onLogin: (user: any) => void;
  isLoading?: boolean;
}

export default function Login({ onLogin, isLoading }: LoginProps) {
  const [username, setUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState("viewer");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username.trim(),
            role: selectedRole
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.message || 'Login failed');
          return;
        }

        const data = await response.json();
        onLogin(data.user);
      } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
      }
    }
  };

  const handleSocialLogin = (provider: string) => {
    // For demo purposes, create a user with provider name
    onLogin({
      id: Date.now(),
      username: `${provider}_user`,
      role: selectedRole
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-500 flex flex-col lg:flex-row">
      {/* Left Side - Branding and Analytics */}
      <div className="hidden sm:flex lg:w-1/2 flex-col justify-center px-6 sm:px-12 py-8 lg:py-0 text-white">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Atlas Document</h1>
            <p className="text-purple-100">Dashboard</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-4">Welcome back!</h2>
            <p className="text-xl text-purple-100 mb-8">
              Please sign in to your<br />
              Atlas document account
            </p>
            <div className="text-sm text-purple-200 bg-white/10 p-3 rounded-lg border border-white/20">
              <p className="font-medium mb-2">🔐 Secure Access</p>
              <p className="text-xs">Please enter your authorized email address and select your role to access the document management system.</p>
            </div>
            <p className="text-purple-200 leading-relaxed">
              Streamline your document management with powerful analytics and 
              real-time tracking capabilities.
            </p>
          </div>
          
          {/* Analytics Preview Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Document Analytics</h3>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">87%</div>
                <div className="text-sm text-purple-200">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">12%</div>
                <div className="text-sm text-purple-200">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">1%</div>
                <div className="text-sm text-purple-200">Archived</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="space-y-2 text-center pt-8">
            <div className="flex items-center justify-center mb-6">
              <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Check className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Sign In</CardTitle>
            <CardDescription className="text-gray-600">
              Welcome back! Please enter your details
            </CardDescription>
          </CardHeader>
        
          <CardContent className="space-y-6 px-8 pb-8">
            {/* Username/Role Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="username"
                  type="email"
                  placeholder="Enter your email address"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 border-gray-300 focus:border-indigo-600 focus:ring-indigo-600 bg-white"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                  Role
                </Label>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full h-12 px-3 py-2 border border-gray-300 rounded-md focus:border-indigo-600 focus:ring-indigo-600 focus:ring-1 bg-white text-sm"
                  disabled={isLoading}
                >
                  <option value="">Select your role</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Administrator</option>
                  <option value="project manager">Project Manager</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-gray-300"
                />
                <Label htmlFor="remember" className="text-sm text-gray-600">
                  Remember for 30 days
                </Label>
                <div className="ml-auto">
                  <button type="button" className="text-sm text-indigo-600 hover:text-indigo-700">
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                disabled={isLoading || !username.trim()}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="loading-spinner"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">OR</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 border-gray-300 hover:bg-gray-50"
                onClick={() => handleSocialLogin("google")}
                disabled={isLoading}
              >
                <FaGoogle className="mr-2 h-4 w-4 text-red-500" />
                Google
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="h-12 border-gray-300 hover:bg-gray-50"
                onClick={() => handleSocialLogin("facebook")}
                disabled={isLoading}
              >
                <FaFacebook className="mr-2 h-4 w-4 text-blue-600" />
                Facebook
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account? <button className="text-indigo-600 hover:text-indigo-700 font-medium">Sign up</button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}