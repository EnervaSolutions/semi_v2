import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Award, Building2, Calendar, Trophy, Settings } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface BadgeData {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  imageFile?: string;
  awardedAt: string;
  awardNote?: string;
  displayOrder: number;
}

interface ContentData {
  id: number;
  contentType: 'header' | 'description' | 'photo';
  title?: string;
  content?: string;
  imageUrl?: string;
  imageFile?: string;
  imageSize?: 'small' | 'medium' | 'large';
  displayOrder: number;
}

interface RecognitionPageSettings {
  isEnabled: boolean;
  pageTitle?: string;
  welcomeMessage?: string;
  badgesSectionTitle?: string;
  contentSectionTitle?: string;
}

interface RecognitionData {
  settings: RecognitionPageSettings;
  badges: BadgeData[];
  content: ContentData[];
  companyName: string;
}

export default function RecognitionPage() {
  const { user } = useAuth();
  const { data: recognitionData, isLoading, error } = useQuery({
    queryKey: ["/api/recognition"],
    enabled: true,
  });

  // If system admin, show special message to redirect to admin panel
  if (user?.role === 'system_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Settings className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Recognition Management
            </h3>
            <p className="text-gray-600 mb-4">
              As a system administrator, you can manage the Recognition system through the Admin Panel.
            </p>
            <Button onClick={() => window.location.href = '/admin'} className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Go to Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recognition page...</p>
        </div>
      </div>
    );
  }

  if (error || !recognitionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Recognition Not Available
            </h3>
            <p className="text-gray-600">
              The recognition page is not currently available for your company.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { settings, badges, content, companyName } = recognitionData as RecognitionData;

  const getImageUrl = (imageFile?: string, imageUrl?: string) => {
    if (imageFile) {
      return `/uploads/${imageFile}`;
    }
    return imageUrl || '';
  };

  const sortedBadges = [...badges].sort((a, b) => a.displayOrder - b.displayOrder);
  const sortedContent = [...content].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Trophy className="mx-auto h-16 w-16 mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">
              {settings.pageTitle || "Company Recognition"}
            </h1>
            <h2 className="text-xl font-medium mb-6 opacity-90">
              {companyName}
            </h2>
            {settings.welcomeMessage && (
              <p className="text-lg max-w-3xl mx-auto opacity-90">
                {settings.welcomeMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Badges Section */}
        {sortedBadges.length > 0 && (
          <section className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {settings.badgesSectionTitle || "Awards & Recognition"}
              </h2>
              <div className="w-24 h-1 bg-blue-600 mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedBadges.map((badge) => (
                <Card key={badge.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      {getImageUrl(badge.imageFile, badge.imageUrl) ? (
                        <img
                          src={getImageUrl(badge.imageFile, badge.imageUrl)}
                          alt={badge.name}
                          className="w-20 h-20 mx-auto rounded-full object-cover"
                        />
                      ) : (
                        <Award className="w-20 h-20 mx-auto text-yellow-500" />
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {badge.name}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {badge.description}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Awarded {format(new Date(badge.awardedAt), "MMMM d, yyyy")}
                      </span>
                    </div>
                    {badge.awardNote && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800 italic">
                          "{badge.awardNote}"
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Content Section */}
        {sortedContent.length > 0 && (
          <section>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {settings.contentSectionTitle || "Our Story"}
              </h2>
              <div className="w-24 h-1 bg-blue-600 mx-auto"></div>
            </div>

            <div className="space-y-8">
              {sortedContent.map((item) => (
                <div key={item.id}>
                  {item.contentType === 'header' && (
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {item.title}
                      </h3>
                      {item.content && (
                        <p className="mt-3 text-lg text-gray-600 max-w-4xl mx-auto">
                          {item.content}
                        </p>
                      )}
                    </div>
                  )}

                  {item.contentType === 'description' && (
                    <Card className="mb-6">
                      <CardContent className="p-8">
                        {item.title && (
                          <h4 className="text-xl font-semibold text-gray-900 mb-4">
                            {item.title}
                          </h4>
                        )}
                        {item.content && (
                          <div className="prose prose-lg max-w-none text-gray-600">
                            {item.content.split('\n').map((paragraph, index) => (
                              <p key={index} className="mb-4 last:mb-0">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {item.contentType === 'photo' && getImageUrl(item.imageFile, item.imageUrl) && (
                    <div className="mb-6">
                      <div
                        className={`mx-auto rounded-lg overflow-hidden shadow-lg ${
                          item.imageSize === 'small'
                            ? 'max-w-md'
                            : item.imageSize === 'large'
                            ? 'max-w-6xl'
                            : 'max-w-3xl'
                        }`}
                      >
                        <img
                          src={getImageUrl(item.imageFile, item.imageUrl)}
                          alt={item.title || 'Recognition content'}
                          className="w-full h-auto"
                        />
                      </div>
                      {item.title && (
                        <p className="text-center mt-3 text-gray-600 font-medium">
                          {item.title}
                        </p>
                      )}
                      {item.content && (
                        <p className="text-center mt-2 text-gray-500 text-sm">
                          {item.content}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {sortedBadges.length === 0 && sortedContent.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Recognition Content Coming Soon
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Your recognition page is being prepared. Check back soon to see your company's achievements and milestones.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}