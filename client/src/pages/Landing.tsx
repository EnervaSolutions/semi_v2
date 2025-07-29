import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  Building2, 
  Users, 
  FileText, 
  Award, 
  Calculator,
  ArrowRight,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Shield,
  Clock,
  MapPin,
  Factory,
  Settings,
  BarChart3,
  Lightbulb,
  Target,
  Phone,
  Mail,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import strategicEnergyLogo from "@/assets/strategic-energy.svg";
import albertaLogo from "@assets/alberta.svg";
import enervaLogo from "@assets/enerva.7c9efe720f1a79c59350736f8a8e4fca.png";
import naturalResourcesLogo from "@assets/natural-resources-canada.svg";

export default function Landing() {
  const semiActivities = [
    {
      name: "Facility Readiness Assessment (FRA)",
      description: "Required first step to assess your facility's energy use, establish benchmarks, and create a roadmap for participation in other SEMI activities.",
      icon: FileText,
      required: true,
      details: "Comprehensive energy assessment including time series analysis, energy modeling, and benchmarking against industry standards."
    },
    {
      name: "Energy Assessments and Audits (EAA)",
      description: "Detailed energy audits providing recommendations for energy efficiency improvements.",
      maxIncentive: "Up to $50,000",
      icon: Calculator,
      details: "Professional engineering assessment to identify energy-saving opportunities and implementation strategies."
    },
    {
      name: "Strategic Energy Management (SEM)",
      description: "Comprehensive training program to build internal energy management capacity and expertise.",
      maxIncentive: "Up to $100,000",
      icon: Users,
      details: "Leadership training, energy champion development, and systematic approach to continuous energy improvement."
    },
    {
      name: "Energy Management Information Systems (EMIS)",
      description: "Implementation of advanced energy monitoring and management systems.",
      maxIncentive: "Up to $50,000 - $250,000",
      icon: BarChart3,
      details: "Real-time energy monitoring, data analytics, and automated reporting systems for informed decision-making."
    },
    {
      name: "Capital Retrofits (CR)",
      description: "Investment in energy-efficient equipment and technologies to reduce energy consumption.",
      maxIncentive: "Up to $1,000,000",
      icon: Settings,
      details: "Equipment upgrades, process improvements, and technology implementations for maximum energy savings."
    }
  ];

  const eligibleSectors = [
    { code: "11", name: "Agriculture, Forestry, Fishing & Hunting" },
    { code: "21", name: "Mining, Quarrying & Oil/Gas Extraction" },
    { code: "22", name: "Utilities" },
    { code: "23", name: "Construction" },
    { code: "31-33", name: "Manufacturing" },
    { code: "48", name: "Transportation" },
    { code: "56", name: "Administrative & Support Services" }
  ];

  const keyBenefits = [
    {
      icon: DollarSign,
      title: "Reduce Energy Costs",
      description: "Cut operational expenses through strategic energy management and efficiency improvements"
    },
    {
      icon: TrendingUp,
      title: "Increase Profitability",
      description: "Boost your bottom line with up to 50% funding for energy-saving projects"
    },
    {
      icon: Lightbulb,
      title: "Build Expertise",
      description: "Gain knowledge, training, and capacity building in energy management best practices"
    },
    {
      icon: Target,
      title: "Data-Driven Decisions",
      description: "Make informed choices with comprehensive energy assessments and performance tracking"
    },
    {
      icon: Shield,
      title: "Demonstrate Sustainability",
      description: "Show commitment to environmental responsibility and reduce greenhouse gas emissions"
    },
    {
      icon: Award,
      title: "Industry Leadership",
      description: "Join a community of energy management leaders across Alberta's industrial sectors"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src={strategicEnergyLogo} alt="SEMI Program" className="h-16" />
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth">
                <Button variant="outline" className="hidden sm:inline-flex">
                  Login
                </Button>
              </Link>
              <Link href="/auth?mode=signup">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Register Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-6">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  $50 Million Program • Ends March 2027
                </Badge>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Elevate Energy Performance for Alberta Industry
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Join the Strategic Energy Management for Industry (SEMI) program to strengthen expertise, 
                reduce energy costs, and secure ongoing savings for your industrial facility.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/auth?mode=signup">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                    Start Your Application
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="https://www.eralberta.ca/semi/" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Learn More at ERA
                  </Button>
                </a>
              </div>
              <div className="grid grid-cols-2 gap-6 text-center max-w-md">
                <div>
                  <div className="text-3xl font-bold text-blue-600">Up to 50%</div>
                  <div className="text-sm text-gray-600">Project Funding</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">$1M</div>
                  <div className="text-sm text-gray-600">Max Per Facility</div>
                </div>
              </div>
            </div>
            <div className="lg:pl-12">
              <Card className="shadow-xl">
                <CardHeader className="bg-blue-600 text-white">
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Alberta Industrial Facilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Program Funding Available</span>
                      <span className="font-semibold text-green-600">$50 Million</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Program End Date</span>
                      <span className="font-semibold">March 31, 2027</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Eligible NAICS Sectors</span>
                      <span className="font-semibold">7 Industries</span>
                    </div>
                    <Separator />
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-3">Funded by:</p>
                      <div className="flex justify-center items-center space-x-4">
                        <img src={albertaLogo} alt="Government of Alberta" className="h-8" />
                        <img src={naturalResourcesLogo} alt="Natural Resources Canada" className="h-6" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Participate in SEMI?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              The SEMI program delivers measurable benefits to Alberta's industrial and manufacturing facilities 
              through comprehensive energy management support.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {keyBenefits.map((benefit, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 p-3 rounded-lg mr-4">
                      <benefit.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{benefit.title}</h3>
                  </div>
                  <p className="text-gray-600">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SEMI Activities */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Five SEMI Activities
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              All participants start with a Facility Readiness Assessment (FRA), then choose from four additional 
              activities based on your facility's energy management goals.
            </p>
          </div>
          <div className="space-y-6">
            {semiActivities.map((activity, index) => (
              <Card key={index} className={`${activity.required ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'} hover:shadow-lg transition-shadow`}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`${activity.required ? 'bg-blue-600' : 'bg-gray-100'} p-3 rounded-lg flex-shrink-0`}>
                      <activity.icon className={`h-6 w-6 ${activity.required ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{activity.name}</h3>
                        <div className="flex items-center space-x-2">
                          {activity.required && (
                            <Badge className="bg-blue-600 text-white">Required First</Badge>
                          )}
                          {activity.maxIncentive && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              {activity.maxIncentive}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-3">{activity.description}</p>
                      <p className="text-sm text-gray-500">{activity.details}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Eligibility Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Is Your Facility Eligible?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Location</h4>
                    <p className="text-gray-600">Your facility must be located in Alberta, Canada</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Ownership</h4>
                    <p className="text-gray-600">Facility must be owned or leased (with landlord permission)</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Operations</h4>
                    <p className="text-gray-600">In operation for at least one year with fixed equipment and buildings</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Industry Classification</h4>
                    <p className="text-gray-600">Must operate under eligible NAICS codes (see list)</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Eligible NAICS Industry Sectors
              </h3>
              <div className="space-y-3">
                {eligibleSectors.map((sector, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Badge variant="outline" className="font-mono">{sector.code}</Badge>
                    <span className="text-gray-700">{sector.name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Facilities involved in energy-intensive processes that physically or 
                  chemically transform materials into new products may also be eligible.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How SEMI Works
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              A straightforward process designed to maximize your facility's energy performance and return on investment.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Register & Apply</h3>
                <p className="text-gray-600">
                  Create your account on the SEMI portal and submit your facility application for the 
                  required Facility Readiness Assessment.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Complete FRA</h3>
                <p className="text-gray-600">
                  Work with Enerva's energy experts to complete your comprehensive Facility Readiness Assessment 
                  and receive your customized roadmap.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Activities</h3>
                <p className="text-gray-600">
                  Select from EAA, SEM, EMIS, or Capital Retrofits based on your FRA recommendations 
                  and facility priorities.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started with SEMI?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Join Alberta's leading industrial facilities in reducing energy costs, improving efficiency, 
            and demonstrating environmental leadership.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth?mode=signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                Register Your Facility
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="tel:1-844-407-0025">
              <Button variant="outline" size="lg" className="border-gray-400 text-gray-700 hover:bg-gray-200 w-full sm:w-auto">
                <Phone className="mr-2 h-5 w-5" />
                Call 1-844-407-0025
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Program Information */}
            <div className="lg:col-span-2">
              <div className="flex items-center mb-4">
                <img src={strategicEnergyLogo} alt="SEMI Program" className="h-10 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">SEMI Program</h3>
                  <p className="text-sm text-gray-600">Powered by Enerva Energy Solutions</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Strategic Energy Management for Industry - helping Alberta's industrial facilities 
                reduce energy costs and improve efficiency with up to $1M in funding per facility.
              </p>
              
              {/* Funding Partners */}
              <div>
                <p className="text-sm font-medium text-gray-900 mb-3">Funded by:</p>
                <div className="flex items-center space-x-6">
                  <img src={albertaLogo} alt="Government of Alberta" className="h-8" />
                  <img src={naturalResourcesLogo} alt="Natural Resources Canada" className="h-6" />
                  <img src={enervaLogo} alt="Enerva Energy Solutions" className="h-8" />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Contact Support</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Phone</p>
                  <p className="text-sm text-gray-600">1-844-407-0025</p>
                  <p className="text-xs text-gray-500">Mon-Fri, 8:30 AM - 4:00 PM</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">semi@eralberta.ca</p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/auth" className="text-sm text-blue-600 hover:text-blue-800">
                    Register/Login
                  </Link>
                </li>
                <li>
                  <a href="https://www.eralberta.ca/semi/" target="_blank" rel="noopener noreferrer" 
                     className="text-sm text-gray-600 hover:text-gray-900">
                    ERA SEMI Page
                  </a>
                </li>
                <li>
                  <a href="https://www.eralberta.ca/semi/frequently-asked-questions/" target="_blank" rel="noopener noreferrer" 
                     className="text-sm text-gray-600 hover:text-gray-900">
                    Program FAQ
                  </a>
                </li>
                <li>
                  <a href="https://www.eralberta.ca/wp-content/uploads/2024/10/FRA-Terms-and-Conditions.pdf" target="_blank" rel="noopener noreferrer" 
                     className="text-sm text-gray-600 hover:text-gray-900">
                    FRA Terms & Conditions
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-200 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-center md:text-left">
                <p className="text-xs text-gray-500">
                  © 2024 Emissions Reduction Alberta • SEMI Program ends March 31, 2027
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  $50 million in funding provided by Government of Alberta and Natural Resources Canada
                </p>
              </div>
              <div className="flex space-x-4 text-xs text-gray-500">
                <a href="https://enerva.ca/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">Privacy Policy</a>
                <Link href="/terms-of-use" className="hover:text-gray-700">Terms of Use</Link>
                <Link href="/accessibility" className="hover:text-gray-700">Accessibility</Link>
              </div>
            </div>
            
            <div className="text-center mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 leading-relaxed">
                We acknowledge that we operate on the traditional territories of Treaty 6, Treaty 7, and Treaty 8 Nations; 
                Métis Nations (Region 3 and 4); Inuit; and all others who care for these lands.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}