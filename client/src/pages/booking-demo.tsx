import { useState, useEffect } from "react";
import { BookingDateTimeStep } from "@/components/booking/BookingDateTimeStep";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePageTitle } from "@/context/page-context";

export default function BookingDemo() {
  const { setPageInfo } = usePageTitle();
  const [currentStep, setCurrentStep] = useState(4); // Start at step 4 for demo
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    setPageInfo("Booking Demo", "Demonstration of booking functionality");
  }, [setPageInfo]);

  const handleDateTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      setCurrentStep(5);
      console.log("Moving to step 5 with:", { selectedDate, selectedTime });
    }
  };

  const handleBack = () => {
    setCurrentStep(3);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                TP
              </div>
              <div>
                <h1 className="text-xl font-semibold">TiNHiH Portal</h1>
                <p className="text-sm text-muted-foreground">Booking Demo</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {[
              { id: 1, title: "Staff", description: "Select staff member" },
              { id: 2, title: "Service", description: "Choose service" },
              { id: 3, title: "Location", description: "Select location" },
              { id: 4, title: "Date & Time", description: "Schedule appointment" },
              { id: 5, title: "Contact", description: "Your details" }
            ].map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep > step.id ? 'bg-green-500 text-white' :
                    currentStep === step.id ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {currentStep > step.id ? '✓' : step.id}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                {index < 4 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {currentStep === 4 && (
            <BookingDateTimeStep
              onSelect={handleDateTimeSelect}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
            />
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Contact Information</h2>
                <p className="text-muted-foreground">Please provide your details to complete the booking</p>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Selected Appointment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDate && selectedTime && (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Date:</span> {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Time:</span> {format(new Date().setHours(
                          parseInt(selectedTime.split(':')[0]), 
                          parseInt(selectedTime.split(':')[1])
                        ), 'h:mm a')}
                      </p>
                      <Badge variant="secondary">Confirmed</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="text-center">
                <p className="text-muted-foreground">
                  This is where the contact form would be displayed in a real booking flow.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Step {currentStep} of 5
              </p>
            </div>

            {currentStep === 4 && (
              <Button
                onClick={handleContinue}
                disabled={!selectedDate || !selectedTime}
                className="flex items-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
