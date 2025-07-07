import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const onboardingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  userType: z.enum(["company_owner", "contractor", "employee"]),
  companyName: z.string().optional(),
  companyShortName: z.string().optional(),
  role: z.string().optional(),
}).refine((data) => {
  if (data.userType === "company_owner") {
    return data.companyName && data.companyShortName;
  }
  return true;
}, {
  message: "Company name and short name are required for company owners",
  path: ["companyName"]
});

type OnboardingData = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      userType: "company_owner",
      companyName: "",
      companyShortName: "",
      role: "team_member"
    }
  });

  const userType = form.watch("userType");

  const onboardMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      const response = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome!",
        description: "Your account has been set up successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete onboarding",
      });
    },
  });

  const onSubmit = (data: OnboardingData) => {
    onboardMutation.mutate(data);
  };

  const nextStep = () => {
    const currentStepData = getCurrentStepData();
    const stepSchema = z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      userType: z.enum(["company_owner", "contractor", "employee"])
    });
    
    const result = stepSchema.safeParse(currentStepData);
    
    if (result.success) {
      setStep(2);
    } else {
      // Show validation errors for current step
      const errors = result.error.errors;
      errors.forEach((error: any) => {
        form.setError(error.path[0] as keyof OnboardingData, {
          message: error.message
        });
      });
    }
  };

  const getCurrentStepData = () => {
    const values = form.getValues();
    if (step === 1) {
      return {
        firstName: values.firstName,
        lastName: values.lastName,
        userType: values.userType
      };
    }
    return values;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome to SEMI</CardTitle>
          <CardDescription>
            Let's set up your account
          </CardDescription>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {step === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="userType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>I am a...</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="space-y-3"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="company_owner" id="company_owner" />
                              <Label htmlFor="company_owner" className="cursor-pointer">
                                Company Owner (creating a new company account)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="employee" id="employee" />
                              <Label htmlFor="employee" className="cursor-pointer">
                                Employee (joining an existing company)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="contractor" id="contractor" />
                              <Label htmlFor="contractor" className="cursor-pointer">
                                Contractor (working with companies)
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="button" onClick={nextStep} className="w-full">
                    Next
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  {userType === "company_owner" && (
                    <>
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your company name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="companyShortName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Short Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., ACME" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e.target.value.toUpperCase());
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {userType === "employee" && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Your company administrator will need to add you to their team. 
                        Please contact your company administrator with your email address.
                      </p>
                    </div>
                  )}

                  {userType === "contractor" && (
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contractor Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select contractor type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="contractor_individual">Individual Contractor</SelectItem>
                              <SelectItem value="contractor_account_owner">Contractor Company Owner</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={onboardMutation.isPending}
                      className="flex-1"
                    >
                      {onboardMutation.isPending ? "Setting up..." : "Complete Setup"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}