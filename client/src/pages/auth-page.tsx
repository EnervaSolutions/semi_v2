import { useState, useEffect } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect, useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import strategicEnergyLogo from "@/assets/strategic-energy.svg";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

// Base schema for registration
const baseRegisterSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  businessMobile: z.string().optional(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  role: z.enum(["company_admin", "team_member", "contractor_individual"], {
    errorMap: () => ({ message: "Please select an account type" })
  }),
  companyName: z.string().optional(),
  businessNumber: z.string().optional(),
  companyWebsite: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  howHeardAbout: z.string().optional(),
  howHeardAboutOther: z.string().optional(),
  acceptTerms: z.boolean().optional(),
  acceptBusinessInfo: z.boolean().optional(),
  acceptContact: z.boolean().optional(),
  // Contractor-specific fields
  serviceRegions: z.array(z.string()).optional(),
  supportedActivities: z.array(z.string()).optional(),
  capitalRetrofitTechnologies: z.array(z.string()).optional(),
  otherTechnology: z.string().optional(),
  codeOfConductAgreed: z.boolean().optional(),
  gstWcbInsuranceConfirmed: z.boolean().optional(),
  contractorCompanyExists: z.string().optional(),
  selectedCompanyId: z.number().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Full validation schema for final submission
const registerSchema = baseRegisterSchema.refine((data) => {
  if (data.role === "company_admin") {
    return data.firstName && data.lastName && 
           data.companyName && data.businessNumber && data.streetAddress && 
           data.city && data.province && data.country && data.postalCode && 
           data.howHeardAbout && data.acceptTerms && data.acceptBusinessInfo && data.acceptContact;
  }
  if (data.role === "contractor_individual") {
    return data.firstName && data.lastName && data.email && data.password &&
           data.serviceRegions && data.serviceRegions.length > 0 &&
           data.supportedActivities && data.supportedActivities.length > 0 &&
           data.codeOfConductAgreed && data.gstWcbInsuranceConfirmed;
  }
  return true;
}, {
  message: "All required fields must be completed",
  path: ["role"]
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

function getPasswordValidation(password: string) {
  return {
    minLength: password.length >= 8,
    maxLength: password.length <= 64,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

function isPasswordValid(password: string): boolean {
  const validation = getPasswordValidation(password);
  return validation.minLength && validation.maxLength && 
         validation.hasLowercase && validation.hasUppercase && 
         validation.hasDigit && validation.hasSymbol;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [companyNameValidation, setCompanyNameValidation] = useState<{
    isChecking: boolean;
    exists: boolean | null;
    message: string;
  }>({ isChecking: false, exists: null, message: "" });
  const [previewShortName, setPreviewShortName] = useState("");
  const [showTeamMemberSuccess, setShowTeamMemberSuccess] = useState(false);
  const [submittedCompanyName, setSubmittedCompanyName] = useState("");

  // Contractor-specific state
  const [selectedServiceRegions, setSelectedServiceRegions] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedCapitalRetrofitTechs, setSelectedCapitalRetrofitTechs] = useState<string[]>([]);
  const [otherTechnologyInput, setOtherTechnologyInput] = useState("");
  const [contractorCompanyExists, setContractorCompanyExists] = useState<string>("");
  
  // Company search state for contractors and team members
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [companySearchResults, setCompanySearchResults] = useState<any[]>([]);
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);
  const [companyNameExists, setCompanyNameExists] = useState(false);
  
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(baseRegisterSchema),
    defaultValues: {
      role: "company_admin",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",

      companyName: "",
      companyWebsite: "",
      streetAddress: "",
      city: "",
      province: "",
      country: "Canada",
      postalCode: "",
      howHeardAbout: "",
      howHeardAboutOther: "",
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
      // Map frontend data to backend format based on role
      let backendData: any = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        businessMobile: data.businessMobile,
        userType: data.role, // Map role to userType
        agreeToPortalServices: data.acceptTerms,
        agreeToBusinessInfo: data.acceptBusinessInfo,
        agreeToContact: data.acceptContact
      };

      // Add company-specific data for company admins
      if (data.role === "company_admin") {
        backendData = {
          ...backendData,
          companyName: data.companyName,
          companyShortName: generateShortName(data.companyName || ""),
          businessNumber: data.businessNumber,
          companyWebsite: data.companyWebsite,
          streetAddress: data.streetAddress,
          city: data.city,
          province: data.province,
          country: data.country,
          postalCode: data.postalCode,
          howHeardAbout: data.howHeardAbout,
          howHeardAboutOther: data.howHeardAboutOther
        };
      }

      // Add team member-specific data
      if (data.role === "team_member") {
        backendData = {
          ...backendData,
          companyName: data.companyName
        };
      }

      // Add contractor-specific data
      if (data.role === "contractor_individual") {
        backendData = {
          ...backendData,
          // Contractor company info
          contractorCompanyExists: data.contractorCompanyExists,
          companyName: data.companyName,
          companyShortName: previewShortName || generateShortName(data.companyName || ""),
          selectedCompanyId: data.selectedCompanyId,
          
          // Address info
          streetAddress: data.streetAddress,
          city: data.city,
          province: data.province,
          country: data.country,
          postalCode: data.postalCode,
          
          // Service details
          serviceRegions: data.serviceRegions || [],
          supportedActivities: data.supportedActivities || [],
          
          // Specific activity technologies
          capitalRetrofitTechnologies: data.capitalRetrofitTechnologies || [],
          otherTechnology: data.otherTechnology,
          
          // Compliance and obligations
          acceptTerms: data.acceptTerms,
          acceptBusinessInfo: data.acceptBusinessInfo,
          acceptContact: data.acceptContact,
          codeOfConductAgreed: data.codeOfConductAgreed,
          gstWcbInsuranceConfirmed: data.gstWcbInsuranceConfirmed
        };
      }
      
      console.log("Sending registration data:", backendData);
      const res = await apiRequest("/api/auth/register", "POST", backendData);
      return await res.json();
    },
    onSuccess: (data, variables) => {
      console.log("🎯 Registration success response:", data);
      console.log("🎯 Variables used:", variables);
      
      // Check if this is a team member registration that needs approval
      if (data.isPending || (variables.role === "team_member" && data.message?.includes("pending approval"))) {
        // Show success popup for team members
        if (variables.role === "team_member") {
          setSubmittedCompanyName(variables.companyName || "");
          setShowTeamMemberSuccess(true);
          // Don't switch to login or redirect - let the popup handle this
        } else {
          toast({
            title: "Registration submitted",
            description: "Your request is pending approval from your company administrator. You will receive an email confirmation once approved."
          });
          setIsLogin(true); // Switch to login form
        }
        registerForm.reset(); // Clear the form
      } else if (data.requiresEmailVerification) {
        // Handle email verification flow (for team members and company admins)
        console.log("🔗 Email verification required, showing verification modal");
        setPendingEmail(data.email || variables.email);
        setShowEmailVerification(true);
        toast({
          title: "Registration successful!",
          description: "Please check your email for the verification code to complete your account setup."
        });
      } else {
        // Successful registration without additional steps (contractors and verified company owners)
        toast({
          title: "Account created successfully",
          description: data.message || "Welcome to the SEMI program!"
        });
        // Invalidate auth query to update authentication state
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        // Redirect based on redirectTo or user role
        if (data.redirectTo) {
          window.location.href = data.redirectTo;
        } else if (variables.role === "contractor_individual") {
          window.location.href = "/contractor-dashboard";
        } else {
          window.location.href = "/";
        }
      }
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
      const res = await apiRequest("/api/auth/login", "POST", data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.requiresTwoFactor) {
        setShowTwoFactor(true);
        setLoginEmail(loginForm.getValues("email"));
        toast({
          title: "Two-Factor Authentication Required",
          description: "Please enter your authentication code"
        });
      } else if (data.isTemporaryPassword) {
        setShowPasswordChangeModal(true);
        toast({
          title: "Password Change Required",
          description: "You're using a temporary password. Please set a new password to continue."
        });
      } else {
        toast({
          title: "Login successful",
          description: "Welcome back!"
        });
        // Invalidate auth query to update authentication state
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        // Force a page reload to properly update auth state
        window.location.href = "/";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const twoFactorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/auth/login", "POST", {
        email: loginEmail,
        password: loginForm.getValues("password"),
        twoFactorToken: twoFactorCode
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Login successful",
        description: "Welcome back!"
      });
      setShowTwoFactor(false);
      setTwoFactorCode("");
      // Invalidate auth query to update authentication state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Redirect to appropriate dashboard based on user role
      if (data.user?.role === 'system_admin') {
        window.location.href = "/admin";
      } else if (data.user?.role === 'contractor_individual' || data.user?.role === 'contractor_team_member' || data.user?.role === 'contractor_account_owner' || data.user?.role === 'contractor_manager') {
        window.location.href = "/";
      } else {
        window.location.href = "/";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const sendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("/api/auth/send-registration-verification", "POST", { email });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification code sent",
        description: "Please check your email for the verification code"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send verification code",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const res = await apiRequest("/api/auth/verify-registration-code", "POST", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email verified successfully",
        description: "You can now continue with registration"
      });
      setShowEmailVerification(false);
      setVerificationCode("");
      setIsTransitioning(true);
      setCurrentStep(2);
      setTimeout(() => setIsTransitioning(false), 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Post-registration email verification for existing users
  const verifyPostRegistrationMutation = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const res = await apiRequest("/api/auth/verify-code", "POST", data);
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("🎯 Post-registration verification success:", data);
      toast({
        title: "Email verified successfully",
        description: "Welcome to the SEMI program!"
      });
      // Invalidate auth query to update authentication state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect based on user role or redirectTo response
      if (data.redirectTo) {
        console.log("🚀 Redirecting to:", data.redirectTo);
        window.location.href = data.redirectTo;
      } else if (data.user?.role === "contractor_individual") {
        console.log("🚀 Redirecting contractor to dashboard");
        window.location.href = "/contractor-dashboard";
      } else {
        console.log("🚀 Redirecting to home");
        window.location.href = "/";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("/api/auth/forgot-password", "POST", { email });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset email sent",
        description: "Check your email for a temporary password to log in.",
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Change password mutation for temporary passwords
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const res = await apiRequest("/api/auth/change-password", "POST", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated successfully",
        description: "Your password has been changed. You can now use your new password to log in.",
      });
      setShowPasswordChangeModal(false);
      setNewPassword("");
      setConfirmNewPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update password",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Company search function for contractors and team members
  const handleCompanySearch = async (query: string) => {
    setCompanySearchQuery(query);
    
    if (query.length < 2) {
      setCompanySearchResults([]);
      return;
    }

    setIsSearchingCompanies(true);
    try {
      const res = await apiRequest(`/api/companies/search?q=${encodeURIComponent(query)}`, "GET");
      const companies = await res.json();
      setCompanySearchResults(companies);
    } catch (error) {
      console.error("Company search error:", error);
      setCompanySearchResults([]);
    } finally {
      setIsSearchingCompanies(false);
    }
  };

  // Company name validation for new contractor companies
  const handleCompanyNameCheck = async (companyName: string) => {
    if (companyName.length < 2) {
      setCompanyNameExists(false);
      return;
    }

    try {
      const res = await apiRequest(`/api/companies/check-name?name=${encodeURIComponent(companyName)}`, "GET");
      const result = await res.json();
      setCompanyNameExists(result.exists);
    } catch (error) {
      console.error("Company name check error:", error);
      setCompanyNameExists(false);
    }
  };

  // Short name preview for contractors
  const handleShortNamePreview = async (companyName: string) => {
    if (companyName.length < 2) {
      setPreviewShortName("");
      return;
    }

    try {
      const res = await fetch('/api/companies/preview-shortname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim() })
      });
      
      if (res.ok) {
        const result = await res.json();
        setPreviewShortName(result.shortName || "");
      } else {
        console.error("Short name preview failed:", res.status);
        setPreviewShortName("");
      }
    } catch (error) {
      console.error("Short name preview error:", error);
      setPreviewShortName("");
    }
  };

  const onRegister = async (data: RegisterData) => {
    console.log("🔥 onRegister called with:", {
      role: data.role,
      currentStep,
      selectedRole,
      timestamp: new Date().toISOString()
    });
    
    // For company admins, only allow submission on step 4
    if (data.role === "company_admin" && currentStep !== 4) {
      console.log("🚫 Blocked premature submission on step", currentStep);
      toast({
        title: "Form submission blocked",
        description: `Registration can only be completed on step 4. Currently on step ${currentStep}.`,
        variant: "destructive"
      });
      return; // Prevent premature submission
    }

    // For team members, only allow submission on step 2
    if (data.role === "team_member" && currentStep !== 2) {
      console.log("🚫 Blocked team member premature submission on step", currentStep);
      toast({
        title: "Form submission blocked",
        description: `Team member registration can only be completed on step 2. Currently on step ${currentStep}.`,
        variant: "destructive"
      });
      return; // Prevent premature submission
    }

    // For contractors, only allow submission on step 4
    if (data.role === "contractor_individual" && currentStep !== 4) {
      console.log("🚫 Blocked contractor premature submission on step", currentStep);
      toast({
        title: "Form submission blocked",
        description: `Contractor registration can only be completed on step 4. Currently on step ${currentStep}.`,
        variant: "destructive"
      });
      return; // Prevent premature submission
    }
    
    console.log("✅ Proceeding with registration submission");
    
    // For team members, validate only required fields
    if (data.role === "team_member") {
      const teamMemberRequiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'role', 'companyName'];
      const missingFields = teamMemberRequiredFields.filter(field => !data[field as keyof RegisterData]);
      
      if (missingFields.length > 0) {
        console.log("❌ Team member validation failed, missing fields:", missingFields);
        toast({
          title: "Registration failed",
          description: "Please complete all required fields",
          variant: "destructive"
        });
        return;
      }
    } else {
      // For company admins, validate against the full schema
      const validationResult = registerSchema.safeParse(data);
      if (!validationResult.success) {
        console.log("❌ Validation failed:", validationResult.error.errors);
        toast({
          title: "Registration failed",
          description: "Please complete all required fields",
          variant: "destructive"
        });
        return;
      }
    }
    
    registerMutation.mutate(data);
  };

  const onLogin = async (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onTwoFactorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length === 6) {
      twoFactorMutation.mutate();
    }
  };

  // Watch values
  const selectedRole = registerForm.watch("role");
  const companyName = registerForm.watch("companyName");
  const generatedShortName = previewShortName || generateShortName(companyName || "");
  const howHeardAbout = registerForm.watch("howHeardAbout");
  const watchedPassword = registerForm.watch("password");
  const watchedConfirmPassword = registerForm.watch("confirmPassword");

  // Debounced company name validation and short name preview
  useEffect(() => {
    if (!companyName || companyName.length < 2) {
      setCompanyNameValidation({ isChecking: false, exists: null, message: "" });
      setPreviewShortName("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCompanyNameValidation({ isChecking: true, exists: false, message: "Checking..." });
      
      try {
        // Check company name availability
        const nameResponse = await fetch(`/api/companies/check-name?name=${encodeURIComponent(companyName.trim())}`);
        const nameData = await nameResponse.json();
        
        // Get short name preview
        const shortNameResponse = await fetch('/api/companies/preview-shortname', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: companyName.trim() })
        });
        const shortNameData = await shortNameResponse.json();
        
        if (selectedRole === "company_admin") {
          // For company admins, existing company is a conflict
          if (nameData.exists) {
            setCompanyNameValidation({
              isChecking: false,
              exists: true,
              message: "This company name already exists in our system. If your company is already registered in the SEMI program, please register as an individual user to join the company. If you believe this is an error, please contact support at techsupport@semiprogram.ca"
            });
            setPreviewShortName("");
          } else {
            setCompanyNameValidation({
              isChecking: false,
              exists: false,
              message: "Company name is available"
            });
            setPreviewShortName(shortNameData.shortName || "");
          }
        } else if (selectedRole === "team_member") {
          // For team members, company must exist
          if (nameData.exists) {
            setCompanyNameValidation({
              isChecking: false,
              exists: true,
              message: "Company found! You can proceed with registration."
            });
            setPreviewShortName("");
          } else {
            setCompanyNameValidation({
              isChecking: false,
              exists: false,
              message: "Company not found. Please verify the exact company name or contact your company administrator."
            });
            setPreviewShortName("");
          }
        }
      } catch (error) {
        setCompanyNameValidation({
          isChecking: false,
          exists: false,
          message: "Unable to verify company name. Please try again."
        });
        setPreviewShortName("");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [companyName]);
  
  // Password validation helpers
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, feedback: [] };
    
    const feedback = [];
    let score = 0;
    
    if (password.length >= 8) score += 1;
    else feedback.push("At least 8 characters");
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("One uppercase letter");
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("One lowercase letter");
    
    if (/\d/.test(password)) score += 1;
    else feedback.push("One number");
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push("One special character");
    
    return { score, feedback };
  };
  
  const passwordStrength = getPasswordStrength(watchedPassword || "");
  const passwordsMatch = watchedPassword && watchedConfirmPassword && watchedPassword === watchedConfirmPassword;

  // Step navigation functions for company admin only
  const nextStep = async () => {
    console.log("🚀 nextStep called on step", currentStep);
    const fieldsToValidate = getFieldsForStep(currentStep);
    console.log("📋 Fields to validate:", fieldsToValidate);
    
    // Validate each field manually without triggering form submission
    const formData = registerForm.getValues();
    console.log("📊 Current form data:", formData);
    let isValid = true;
    
    // Clear previous errors for these fields
    fieldsToValidate.forEach(field => {
      registerForm.clearErrors(field);
    });
    
    // Check for company name conflicts before validating other fields
    if (currentStep === 2 && selectedRole === "company_admin" && companyNameValidation.exists) {
      toast({
        title: "Company name conflict",
        description: "This company name already exists. Please choose a different name or register as an individual user.",
        variant: "destructive"
      });
      return;
    }

    // This section was removed - team members now go through email verification like company admins

    // For team members step 2, do NOT advance to step 3 - this should trigger form submission instead
    if (selectedRole === "team_member" && currentStep === 2) {
      console.log("🚫 Team member should not advance past step 2 - this should be handled by form submission");
      // Check that company exists before allowing submission
      if (!companyNameValidation.exists) {
        toast({
          title: "Company not found",
          description: "The company name you entered was not found. Please verify the exact company name or contact your company administrator.",
          variant: "destructive"
        });
      }
      return; // Don't advance to step 3
    }

    for (const field of fieldsToValidate) {
      const value = formData[field];
      
      // Check if required field is empty
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        console.log(`❌ Field ${field} is empty:`, value);
        registerForm.setError(field, { message: `${field} is required` });
        isValid = false;
      }
      
      // Additional validation for specific fields
      if (field === 'email' && value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          console.log(`❌ Invalid email format:`, value);
          registerForm.setError(field, { message: 'Please enter a valid email address' });
          isValid = false;
        }
      }
      
      if (field === 'confirmPassword' && value !== formData.password) {
        console.log(`❌ Passwords don't match:`, { password: formData.password, confirmPassword: value });
        registerForm.setError(field, { message: 'Passwords do not match' });
        isValid = false;
      }
    }
    
    if (isValid) {
      console.log("✅ Validation passed, moving to next step");
      
      // Company admins, team members, and contractors require email verification after step 1
      if ((selectedRole === "company_admin" || selectedRole === "team_member" || selectedRole === "contractor_individual") && currentStep === 1) {
        const email = registerForm.getValues("email");
        setPendingEmail(email);
        setShowEmailVerification(true);
        // Send verification code automatically
        sendVerificationMutation.mutate(email);
        return;
      }
      
      setIsTransitioning(true);
      setCurrentStep(prev => prev + 1);
      // Clear transition flag after a brief delay to allow re-render
      setTimeout(() => setIsTransitioning(false), 100);
    } else {
      console.log("❌ Validation failed, staying on current step");
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const getFieldsForStep = (step: number): (keyof RegisterData)[] => {
    if (selectedRole === "team_member") {
      switch (step) {
        case 1:
          return ["firstName", "lastName", "email", "password", "confirmPassword", "role"];
        case 2:
          return ["companyName"]; // Only company name for team members
        default:
          return [];
      }
    } else if (selectedRole === "company_admin") {
      switch (step) {
        case 1:
          return ["firstName", "lastName", "email", "password", "confirmPassword", "role"];
        case 2:
          return ["companyName", "businessNumber"];
        case 3:
          return ["streetAddress", "city", "province", "country", "postalCode"];
        case 4:
          return ["howHeardAbout", "howHeardAboutOther", "acceptTerms", "acceptBusinessInfo", "acceptContact"];
        default:
          return [];
      }
    } else if (selectedRole === "contractor_individual") {
      switch (step) {
        case 1:
          return ["firstName", "lastName", "email", "password", "confirmPassword", "role"];
        case 2:
          return ["contractorCompanyExists", "companyName"];
        case 3:
          return ["serviceRegions", "supportedActivities"];
        case 4:
          return ["codeOfConductAgreed", "gstWcbInsuranceConfirmed"];
        default:
          return [];
      }
    }
    return [];
  };

  const getStepTitle = (step: number, role?: string): string => {
    if (role === "team_member") {
      switch (step) {
        case 1:
          return "Personal Information";
        case 2:
          return "Company Information";
        default:
          return "";
      }
    } else if (role === "company_admin") {
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
    } else if (role === "contractor_individual") {
      switch (step) {
        case 1:
          return "Personal Information";
        case 2:
          return "Service Regions";
        case 3:
          return "Supported Activities";
        case 4:
          return "Verification & Compliance";
        default:
          return "";
      }
    }
    return "";
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Column - Hero Section */}
      <div className="hidden lg:block relative w-1/2">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200">
          <div className="absolute top-6 left-6">
            <img 
              src={strategicEnergyLogo} 
              alt="Strategic Energy Management Initiative" 
              className="h-16 cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => window.location.href = '/'}
            />
          </div>
          <div className="flex items-center justify-center h-full px-8">
            <div className="max-w-md text-gray-700">
              <h2 className="text-4xl font-bold mb-6 text-gray-800">
                Strategic Energy Management for Industry (SEMI)
              </h2>
              <p className="text-xl mb-8 text-gray-600">
                Elevate energy performance, strengthen expertise, and secure ongoing savings for Alberta's industrial and manufacturing facilities.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-gray-600">Up to 50% funding for energy-saving projects</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-gray-600">Expert training and capacity building</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-gray-600">Reduce costs and greenhouse gas emissions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* SEMI Logo */}
          <div className="mb-8 flex justify-end">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">SEMI</div>
              <div className="text-sm text-gray-500">Program Portal</div>
            </div>
          </div>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>{isLogin ? "Sign In" : "Create Account"}</CardTitle>
              <CardDescription>
                {isLogin ? "Enter your credentials to access your account" : "Create your SEMI program account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Progress indicator - show after role selection */}
              {!isLogin && (selectedRole === "company_admin" || selectedRole === "team_member" || selectedRole === "contractor_individual") && currentStep > 1 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    {selectedRole === "team_member" ? (
                      // Team member progress: 2 steps
                      [1, 2].map((step) => (
                        <div key={step} className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            step <= currentStep 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {step}
                          </div>
                          {step < 2 && (
                            <div className={`w-32 h-1 mx-2 ${
                              step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                            }`} />
                          )}
                        </div>
                      ))
                    ) : selectedRole === "contractor_individual" ? (
                      // Contractor progress: 4 steps
                      [1, 2, 3, 4].map((step) => (
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
                      ))
                    ) : (
                      // Company admin progress: 4 steps
                      [1, 2, 3, 4].map((step) => (
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
                      ))
                    )}
                  </div>
                  <div className="text-sm text-gray-600 text-center">
                    Step {currentStep} of {selectedRole === "team_member" ? "2" : "4"}: {getStepTitle(currentStep, selectedRole)}
                  </div>
                </div>
              )}

              {isLogin ? (
                showTwoFactor ? (
                  <form onSubmit={onTwoFactorSubmit} className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app</p>
                    </div>
                    <div>
                      <Label htmlFor="twoFactorCode">Authentication Code *</Label>
                      <Input
                        id="twoFactorCode"
                        type="text"
                        placeholder="000000"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="text-center text-lg tracking-widest"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700" 
                      disabled={twoFactorMutation.isPending || twoFactorCode.length !== 6}
                    >
                      {twoFactorMutation.isPending ? "Verifying..." : "Verify Code"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => {
                        setShowTwoFactor(false);
                        setTwoFactorCode("");
                      }}
                    >
                      Back to Login
                    </Button>
                  </form>
                ) : (
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
                              <div className="relative">
                                <Input 
                                  type={showPassword ? "text" : "password"} 
                                  placeholder="Enter your password" 
                                  {...field} 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loginMutation.isPending}>
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                      
                      {/* Forgot Password Link */}
                      <div className="text-center">
                        <ForgotPasswordModal />
                      </div>
                    </form>
                  </Form>
                )
              ) : (
                <Form {...registerForm}>
                  <form 
                    onSubmit={(e) => {
                      console.log("🎯 Form onSubmit triggered!", {
                        selectedRole,
                        currentStep,
                        isTransitioning,
                        submitter: (e.nativeEvent as any)?.submitter?.textContent,
                        timestamp: new Date().toISOString()
                      });
                      
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Block submission if we're transitioning between steps
                      if (isTransitioning) {
                        console.log("🚫 Blocking form submission - transitioning between steps");
                        return;
                      }
                      
                      // Only allow submission on step 4 for company admins
                      if (selectedRole === "company_admin" && currentStep === 4) {
                        console.log("✅ Allowing company admin form submission on step 4");
                        registerForm.handleSubmit(onRegister)(e);
                      } else if (selectedRole === "team_member" && currentStep === 2) {
                        console.log("✅ Allowing team member form submission on step 2");
                        registerForm.handleSubmit(onRegister)(e);
                      } else if (selectedRole === "contractor_individual" && currentStep === 4) {
                        console.log("✅ Allowing contractor form submission on step 4");
                        registerForm.handleSubmit(onRegister)(e);
                      } else {
                        console.log("🚫 Blocking form submission - invalid step/role combination", {
                          selectedRole,
                          currentStep,
                          expected: selectedRole === "company_admin" ? "step 4" : selectedRole === "team_member" ? "step 2" : "any step for contractor"
                        });
                      }
                    }}
                    className="space-y-6"
                  >
                    {selectedRole === "company_admin" || selectedRole === "team_member" || selectedRole === "contractor_individual" ? (
                      // Multi-step registration for company admins, team members, and contractors
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
                                <FormItem className="space-y-3">
                                  <FormLabel>What type of account are you creating? *</FormLabel>
                                  <FormControl>
                                    <div className="space-y-3">
                                      <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                                        <input
                                          type="radio"
                                          id="company_admin"
                                          value="company_admin"
                                          checked={field.value === "company_admin"}
                                          onChange={() => field.onChange("company_admin")}
                                          className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                                        />
                                        <div className="flex-1">
                                          <label htmlFor="company_admin" className="font-medium text-gray-900 cursor-pointer">Company Owner</label>
                                          <p className="text-sm text-gray-500">I'm registering my company for the SEMI program</p>
                                        </div>
                                      </div>
                                      <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                                        <input
                                          type="radio"
                                          id="team_member"
                                          value="team_member"
                                          checked={field.value === "team_member"}
                                          onChange={() => field.onChange("team_member")}
                                          className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                                        />
                                        <div className="flex-1">
                                          <label htmlFor="team_member" className="font-medium text-gray-900 cursor-pointer">Team Member</label>
                                          <p className="text-sm text-gray-500">I work for a company already registered</p>
                                        </div>
                                      </div>
                                      <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                                        <input
                                          type="radio"
                                          id="contractor_individual"
                                          value="contractor_individual"
                                          checked={field.value === "contractor_individual"}
                                          onChange={() => field.onChange("contractor_individual")}
                                          className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                                        />
                                        <div className="flex-1">
                                          <label htmlFor="contractor_individual" className="font-medium text-gray-900 cursor-pointer">Contractor</label>
                                          <p className="text-sm text-gray-500">I provide services to companies in the program</p>
                                        </div>
                                      </div>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={registerForm.control}
                                name="password"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Password *</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Input 
                                          type={showPassword ? "text" : "password"} 
                                          placeholder="Enter your password" 
                                          {...field} 
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                          onClick={() => setShowPassword(!showPassword)}
                                        >
                                          {showPassword ? (
                                            <EyeOff className="h-4 w-4 text-gray-500" />
                                          ) : (
                                            <Eye className="h-4 w-4 text-gray-500" />
                                          )}
                                        </Button>
                                      </div>
                                    </FormControl>
                                    {watchedPassword && (
                                      <div className="mt-2 space-y-1">
                                        <div className="flex gap-1">
                                          {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                              key={i}
                                              className={`h-1 flex-1 rounded ${
                                                i <= passwordStrength.score
                                                  ? passwordStrength.score < 3
                                                    ? "bg-red-500"
                                                    : passwordStrength.score < 5
                                                    ? "bg-yellow-500"
                                                    : "bg-green-500"
                                                  : "bg-gray-300"
                                              }`}
                                            />
                                          ))}
                                        </div>
                                        {passwordStrength.feedback.length > 0 && (
                                          <div className="text-xs text-gray-600">
                                            Password needs: {passwordStrength.feedback.join(", ")}
                                          </div>
                                        )}
                                      </div>
                                    )}
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
                                      <div className="relative">
                                        <Input 
                                          type={showConfirmPassword ? "text" : "password"} 
                                          placeholder="Confirm your password" 
                                          {...field} 
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                          {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4 text-gray-500" />
                                          ) : (
                                            <Eye className="h-4 w-4 text-gray-500" />
                                          )}
                                        </Button>
                                      </div>
                                    </FormControl>
                                    {watchedConfirmPassword && (
                                      <div className="mt-2">
                                        {passwordsMatch ? (
                                          <div className="text-xs text-green-600 flex items-center gap-1">
                                            <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                              <div className="w-1 h-1 bg-white rounded-full"></div>
                                            </div>
                                            Passwords match
                                          </div>
                                        ) : (
                                          <div className="text-xs text-red-600">
                                            Passwords do not match
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}

                        {/* Step 2: Business/Company Information */}
                        {currentStep === 2 && selectedRole !== "contractor_individual" && (
                          <div className="space-y-4">
                            {selectedRole === "company_admin" && (
                              <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Tell us about your company to set up your SEMI program account
                                </p>
                              </div>
                            )}
                            {selectedRole === "team_member" && (
                              <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Find Your Company</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Enter the exact name of your company as it was registered in the SEMI program
                                </p>
                              </div>
                            )}
                            <FormField
                              control={registerForm.control}
                              name="companyName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Company Name *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder={selectedRole === "team_member" ? "Enter your company's exact name" : "Enter your company name"} 
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        // This is handled by the useEffect hook for debounced validation
                                      }}
                                      className={
                                        (selectedRole === "company_admin" && companyNameValidation.exists) ||
                                        (selectedRole === "team_member" && !companyNameValidation.exists && companyNameValidation.message)
                                          ? "border-red-500"
                                          : ""
                                      }
                                    />
                                  </FormControl>
                                  {companyNameValidation.message && (
                                    <div className={`text-xs mt-1 ${
                                      companyNameValidation.isChecking 
                                        ? "text-blue-600" 
                                        : selectedRole === "company_admin"
                                        ? (companyNameValidation.exists ? "text-red-600" : "text-green-600")
                                        : selectedRole === "team_member"
                                        ? (companyNameValidation.exists ? "text-green-600" : "text-red-600")
                                        : "text-gray-600"
                                    }`}>
                                      {companyNameValidation.isChecking && (
                                        <span className="inline-block animate-spin mr-1">⟳</span>
                                      )}
                                      {companyNameValidation.message}
                                    </div>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {selectedRole === "team_member" && companyNameValidation.exists && (
                              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                <p className="text-sm text-green-800">
                                  <strong>Company found!</strong> You can now submit your registration request. 
                                  Your company administrator will need to approve your access.
                                </p>
                              </div>
                            )}

                            {selectedRole === "company_admin" && (
                              <>
                                <FormField
                                  control={registerForm.control}
                                  name="businessNumber"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Business Number *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Enter your business phone number" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
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
                                
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-900">Company Short Name (Auto-generated)</Label>
                                  <Input 
                                    value={previewShortName}
                                    readOnly
                                    disabled
                                    placeholder="Will be generated from company name"
                                    className="bg-gray-50 text-gray-700 border-gray-200"
                                  />
                                  <p className="text-xs text-gray-500">
                                    Auto-generated for system identification
                                  </p>
                                </div>
                              </>
                            )}

                            {selectedRole === "team_member" && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-blue-800 mb-2">Team Member Registration</h4>
                                <p className="text-sm text-blue-700 mb-2">
                                  You're registering to join an existing company in the SEMI program.
                                </p>
                                <ul className="text-xs text-blue-600 space-y-1">
                                  <li>• Your registration will be sent for approval</li>
                                  <li>• You'll receive an email confirmation once approved</li>
                                  <li>• Contact your company administrator if you need assistance</li>
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step 3: Address Information - Only for company admins and team members */}
                        {currentStep === 3 && selectedRole !== "contractor_individual" && (
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField
                                control={registerForm.control}
                                name="country"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Country *</FormLabel>
                                    <FormControl>
                                      <Select onValueChange={field.onChange} defaultValue="Canada" value="Canada" disabled>
                                        <SelectTrigger className="bg-gray-50 text-gray-700 border-gray-200">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Canada">Canada</SelectItem>
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
                                          <SelectItem value="eblast">E-blast</SelectItem>
                                          <SelectItem value="webinar">Webinar</SelectItem>
                                          <SelectItem value="event">Event</SelectItem>
                                          <SelectItem value="program staff">Program Staff</SelectItem>
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
                                        I agree to the{" "}
                                        <a 
                                          href="/src/assets/semi-portal-services-agreement.pdf" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                          Portal Services Agreement
                                        </a>{" "}
                                        *
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

                        {/* Contractor-specific steps */}
                        {selectedRole === "contractor_individual" && (
                          <>
                            {/* Step 2: Company Validation */}
                            {currentStep === 2 && (
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  <h4 className="text-md font-medium text-gray-900">Contracting Company</h4>
                                  <p className="text-sm text-gray-600">Is your contracting company already part of the SEMI portal?</p>
                                  
                                  <div className="space-y-3">
                                    <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                                      <input
                                        type="radio"
                                        id="company_exists_yes"
                                        value="yes"
                                        checked={contractorCompanyExists === "yes"}
                                        onChange={() => {
                                          setContractorCompanyExists("yes");
                                          registerForm.setValue("contractorCompanyExists", "yes");
                                        }}
                                        className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                                      />
                                      <div className="flex-1">
                                        <label htmlFor="company_exists_yes" className="font-medium text-gray-900 cursor-pointer">Yes, my company is already registered</label>
                                        <p className="text-sm text-gray-500">I want to join an existing contracting company</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                                      <input
                                        type="radio"
                                        id="company_exists_no"
                                        value="no"
                                        checked={contractorCompanyExists === "no"}
                                        onChange={() => {
                                          setContractorCompanyExists("no");
                                          registerForm.setValue("contractorCompanyExists", "no");
                                        }}
                                        className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                                      />
                                      <div className="flex-1">
                                        <label htmlFor="company_exists_no" className="font-medium text-gray-900 cursor-pointer">No, I need to add my contracting company</label>
                                        <p className="text-sm text-gray-500">My contracting company is not yet registered in the portal</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Company Search (if exists) */}
                                {contractorCompanyExists === "yes" && (
                                  <div className="space-y-4">
                                    <FormField
                                      control={registerForm.control}
                                      name="companyName"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Search for your contracting company *</FormLabel>
                                          <FormControl>
                                            <Input 
                                              placeholder="Start typing your company name..." 
                                              {...field}
                                              onChange={(e) => {
                                                field.onChange(e);
                                                if (e.target.value.length > 2) {
                                                  handleCompanySearch(e.target.value);
                                                }
                                              }}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    {/* Company search results */}
                                    {companySearchResults.length > 0 && (
                                      <div className="mt-2 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                                        {companySearchResults.map((company) => (
                                          <div
                                            key={company.id}
                                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                            onClick={() => {
                                              registerForm.setValue("companyName", company.name);
                                              registerForm.setValue("selectedCompanyId", company.id);
                                              setCompanySearchResults([]);
                                            }}
                                          >
                                            <div className="font-medium text-gray-900">{company.name}</div>
                                            <div className="text-sm text-gray-500">{company.shortName}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {companySearchQuery && companySearchResults.length === 0 && !isSearchingCompanies && (
                                      <div className="text-sm text-gray-500 mt-2">
                                        No companies found. Please check the spelling or select "No" above to add a new company.
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* New Company (if doesn't exist) */}
                                {contractorCompanyExists === "no" && (
                                  <div className="space-y-4">
                                    <FormField
                                      control={registerForm.control}
                                      name="companyName"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Contracting Company Name *</FormLabel>
                                          <FormControl>
                                            <Input 
                                              placeholder="Enter your contracting company name" 
                                              {...field}
                                              onChange={(e) => {
                                                field.onChange(e);
                                                // Check if company already exists and generate short name preview
                                                if (e.target.value.length > 2) {
                                                  handleCompanyNameCheck(e.target.value);
                                                  handleShortNamePreview(e.target.value);
                                                }
                                              }}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                          {companyNameExists && (
                                            <p className="text-sm text-red-600 mt-1">
                                              This company name already exists. Please select "Yes" above to join the existing company.
                                            </p>
                                          )}
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-gray-900">Company Short Name (Auto-generated)</Label>
                                      <Input 
                                        value={previewShortName}
                                        readOnly
                                        disabled
                                        placeholder="Will be generated from company name"
                                        className="bg-gray-50 text-gray-700 border-gray-200"
                                      />
                                      <p className="text-xs text-gray-500">
                                        Auto-generated for system identification (up to 6 characters)
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Step 3: Address & Activities */}
                            {currentStep === 3 && (
                              <div className="space-y-6">
                                {/* Address Section - For all contractors */}
                                <div className="space-y-4">
                                  <h4 className="text-md font-medium text-gray-900">Business Address</h4>
                                  <p className="text-sm text-gray-600">Please provide your business address for service delivery</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                      control={registerForm.control}
                                      name="streetAddress"
                                      render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                          <FormLabel>Street Address *</FormLabel>
                                          <FormControl>
                                            <Input placeholder="123 Main Street" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={registerForm.control}
                                      name="city"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>City *</FormLabel>
                                          <FormControl>
                                            <Input placeholder="Calgary" {...field} />
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
                                                <SelectItem value="Saskatchewan">Saskatchewan</SelectItem>
                                                <SelectItem value="Manitoba">Manitoba</SelectItem>
                                                <SelectItem value="Ontario">Ontario</SelectItem>
                                                <SelectItem value="Quebec">Quebec</SelectItem>
                                                <SelectItem value="New Brunswick">New Brunswick</SelectItem>
                                                <SelectItem value="Nova Scotia">Nova Scotia</SelectItem>
                                                <SelectItem value="Prince Edward Island">Prince Edward Island</SelectItem>
                                                <SelectItem value="Newfoundland and Labrador">Newfoundland and Labrador</SelectItem>
                                                <SelectItem value="Northwest Territories">Northwest Territories</SelectItem>
                                                <SelectItem value="Nunavut">Nunavut</SelectItem>
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

                                {/* Service Regions */}
                                <div className="space-y-4">
                                  <h4 className="text-md font-medium text-gray-900">Service Regions</h4>
                                  <p className="text-sm text-gray-600">Please select which regions in Alberta you will offer your services</p>
                                  <div className="space-y-3">
                                    {[
                                      "Calgary and Area",
                                      "Edmonton and Area", 
                                      "Lethbridge and Area",
                                      "Medicine Hat and Area",
                                      "Red Deer and Area",
                                      "Fort McMurray and Area",
                                      "Other Parts of Alberta"
                                    ].map((region) => (
                                      <div key={region} className="flex items-center space-x-3">
                                        <Checkbox
                                          id={region}
                                          checked={selectedServiceRegions.includes(region)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedServiceRegions([...selectedServiceRegions, region]);
                                              registerForm.setValue("serviceRegions", [...selectedServiceRegions, region]);
                                            } else {
                                              const updated = selectedServiceRegions.filter(r => r !== region);
                                              setSelectedServiceRegions(updated);
                                              registerForm.setValue("serviceRegions", updated);
                                            }
                                          }}
                                        />
                                        <label htmlFor={region} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                          {region}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Supported Activities */}
                                <div className="space-y-4">
                                  <h4 className="text-md font-medium text-gray-900">Supported Activities</h4>
                                  <p className="text-sm text-gray-600">Please select which activities you will support</p>
                                  <div className="space-y-3">
                                    {[
                                      "Capital Retrofit",
                                      "Energy Management Information System",
                                      "Energy Auditing and Assessment"
                                    ].map((activity) => (
                                      <div key={activity} className="flex items-center space-x-3">
                                        <Checkbox
                                          id={activity}
                                          checked={selectedActivities.includes(activity)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedActivities([...selectedActivities, activity]);
                                              registerForm.setValue("supportedActivities", [...selectedActivities, activity]);
                                            } else {
                                              const updated = selectedActivities.filter(a => a !== activity);
                                              setSelectedActivities(updated);
                                              registerForm.setValue("supportedActivities", updated);
                                            }
                                          }}
                                        />
                                        <label htmlFor={activity} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                          {activity}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Capital Retrofit Technologies */}
                                {selectedActivities.includes("Capital Retrofit") && (
                                  <div className="space-y-4">
                                    <h4 className="text-md font-medium text-gray-900">Capital Retrofit Technologies</h4>
                                    <p className="text-sm text-gray-600">Please select which technology for Capital Retrofits you will support</p>
                                    <div className="space-y-3">
                                      {[
                                        "Lighting",
                                        "Solar PV", 
                                        "HVAC",
                                        "Process Heating",
                                        "Process Cooling and Refrigeration",
                                        "Geothermal",
                                        "Pump Driven Systems",
                                        "Fan Driven Systems",
                                        "Compressed Air",
                                        "Building Envelope",
                                        "Other"
                                      ].map((tech) => (
                                        <div key={tech} className="flex items-center space-x-3">
                                          <Checkbox
                                            id={tech}
                                            checked={selectedCapitalRetrofitTechs.includes(tech)}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                setSelectedCapitalRetrofitTechs([...selectedCapitalRetrofitTechs, tech]);
                                                registerForm.setValue("capitalRetrofitTechnologies", [...selectedCapitalRetrofitTechs, tech]);
                                              } else {
                                                const updated = selectedCapitalRetrofitTechs.filter(t => t !== tech);
                                                setSelectedCapitalRetrofitTechs(updated);
                                                registerForm.setValue("capitalRetrofitTechnologies", updated);
                                              }
                                            }}
                                          />
                                          <label htmlFor={tech} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {tech}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Other Technology Input */}
                                    {selectedCapitalRetrofitTechs.includes("Other") && (
                                      <div className="mt-4">
                                        <Label htmlFor="otherTechnology">Please specify other technology</Label>
                                        <Input
                                          id="otherTechnology"
                                          value={otherTechnologyInput}
                                          onChange={(e) => {
                                            setOtherTechnologyInput(e.target.value);
                                            registerForm.setValue("otherTechnology", e.target.value);
                                          }}
                                          placeholder="Specify your other technology"
                                          className="mt-2"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Step 4: Verification & Compliance */}
                            {currentStep === 4 && (
                              <div className="space-y-6">
                                <h4 className="text-md font-medium text-gray-900">Verification & Compliance</h4>
                                <p className="text-sm text-gray-600">Please confirm that you meet the required obligations for the projects you support</p>
                                
                                {/* Dynamic Obligations based on selected activities */}
                                {(selectedActivities.length > 0 || selectedCapitalRetrofitTechs.length > 0) && (
                                  <div className="space-y-4">
                                    <h5 className="text-sm font-medium text-gray-900">The following additional obligations are required for the projects you will support:</h5>
                                    <div className="space-y-3 text-sm">
                                      {/* Energy Auditing and Assessment obligations */}
                                      {selectedActivities.includes("Energy Auditing and Assessment") && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                          <p className="font-medium text-blue-900">(a) Energy Assessments and Audits</p>
                                          <p className="text-blue-800 mt-1">
                                            Energy assessments and audits must be performed by an Eligible Contractor with: (a) a valid license as a Professional Engineer (P.Eng.) or Registered Architect, and/or a Certified Energy Manager or Certified Engineering Technologist certification; (b) Experience in conducting energy assessments and retrofits; (c) Knowledge of energy benchmarking and energy management systems; (d) Knowledge of applicable codes and standards.
                                          </p>
                                        </div>
                                      )}
                                      
                                      {/* Energy Management Information Systems obligations */}
                                      {selectedActivities.includes("Energy Management Information System") && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                          <p className="font-medium text-green-900">(b) Energy Management Information Systems</p>
                                          <p className="text-green-800 mt-1">
                                            Energy management information systems must be implemented by an Eligible Contractor with: (a) a valid license as a Professional Engineer (P.Eng.), Certified Energy Manager certification, or Certified Engineering Technologist certification; (b) experience with management systems (e.g., ISO 9001, ISO 14001); (c) experience in energy management system projects, energy auditing, and energy efficiency projects.
                                          </p>
                                        </div>
                                      )}
                                      
                                      {/* Capital Retrofits obligations */}
                                      {selectedActivities.includes("Capital Retrofit") && (
                                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                          <p className="font-medium text-purple-900">(c) Capital Retrofits</p>
                                          <p className="text-purple-800 mt-1">
                                            Capital retrofits must be certified by an Eligible Contractor that is a licensed professional engineer (P.Eng.) or a Certified Energy Manager or a Certified Engineering Technologist and use standards such as International Performance Measurement and Verification Protocol (IPMVP) to measure and verify the resulting energy savings.
                                          </p>
                                        </div>
                                      )}
                                      
                                      {/* Solar PV specific obligations */}
                                      {selectedCapitalRetrofitTechs.includes("Solar PV") && (
                                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                          <p className="font-medium text-yellow-900">(d) On-Site Solar PV Projects</p>
                                          <p className="text-yellow-800 mt-1">
                                            On-site solar photovoltaic projects must be completed by an Eligible Contractor that is a member in good standing of Solar Alberta, the Canadian Renewable Energy Association, or the Electrical Contractors Association of Alberta.
                                          </p>
                                        </div>
                                      )}
                                      
                                      {/* Geothermal specific obligations */}
                                      {selectedCapitalRetrofitTechs.includes("Geothermal") && (
                                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                          <p className="font-medium text-orange-900">(e) On-Site Geothermal Ground Source Heat Pump Projects</p>
                                          <p className="text-orange-800 mt-1">
                                            On-site geothermal ground source heat pump project designs must be approved by a P.Eng. having completed the Certified Geo Exchange Designer (CGD) course from the International Ground Source Heat Pump Association or equivalent. Ground Source Heat Pump installers must have completed the Accredited Installer accreditation from the International Ground Source Heat Pump Association.
                                          </p>
                                        </div>
                                      )}
                                      
                                      {/* Other Requirements - always displayed */}
                                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <p className="font-medium text-gray-900">(f) Other Requirements</p>
                                        <p className="text-gray-800 mt-1">
                                          Any other requirements specified in the SEMI Activities Application Guides, as updated from time to time.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="space-y-4">
                                  <FormField
                                    control={registerForm.control}
                                    name="codeOfConductAgreed"
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
                                            I agree to abide by the{" "}
                                            <a 
                                              href="/attached_assets/SEMI_Contractor-Code-of-Conduct.pdf" 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 underline"
                                            >
                                              code of conduct for contractor services
                                            </a>{" "}
                                            *
                                          </FormLabel>
                                        </div>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={registerForm.control}
                                    name="gstWcbInsuranceConfirmed"
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
                                            I confirm that I meet GST, WCB, and insurance requirements for contractor services *
                                          </FormLabel>
                                        </div>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-6">
                          {currentStep > 1 && (
                            <Button type="button" variant="outline" onClick={prevStep}>
                              Previous
                            </Button>
                          )}
                          {/* Company Admin: Next until step 4, then Create Account */}
                          {selectedRole === "company_admin" && (
                            <>
                              {currentStep < 4 ? (
                                <Button type="button" onClick={nextStep} className={`${currentStep === 1 ? "w-full" : "ml-auto"} bg-green-600 hover:bg-green-700`}>
                                  Next
                                </Button>
                              ) : (
                                <Button type="submit" className="ml-auto bg-green-600 hover:bg-green-700" disabled={registerMutation.isPending}>
                                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                                </Button>
                              )}
                            </>
                          )}
                          {/* Team Member: Next on step 1, Submit Registration on step 2 */}
                          {selectedRole === "team_member" && (
                            <>
                              {currentStep === 1 ? (
                                <Button type="button" onClick={nextStep} className="w-full bg-green-600 hover:bg-green-700">
                                  Next
                                </Button>
                              ) : (
                                <Button type="submit" className="ml-auto bg-green-600 hover:bg-green-700" disabled={registerMutation.isPending}>
                                  {registerMutation.isPending ? "Submitting..." : "Submit Registration"}
                                </Button>
                              )}
                            </>
                          )}
                          {/* Contractor: Next until step 4, then Create Account */}
                          {selectedRole === "contractor_individual" && (
                            <>
                              {currentStep < 4 ? (
                                <Button type="button" onClick={nextStep} className={`${currentStep === 1 ? "w-full" : "ml-auto"} bg-green-600 hover:bg-green-700`}>
                                  Next
                                </Button>
                              ) : (
                                <Button type="submit" className="ml-auto bg-green-600 hover:bg-green-700" disabled={registerMutation.isPending}>
                                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      // Simple registration for team members and contractors
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
                            <FormItem className="space-y-3">
                              <FormLabel>What type of account are you creating? *</FormLabel>
                              <FormControl>
                                <div className="space-y-3">
                                  <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                                    <input
                                      type="radio"
                                      id="company_admin_simple"
                                      value="company_admin"
                                      checked={field.value === "company_admin"}
                                      onChange={() => field.onChange("company_admin")}
                                      className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                                    />
                                    <div className="flex-1">
                                      <label htmlFor="company_admin_simple" className="font-medium text-gray-900 cursor-pointer">Company Owner</label>
                                      <p className="text-sm text-gray-500">I'm registering my company for the SEMI program</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                                    <input
                                      type="radio"
                                      id="team_member_simple"
                                      value="team_member"
                                      checked={field.value === "team_member"}
                                      onChange={() => field.onChange("team_member")}
                                      className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                                    />
                                    <div className="flex-1">
                                      <label htmlFor="team_member_simple" className="font-medium text-gray-900 cursor-pointer">Team Member</label>
                                      <p className="text-sm text-gray-500">I work for a company already registered</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                                    <input
                                      type="radio"
                                      id="contractor_individual_simple"
                                      value="contractor_individual"
                                      checked={field.value === "contractor_individual"}
                                      onChange={() => field.onChange("contractor_individual")}
                                      className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                                    />
                                    <div className="flex-1">
                                      <label htmlFor="contractor_individual_simple" className="font-medium text-gray-900 cursor-pointer">Contractor</label>
                                      <p className="text-sm text-gray-500">I provide services to companies in the program</p>
                                    </div>
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password *</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      type={showPassword ? "text" : "password"} 
                                      placeholder="Enter your password" 
                                      {...field} 
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                      onClick={() => setShowPassword(!showPassword)}
                                    >
                                      {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-500" />
                                      ) : (
                                        <Eye className="h-4 w-4 text-gray-500" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                {watchedPassword && (
                                  <div className="mt-2 space-y-1">
                                    <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                          key={i}
                                          className={`h-1 flex-1 rounded ${
                                            i <= passwordStrength.score
                                              ? passwordStrength.score < 3
                                                ? "bg-red-500"
                                                : passwordStrength.score < 5
                                                ? "bg-yellow-500"
                                                : "bg-green-500"
                                              : "bg-gray-300"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    {passwordStrength.feedback.length > 0 && (
                                      <div className="text-xs text-gray-600">
                                        Password needs: {passwordStrength.feedback.join(", ")}
                                      </div>
                                    )}
                                  </div>
                                )}
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
                                  <div className="relative">
                                    <Input 
                                      type={showConfirmPassword ? "text" : "password"} 
                                      placeholder="Confirm your password" 
                                      {...field} 
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                      {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-500" />
                                      ) : (
                                        <Eye className="h-4 w-4 text-gray-500" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                {watchedConfirmPassword && (
                                  <div className="mt-2">
                                    {passwordsMatch ? (
                                      <div className="text-xs text-green-600 flex items-center gap-1">
                                        <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                          <div className="w-1 h-1 bg-white rounded-full"></div>
                                        </div>
                                        Passwords match
                                      </div>
                                    ) : (
                                      <div className="text-xs text-red-600">
                                        Passwords do not match
                                      </div>
                                    )}
                                  </div>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-6">
                          {currentStep > 1 && (
                            <Button type="button" variant="outline" onClick={prevStep}>
                              Previous
                            </Button>
                          )}
                          {((selectedRole === "team_member" && currentStep === 1) || (selectedRole === "company_admin" && currentStep < 4)) ? (
                            <Button type="button" onClick={nextStep} className={currentStep === 1 ? "w-full" : "ml-auto"}>
                              Next
                            </Button>
                          ) : (
                            <Button type="submit" className="ml-auto bg-green-600 hover:bg-green-700" disabled={registerMutation.isPending}>
                              {registerMutation.isPending ? "Creating account..." : 
                               selectedRole === "team_member" ? "Submit Registration" : "Create Account"}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
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

      {/* Email Verification Modal */}
      {showEmailVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Verify Your Email</h3>
            <p className="text-gray-600 mb-4">
              We've sent a verification code to <strong>{pendingEmail}</strong>. 
              Please enter the code below to continue.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    // Use post-registration verification for existing users
                    if (currentStep === 1 && !isLogin) {
                      verifyEmailMutation.mutate({ email: pendingEmail, code: verificationCode });
                    } else {
                      verifyPostRegistrationMutation.mutate({ email: pendingEmail, code: verificationCode });
                    }
                  }}
                  disabled={(verifyEmailMutation.isPending || verifyPostRegistrationMutation.isPending) || !verificationCode}
                  className="flex-1"
                >
                  {(verifyEmailMutation.isPending || verifyPostRegistrationMutation.isPending) ? "Verifying..." : "Verify"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => sendVerificationMutation.mutate(pendingEmail)}
                  disabled={sendVerificationMutation.isPending}
                >
                  {sendVerificationMutation.isPending ? "Sending..." : "Resend"}
                </Button>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowEmailVerification(false);
                  setVerificationCode("");
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Team Member Success Modal */}
      {showTeamMemberSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Registration Submitted Successfully!
              </h3>
              <div className="text-sm text-gray-600 mb-6 space-y-3">
                <p>
                  Your request to join <strong>{submittedCompanyName}</strong> has been submitted.
                </p>
                <p>
                  You will receive an email notification once the company owner has approved your request to join the company.
                </p>
                <p>
                  Once approved, you'll be able to log in and access the portal with the permissions assigned to you by the company administrator.
                </p>
              </div>
              <Button 
                onClick={() => {
                  setShowTeamMemberSuccess(false);
                  setSubmittedCompanyName("");
                  setIsLogin(true); // Switch to login form
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Continue to Login
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
            <p className="text-gray-600 mb-4">
              Enter your email address and we'll send you a temporary password to log in with.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="forgotPasswordEmail">Email Address</Label>
                <Input
                  id="forgotPasswordEmail"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="Enter your email address"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => forgotPasswordMutation.mutate(forgotPasswordEmail)}
                  disabled={forgotPasswordMutation.isPending || !forgotPasswordEmail}
                  className="flex-1"
                >
                  {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Email"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal for temporary passwords */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <p className="text-gray-600 mb-4">
              You're using a temporary password. Please set a new password to continue.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {/* Password Requirements */}
                {newPassword && (
                  <div className="mt-2 text-xs space-y-1">
                    {Object.entries(getPasswordValidation(newPassword)).map(([key, isValid]) => (
                      <div key={key} className={`flex items-center gap-1 ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {isValid ? '✓' : '✗'}
                        <span>
                          {key === 'minLength' && '8+ characters'}
                          {key === 'maxLength' && 'Under 64 characters'}
                          {key === 'hasLowercase' && 'Lowercase letter'}
                          {key === 'hasUppercase' && 'Uppercase letter'}
                          {key === 'hasDigit' && 'Number'}
                          {key === 'hasSymbol' && 'Special character'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmNewPassword"
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {confirmNewPassword && newPassword !== confirmNewPassword && (
                  <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => changePasswordMutation.mutate({ newPassword })}
                  disabled={
                    changePasswordMutation.isPending || 
                    !isPasswordValid(newPassword) ||
                    newPassword !== confirmNewPassword
                  }
                  className="flex-1"
                >
                  {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}