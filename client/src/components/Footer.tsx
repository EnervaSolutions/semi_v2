import albertaLogo from "@/assets/alberta.6254774fcb7821c7109b676c5cb2f586.svg";
import nrcanLogo from "@/assets/natural-resources-canada.2a38dbfe506bf065710a6f6402a77f4c.svg";
import eraLogo from "@/assets/era-logo.svg";
import enervaLogo from "@/assets/enerva-logo.svg";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Partner Logos */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
          {/* Government of Alberta Logo */}
          <div className="h-8 flex items-center">
            <img 
              src={albertaLogo} 
              alt="Government of Alberta" 
              className="h-full w-auto object-contain"
            />
          </div>
          
          {/* NRCan Logo */}
          <div className="h-6 flex items-center">
            <img 
              src={nrcanLogo} 
              alt="Natural Resources Canada" 
              className="h-full w-auto object-contain"
            />
          </div>
          
          {/* ERA Logo */}
          <div className="h-8 flex items-center">
            <img 
              src={eraLogo} 
              alt="Emissions Reduction Alberta" 
              className="h-full w-auto object-contain"
            />
          </div>
          
          {/* Enerva Logo */}
          <div className="h-8 flex items-center">
            <img 
              src={enervaLogo} 
              alt="Enerva Energy Solutions" 
              className="h-full w-auto object-contain"
            />
          </div>
        </div>
        
        {/* Footer Text */}
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600 whitespace-nowrap">
            The SEMI Program is funded by the Government of Alberta and NRCan. The SEMI Program is delivered by ERA's service provider, Enerva Energy Solutions Inc.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-gray-500">
            <span>Copyright © 2025 Enerva Energy Solutions Inc. All Rights Reserved</span>
            <span className="hidden sm:inline">|</span>
            <a 
              href="https://enerva.ca/privacy-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}