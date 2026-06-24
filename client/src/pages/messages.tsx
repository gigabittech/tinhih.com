import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComprehensiveMessageList } from "@/components/messaging/comprehensive-message-list";
import { usePageTitle } from "@/context/page-context";

export default function Messages() {
  const { setPageInfo } = usePageTitle();

  useEffect(() => {
    setPageInfo("Messages", "Real-time secure communication with patients and staff");
  }, [setPageInfo]);

  

  return (
    <div className="h-full">
      <ComprehensiveMessageList />
    </div>
  );
}
