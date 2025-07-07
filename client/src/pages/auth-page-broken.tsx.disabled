import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Redirect } from "wouter";

// Schema for registration
const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  role: z.enum(["company_admin", "team_member", "contractor_individual"]),
  companyName: z.string().min(1, "Company name is required"),
  businessNumber: z.string().min(1, "Business number is required"),
  companyWebsite: z.string().optional(),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  howHeardAbout: z.string().min(1, "Please select how you heard about the program"),
  howHeardAboutOther: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val, "You must accept the terms and conditions"),
  acceptBusinessInfo: z.boolean().refine(val => val, "You must accept the business information terms"),
  acceptContact: z.boolean().refine(val => val, "You must accept the contact consent")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Login schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

type RegisterData = z.infer<typeof registerSchema>;
type LoginData = z.infer<typeof loginSchema>;

function generateShortName(companyName: string): string {
  if (!companyName) return "";
  
  const cleaned = companyName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toUpperCase();
  
  const words = cleaned.split(/\s+/);
  
  if (words.length === 1) {
    return words[0].substring(0, 6);
  }
  
  if (words.length === 2) {
    return words[0].substring(0, 3) + words[1].substring(0, 3);
  }
  
  return words.slice(0, 3).map(word => word.substring(0, 2)).join("");
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "company_admin",
      acceptTerms: false,
      acceptBusinessInfo: false,
      acceptContact: false
    }
  });

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created successfully",
        description: "Welcome to the SEMI program!"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome back!"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onRegister = async (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  const onLogin = async (data: LoginData) => {
    loginMutation.mutate(data);
  };

  // Watch company name for auto-generation
  const companyName = registerForm.watch("companyName");
  const generatedShortName = generateShortName(companyName || "");

  // Watch how heard about field
  const howHeardAbout = registerForm.watch("howHeardAbout");

  // Step navigation functions
  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await registerForm.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const getFieldsForStep = (step: number): (keyof RegisterData)[] => {
    switch (step) {
      case 1:
        return ["firstName", "lastName", "email", "password", "confirmPassword", "role"];
      case 2:
        return ["companyName", "businessNumber", "companyWebsite"];
      case 3:
        return ["streetAddress", "city", "province", "postalCode"];
      case 4:
        return ["howHeardAbout", "howHeardAboutOther", "acceptTerms", "acceptBusinessInfo", "acceptContact"];
      default:
        return [];
    }
  };

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1:
        return "Personal Information";
      case 2:
        return "Business Information";
      case 3:
        return "Company Address";
      case 4:
        return "Program & Terms";
      default:
        return "";
    }
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Column - Auth Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* SEMI Logo */}
          <div className="mb-8">
            <img
              className="h-12 w-auto"
              src="https://www.alberta.ca/system/images/custom/emission-reduction-alberta-logo-small.png"
              alt="SEMI Program"
            />
          </div>

          <Card className="w-full">
          <CardHeader>
            <CardTitle>{isLogin ? "Sign In" : "Create Account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Enter your credentials to access your account" : "Create your SEMI program account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress indicator for company admin registration only */}
            {!isLogin && registerForm.watch("role") === "company_admin" && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step <= currentStep 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step}
                      </div>
                      {step < 4 && (
                        <div className={`w-16 h-1 mx-2 ${
                          step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600 text-center">
                  Step {currentStep} of 4: {getStepTitle(currentStep)}
                </div>
              </div>
            )}
            {isLogin ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-6">
                  {/* Multi-step registration for company admins */}
                  {registerForm.watch("role") === "company_admin" ? (
                    <>
                      {/* Step 1: Personal Information */}
                      {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your first name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your last name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select your role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="company_admin">Company Admin</SelectItem>
                                    <SelectItem value="team_member">Team Member</SelectItem>
                                    <SelectItem value="contractor_individual">Contractor</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password *</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Enter your password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password *</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirm your password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 2: Business Information */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="businessNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Number *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your business number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Company Short Name (Auto-generated)</Label>
                          <Input 
                            value={generatedShortName}
                            readOnly
                            disabled
                            placeholder="Will be generated from company name"
                            className="bg-gray-50 text-gray-700"
                          />
                          <p className="text-xs text-gray-500">
                            Auto-generated for system identification
                          </p>
                        </div>
                        <FormField
                          control={registerForm.control}
                          name="companyWebsite"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Website (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="https://www.example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 3: Address Information */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter street address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter city" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="province"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Province *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select province" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Alberta">Alberta</SelectItem>
                                    <SelectItem value="British Columbia">British Columbia</SelectItem>
                                    <SelectItem value="Manitoba">Manitoba</SelectItem>
                                    <SelectItem value="New Brunswick">New Brunswick</SelectItem>
                                    <SelectItem value="Newfoundland and Labrador">Newfoundland and Labrador</SelectItem>
                                    <SelectItem value="Northwest Territories">Northwest Territories</SelectItem>
                                    <SelectItem value="Nova Scotia">Nova Scotia</SelectItem>
                                    <SelectItem value="Nunavut">Nunavut</SelectItem>
                                    <SelectItem value="Ontario">Ontario</SelectItem>
                                    <SelectItem value="Prince Edward Island">Prince Edward Island</SelectItem>
                                    <SelectItem value="Quebec">Quebec</SelectItem>
                                    <SelectItem value="Saskatchewan">Saskatchewan</SelectItem>
                                    <SelectItem value="Yukon">Yukon</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postal Code *</FormLabel>
                              <FormControl>
                                <Input placeholder="T5J 3S4" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 4: Program Information & Terms */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-md font-medium text-gray-900">Program Information</h4>
                        <FormField
                          control={registerForm.control}
                          name="howHeardAbout"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>How did you hear about the SEMI program? *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an option" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="website">Website</SelectItem>
                                    <SelectItem value="e-blast">E-blast</SelectItem>
                                    <SelectItem value="webinar">Webinar</SelectItem>
                                    <SelectItem value="event">Event</SelectItem>
                                    <SelectItem value="program_staff">Program Staff</SelectItem>
                                    <SelectItem value="referral">Referral</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {howHeardAbout === "other" && (
                          <FormField
                            control={registerForm.control}
                            name="howHeardAboutOther"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Please specify *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Please tell us how you heard about the program" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-md font-medium text-gray-900">Terms and Conditions</h4>
                        <FormField
                          control={registerForm.control}
                          name="acceptTerms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">
                                  I agree to the Portal Services Agreement *
                                </FormLabel>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="acceptBusinessInfo"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">
                                  I understand that my business information will be used for program administration and verification purposes *
                                </FormLabel>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="acceptContact"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">
                                  I consent to being contacted by ERA or Enerva (ERA Service Provider) by email, text or other electronic means for program-related matters *
                                </FormLabel>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-6">
                    {currentStep > 1 && (
                      <Button type="button" variant="outline" onClick={prevStep}>
                        Previous
                      </Button>
                    )}
                    {currentStep < 4 ? (
                      <Button type="button" onClick={nextStep} className={currentStep === 1 ? "w-full" : "ml-auto"}>
                        Next
                      </Button>
                    ) : (
                      <Button type="submit" className="ml-auto" disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500 text-sm"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Right Column - Hero Section */}
      <div className="hidden lg:block relative flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800">
          <div className="flex items-center justify-center h-full px-8">
            <div className="max-w-md text-center text-white">
              <h2 className="text-4xl font-bold mb-6">
                Small and Medium-Scale Industrial Program
              </h2>
              <p className="text-xl mb-8 text-blue-100">
                Join Alberta's leading initiative to reduce industrial emissions and advance clean technology innovation.
              </p>
              <div className="space-y-4 text-left">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2"></div>
                  <p className="text-blue-100">Access funding opportunities for emission reduction projects</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2"></div>
                  <p className="text-blue-100">Connect with clean technology solutions and expertise</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2"></div>
                  <p className="text-blue-100">Track and report your environmental impact progress</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}