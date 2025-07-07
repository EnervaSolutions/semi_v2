import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Mail, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import strategicEnergyLogo from "@/assets/strategic-energy.svg";

export default function Accessibility() {
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
                <p className="text-sm text-gray-600">Accessibility Statement</p>
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
            <CardTitle className="text-2xl">Accessibility Statement</CardTitle>
            <p className="text-gray-600">Our commitment to digital accessibility</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-6">
            
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Our Commitment</h2>
              <p className="text-gray-700 leading-relaxed">
                Enerva Energy Solutions Inc. is committed to ensuring digital accessibility for all users 
                of the Strategic Energy Management for Industry (SEMI) program portal. We strive to make 
                our website accessible to people with disabilities and continuously work to improve the 
                user experience for everyone.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Accessibility Standards</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. 
                These guidelines help make web content more accessible to people with disabilities, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Visual impairments (blindness, low vision, color blindness)</li>
                <li>Hearing impairments (deafness, hearing loss)</li>
                <li>Motor impairments (limited fine motor control, paralysis)</li>
                <li>Cognitive impairments (learning disabilities, memory issues)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Accessibility Features</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our portal includes the following accessibility features:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Semantic HTML markup for screen readers</li>
                <li>Alternative text for images and graphics</li>
                <li>Keyboard navigation support</li>
                <li>High contrast color schemes</li>
                <li>Resizable text and scalable interface elements</li>
                <li>Clear page structure and navigation</li>
                <li>Descriptive headings and labels</li>
                <li>Focus indicators for interactive elements</li>
                <li>Error identification and suggestions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Assistive Technology Compatibility</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our portal is designed to be compatible with assistive technologies, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Screen readers (JAWS, NVDA, VoiceOver)</li>
                <li>Voice recognition software</li>
                <li>Screen magnification software</li>
                <li>Alternative keyboards and pointing devices</li>
                <li>Browser accessibility features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Browser Support</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For the best accessibility experience, we recommend using:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Chrome (latest version)</li>
                <li>Firefox (latest version)</li>
                <li>Safari (latest version)</li>
                <li>Microsoft Edge (latest version)</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                Ensure your browser is updated to the latest version for optimal performance and security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Known Limitations</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                While we strive for full accessibility, we acknowledge some current limitations:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Some PDF documents may not be fully accessible - we provide alternative formats upon request</li>
                <li>Third-party embedded content may have varying accessibility levels</li>
                <li>Complex data visualizations may require alternative descriptions</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                We are actively working to address these limitations in future updates.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Alternative Access Methods</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you encounter accessibility barriers or need assistance accessing information:
              </p>
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Phone Support</p>
                    <p className="text-sm text-gray-600">1-844-407-0025 (Monday - Friday, 8:30 AM - 4:00 PM)</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-gray-600">semi@eralberta.ca</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed mt-4">
                Our support team can provide information in alternative formats, assist with navigation, 
                or help complete applications over the phone.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Feedback and Improvement</h2>
              <p className="text-gray-700 leading-relaxed">
                We welcome your feedback on the accessibility of our portal. If you encounter any 
                accessibility barriers, have suggestions for improvement, or need assistance, please 
                contact us. Your input helps us improve the experience for all users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Ongoing Efforts</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our commitment to accessibility includes:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Regular accessibility testing and audits</li>
                <li>Staff training on accessibility best practices</li>
                <li>Incorporating accessibility into our development process</li>
                <li>Staying current with accessibility standards and guidelines</li>
                <li>Seeking user feedback and implementing improvements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Additional Resources</h2>
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  For more information about web accessibility:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>
                    <a href="https://www.w3.org/WAI/" target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:text-blue-800 underline flex items-center">
                      Web Accessibility Initiative (WAI)
                      <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/accessibility-public-service.html" 
                       target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:text-blue-800 underline flex items-center">
                      Government of Canada Accessibility Standards
                      <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Information</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 leading-relaxed mb-3">
                  For accessibility-related questions or support:
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>SEMI Program Accessibility Support:</strong></p>
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

            <section className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-500">
                This accessibility statement was last updated in December 2024 and is reviewed regularly 
                to ensure it remains current and accurate.
              </p>
            </section>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}