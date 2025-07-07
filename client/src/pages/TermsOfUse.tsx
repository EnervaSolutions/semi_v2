import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import strategicEnergyLogo from "@/assets/strategic-energy.svg";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={strategicEnergyLogo} alt="SEMI Program" className="h-10" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">SEMI Program Portal</h1>
                <p className="text-sm text-gray-600">Terms of Use</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Use</CardTitle>
            <p className="text-gray-600">Last updated: December 2024</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-6">
            
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using the Strategic Energy Management for Industry (SEMI) program portal 
                ("Portal"), provided by Enerva Energy Solutions Inc. ("Enerva") on behalf of Emissions 
                Reduction Alberta ("ERA"), you agree to be bound by these Terms of Use and all applicable 
                laws and regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Program Description</h2>
              <p className="text-gray-700 leading-relaxed">
                The SEMI program is a $50 million initiative funded by the Government of Alberta and 
                Natural Resources Canada, designed to help Alberta's industrial and manufacturing 
                facilities improve energy efficiency and reduce greenhouse gas emissions. The program 
                ends on March 31, 2027.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Eligibility and Registration</h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  To use this Portal and participate in the SEMI program, you must:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Operate an eligible industrial or manufacturing facility located in Alberta</li>
                  <li>Meet the NAICS code requirements (11, 21, 22, 23, 31-33, 48, 56)</li>
                  <li>Have been in operation for at least one year with fixed equipment</li>
                  <li>Provide accurate and complete information during registration</li>
                  <li>Comply with all program terms and conditions</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. User Responsibilities</h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">As a user of the Portal, you agree to:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Provide accurate, current, and complete information</li>
                  <li>Use the Portal only for legitimate program-related purposes</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Not attempt to circumvent Portal security measures</li>
                  <li>Report any unauthorized use of your account immediately</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                All content on the Portal, including but not limited to text, graphics, logos, images, 
                and software, is the property of Enerva Energy Solutions Inc., ERA, or their licensors 
                and is protected by intellectual property laws. You may not reproduce, distribute, or 
                create derivative works without express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Privacy and Data Protection</h2>
              <p className="text-gray-700 leading-relaxed">
                Your privacy is important to us. The collection, use, and disclosure of personal 
                information through the Portal is governed by Enerva's Privacy Policy, available at{" "}
                <a href="https://enerva.ca/privacy-policy" target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:text-blue-800 underline">
                  enerva.ca/privacy-policy
                </a>. 
                By using the Portal, you consent to the practices described in our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Program Funding and Limitations</h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  The SEMI program provides funding subject to availability and program terms:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Up to 50% co-funding for for-profit organizations</li>
                  <li>Up to 100% funding for not-for-profit and Indigenous organizations</li>
                  <li>Maximum $1,000,000 per facility for Capital Retrofits</li>
                  <li>Funding is subject to program budget availability</li>
                  <li>All funding decisions are final and at the discretion of ERA</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                Enerva and ERA shall not be liable for any direct, indirect, incidental, special, 
                or consequential damages resulting from your use of the Portal or participation in 
                the SEMI program. This includes, but is not limited to, damages for loss of profits, 
                data, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Termination</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to terminate or suspend your access to the Portal at any time, 
                without notice, for conduct that we believe violates these Terms of Use or is harmful 
                to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We may modify these Terms of Use at any time. Changes will be posted on this page 
                with an updated revision date. Your continued use of the Portal after such changes 
                constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms of Use are governed by the laws of the Province of Alberta and the 
                federal laws of Canada applicable therein. Any disputes shall be subject to the 
                exclusive jurisdiction of the courts of Alberta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Information</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 leading-relaxed mb-3">
                  For questions about these Terms of Use or the SEMI program:
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>SEMI Program Support:</strong></p>
                  <p>Email: semi@eralberta.ca</p>
                  <p>Phone: 1-844-407-0025</p>
                  <p>Hours: Monday - Friday, 8:30 AM - 4:00 PM</p>
                  
                  <p className="mt-4"><strong>Enerva Energy Solutions Inc.:</strong></p>
                  <p>Email: contact@enerva.ca</p>
                  <p>Phone: 416-803-0262</p>
                  <p>Address: 1030 King Street West, Toronto, ON, M6K 0B4</p>
                </div>
              </div>
            </section>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}