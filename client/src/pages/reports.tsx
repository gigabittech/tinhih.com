import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, TrendingUp, Users, Calendar } from "lucide-react";
import { usePageTitle } from "@/context/page-context";

export default function Reports() {
  const { setPageInfo } = usePageTitle();

  useEffect(() => {
    setPageInfo("Reports & Analytics", "View practice performance and insights");
  }, [setPageInfo]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" />
                Patient Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Comprehensive patient analytics and demographics</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-secondary" />
                Appointment Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Appointment trends and scheduling insights</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Revenue Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Financial performance and billing analytics</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Reports Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart className="w-16 h-16 text-muted-foreground mx-auto mb-4 dark:text-[#ffdd00]" />
              <h3 className="text-lg font-medium text-foreground mb-2">Advanced Reports & Analytics</h3>
              <p className="text-muted-foreground">
                Detailed reporting features will be available in the next update.
                Track patient outcomes, practice efficiency, and financial performance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
